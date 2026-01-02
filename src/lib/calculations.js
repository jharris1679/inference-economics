/**
 * Pure calculation functions for inference cost comparisons.
 * No React, no side effects — just math.
 */

/**
 * Developer/Model data helpers
 */

export function getDeveloperList(modelsData) {
  return Object.entries(modelsData.developers).map(([id, dev]) => ({
    id,
    name: dev.name,
    modelCount: Object.keys(dev.models).length,
  }));
}

export function getModelsByDeveloper(modelsData, developerId) {
  const developer = modelsData.developers[developerId];
  if (!developer) return [];
  return Object.entries(developer.models).map(([id, model]) => ({
    id,
    ...model,
  }));
}

export function getModel(modelsData, developerId, modelId) {
  return modelsData.developers[developerId]?.models[modelId] || null;
}

export function flattenAllModels(modelsData) {
  const result = [];
  for (const [devId, dev] of Object.entries(modelsData.developers)) {
    for (const [modelId, model] of Object.entries(dev.models)) {
      result.push({
        developerId: devId,
        developerName: dev.name,
        modelId,
        ...model,
      });
    }
  }
  return result;
}

/**
 * Core calculation functions
 */

export function calculateTokensPerDay(tokPerSec, hours) {
  return tokPerSec * 3600 * hours;
}

export function calculateCloudHoursNeeded(tokensPerDay, cloudTokPerSec) {
  if (cloudTokPerSec <= 0) return Infinity;
  return tokensPerDay / (cloudTokPerSec * 3600);
}

export function calculateDailyCost(hoursNeeded, ratePerHour) {
  return hoursNeeded * ratePerHour;
}

export function calculatePayoffDays(hardwarePrice, dailyCost) {
  if (dailyCost <= 0) return Infinity;
  return hardwarePrice / dailyCost;
}

export function calculateBlendedRate(inputPer1M, outputPer1M) {
  return (inputPer1M + outputPer1M) / 2;
}

export function calculateApiDailyCost(tokensPerDay, blendedRatePer1M) {
  const tokensInMillions = tokensPerDay / 1_000_000;
  return tokensInMillions * blendedRatePer1M;
}

export function canModelRun(memoryGB, minRAM) {
  return memoryGB >= minRAM;
}

/**
 * Format helpers
 */

export function formatPayoff(months) {
  if (!isFinite(months) || isNaN(months)) return 'N/A';
  if (months >= 12) return `${(months / 12).toFixed(1)}y`;
  if (months >= 1) return `${months.toFixed(1)}mo`;
  return `${Math.ceil(months * 30)}d`;
}

export function formatTokens(num) {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

export function formatHours(hours) {
  if (!isFinite(hours)) return '—';
  if (hours < 1) return `${(hours * 60).toFixed(0)}m`;
  return `${hours.toFixed(1)}h`;
}

/**
 * Map model params string to proprietary tier.
 */
export function getProprietaryTier(paramsString) {
  if (!paramsString) return 'medium';
  const num = parseInt(paramsString.replace(/[^\d]/g, ''), 10);
  if (num <= 10) return 'small';
  if (num <= 80) return 'medium';
  if (num <= 200) return 'large';
  return 'frontier';
}

/**
 * Compute proprietary API alternatives for a given model.
 */
export function computeProprietaryAlternatives({
  tier,
  tokensPerDay,
  localTPS,
  localPrice,
  apiProviders
}) {
  const tierData = apiProviders.proprietaryAlternatives?.[tier];
  if (!tierData?.models) return [];

  return tierData.models.map(model => {
    const blendedRatePer1M = calculateBlendedRate(model.inputPer1M, model.outputPer1M);
    const dailyCost = calculateApiDailyCost(tokensPerDay, blendedRatePer1M);
    const monthlyCost = dailyCost * 30;
    const payoffDays = calculatePayoffDays(localPrice, dailyCost);
    const tokPerSec = model.tokPerSec || 100;
    const hoursNeeded = calculateCloudHoursNeeded(tokensPerDay, tokPerSec);
    const speedRatio = localTPS > 0 ? tokPerSec / localTPS : Infinity;

    return {
      name: model.name,
      provider: model.provider,
      inputPer1M: model.inputPer1M,
      outputPer1M: model.outputPer1M,
      blendedPer1M: blendedRatePer1M,
      tokPerSec,
      contextWindow: model.contextWindow,
      hoursNeeded,
      speedRatio,
      dailyCost,
      monthlyCost,
      payoffDays: Math.ceil(payoffDays),
      payoffMonths: payoffDays / 30,
    };
  }).sort((a, b) => a.dailyCost - b.dailyCost);
}

/**
 * Main calculation that combines everything.
 * Returns all derived data for the UI.
 *
 * Now accepts developerId + modelId (new structure) or modelId alone (for compatibility).
 */
export function computeComparison({
  developerId,
  modelId,
  dailyHours,
  macRAM,
  selectedHardware,
  models,
  hardware,
  cloudProviders,
  apiProviders
}) {
  // Get model from new developer-based structure
  const model = getModel(models, developerId, modelId);
  if (!model) {
    return {
      localName: '',
      localPrice: 0,
      localTPS: 0,
      canRun: false,
      tokensPerDay: 0,
      bandwidth: 0,
      memory: 0,
      minRAM: 0,
      modelName: '',
      modelParams: '',
      providers: [],
      apiProviders: [],
    };
  }

  const macConfig = hardware.mac.configs[macRAM];
  const cadToUsd = hardware.cadToUsd;

  // Local hardware capability
  const isMac = selectedHardware === 'mac';
  const localMemory = isMac ? macRAM : hardware.dgxSpark.memory;
  const canRun = isMac
    ? canModelRun(macRAM, model.minRAM)
    : canModelRun(hardware.dgxSpark.memory, model.minRAM) && model.dgxSparkTokPerSec > 0;

  const localTPS = canRun
    ? (isMac ? model.localTokPerSec : model.dgxSparkTokPerSec)
    : 0;

  const localPrice = isMac
    ? macConfig.priceCAD * cadToUsd
    : hardware.dgxSpark.priceUSD;

  const localName = isMac
    ? `${hardware.mac.name} (${macRAM}GB)`
    : hardware.dgxSpark.name;

  const localBandwidth = isMac
    ? hardware.mac.bandwidth
    : hardware.dgxSpark.bandwidth;

  const tokensPerDay = calculateTokensPerDay(localTPS, dailyHours);

  // Cloud provider calculations
  const cloudResults = cloudProviders.providers.map(provider => {
    const hourlyRate = provider.ratePerGPUHour * model.cloudGPUs;
    const cloudHoursNeeded = calculateCloudHoursNeeded(tokensPerDay, model.cloudTokPerSec);
    const dailyCost = calculateDailyCost(cloudHoursNeeded, hourlyRate);
    const monthlyCost = dailyCost * 30;
    const payoffDays = calculatePayoffDays(localPrice, dailyCost);

    return {
      provider: provider.name,
      gpus: model.cloudGPUs,
      cloudTPS: model.cloudTokPerSec,
      hourlyRatePerGPU: provider.ratePerGPUHour,
      hourlyRateTotal: hourlyRate,
      cloudHoursNeeded,
      dailyCost,
      monthlyCost,
      payoffDays: Math.ceil(payoffDays),
      payoffMonths: payoffDays / 30,
      speedRatio: localTPS > 0 ? model.cloudTokPerSec / localTPS : Infinity,
    };
  }).sort((a, b) => a.dailyCost - b.dailyCost);

  // API provider calculations - now keyed by modelId
  const apiList = apiProviders.providers[modelId] || [];
  const apiResults = apiList.map(api => {
    const blendedRatePer1M = calculateBlendedRate(api.inputPer1M, api.outputPer1M);
    const dailyCost = calculateApiDailyCost(tokensPerDay, blendedRatePer1M);
    const monthlyCost = dailyCost * 30;
    const payoffDays = calculatePayoffDays(localPrice, dailyCost);

    return {
      name: api.name,
      inputPer1M: api.inputPer1M,
      outputPer1M: api.outputPer1M,
      blendedPer1M: blendedRatePer1M,
      dailyCost,
      monthlyCost,
      payoffDays: Math.ceil(payoffDays),
      payoffMonths: payoffDays / 30,
    };
  }).sort((a, b) => a.dailyCost - b.dailyCost);

  // Proprietary alternatives based on model size
  const proprietaryTier = getProprietaryTier(model.params);
  const proprietaryResults = computeProprietaryAlternatives({
    tier: proprietaryTier,
    tokensPerDay,
    localTPS,
    localPrice,
    apiProviders,
  });

  return {
    localName,
    localPrice,
    localTPS,
    canRun,
    tokensPerDay,
    bandwidth: localBandwidth,
    memory: localMemory,
    minRAM: model.minRAM,
    modelName: model.name,
    modelParams: model.params,
    activeParams: model.activeParams,
    quantization: model.quantization,
    notes: model.notes,
    providers: cloudResults,
    apiProviders: apiResults,
    proprietaryAlternatives: proprietaryResults,
    proprietaryTier,
  };
}
