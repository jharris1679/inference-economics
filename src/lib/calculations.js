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

/**
 * Multi-model workload calculations (ANS-504)
 */

/**
 * Calculate total memory required for a workload.
 * All models assumed loaded simultaneously.
 */
export function calculateWorkloadMemory(workload, modelsData) {
  let totalRAM = 0;
  const breakdown = [];

  for (const entry of workload) {
    const model = getModel(modelsData, entry.developerId, entry.modelId);
    if (model) {
      const ramNeeded = model.minRAM * entry.quantity;
      totalRAM += ramNeeded;
      breakdown.push({
        modelId: entry.modelId,
        name: model.name,
        ram: model.minRAM,
        quantity: entry.quantity,
        subtotal: ramNeeded,
      });
    }
  }

  return { totalRAM, breakdown };
}

/**
 * Check if hardware can run entire workload simultaneously.
 */
export function canRunWorkload(availableMemory, workload, modelsData, selectedHardware) {
  const { totalRAM, breakdown } = calculateWorkloadMemory(workload, modelsData);

  // Also check if each model is compatible with the hardware
  const incompatibleModels = [];
  for (const entry of workload) {
    const model = getModel(modelsData, entry.developerId, entry.modelId);
    if (model && selectedHardware === 'spark' && model.dgxSparkTokPerSec <= 0) {
      incompatibleModels.push(model.name);
    }
  }

  const canRun = availableMemory >= totalRAM && incompatibleModels.length === 0;
  return {
    canRun,
    totalRAM,
    availableRAM: availableMemory,
    deficit: canRun ? 0 : Math.max(0, totalRAM - availableMemory),
    incompatibleModels,
    breakdown,
  };
}

/**
 * Compute combined workload costs.
 * Returns aggregated totals across all models in workload.
 */
export function computeWorkloadComparison({
  workload,
  dailyHours,
  macRAM,
  selectedHardware,
  models,
  hardware,
  cloudProviders,
  apiProviders
}) {
  const isMac = selectedHardware === 'mac';
  const localMemory = isMac ? macRAM : hardware.dgxSpark.memory;
  const cadToUsd = hardware.cadToUsd;

  // Check if workload fits in memory
  const memoryInfo = canRunWorkload(localMemory, workload, models, selectedHardware);

  const localPrice = isMac
    ? hardware.mac.configs[macRAM].priceCAD * cadToUsd
    : hardware.dgxSpark.priceUSD;

  const localName = isMac
    ? `${hardware.mac.name} (${macRAM}GB)`
    : hardware.dgxSpark.name;

  const localBandwidth = isMac
    ? hardware.mac.bandwidth
    : hardware.dgxSpark.bandwidth;

  if (!memoryInfo.canRun) {
    return {
      canRun: false,
      memoryInfo,
      totalTokensPerDay: 0,
      localName,
      localPrice,
      localTPS: 0,
      bandwidth: localBandwidth,
      memory: localMemory,
      workloadSummary: [],
      providers: [],
      apiProviders: [],
      proprietaryAlternatives: [],
    };
  }

  // Calculate combined throughput and tokens per day
  let totalLocalTPS = 0;
  const workloadSummary = [];

  for (const entry of workload) {
    const model = getModel(models, entry.developerId, entry.modelId);
    if (model) {
      const tps = isMac ? model.localTokPerSec : model.dgxSparkTokPerSec;
      const entryTPS = tps * entry.quantity;
      totalLocalTPS += entryTPS;
      workloadSummary.push({
        modelId: entry.modelId,
        name: model.name,
        params: model.params,
        quantity: entry.quantity,
        tps: entryTPS,
        ram: model.minRAM * entry.quantity,
      });
    }
  }

  const totalTokensPerDay = calculateTokensPerDay(totalLocalTPS, dailyHours);

  // Cloud provider calculations - aggregate across workload
  // For multi-model, we sum the GPU requirements
  let totalCloudGPUs = 0;
  let weightedCloudTPS = 0;

  for (const entry of workload) {
    const model = getModel(models, entry.developerId, entry.modelId);
    if (model) {
      totalCloudGPUs += model.cloudGPUs * entry.quantity;
      weightedCloudTPS += model.cloudTokPerSec * entry.quantity;
    }
  }

  const cloudResults = cloudProviders.providers.map(provider => {
    const hourlyRate = provider.ratePerGPUHour * totalCloudGPUs;
    const cloudHoursNeeded = calculateCloudHoursNeeded(totalTokensPerDay, weightedCloudTPS);
    const dailyCost = calculateDailyCost(cloudHoursNeeded, hourlyRate);
    const monthlyCost = dailyCost * 30;
    const payoffDays = calculatePayoffDays(localPrice, dailyCost);

    return {
      provider: provider.name,
      gpus: totalCloudGPUs,
      cloudTPS: weightedCloudTPS,
      hourlyRatePerGPU: provider.ratePerGPUHour,
      hourlyRateTotal: hourlyRate,
      cloudHoursNeeded,
      dailyCost,
      monthlyCost,
      payoffDays: Math.ceil(payoffDays),
      payoffMonths: payoffDays / 30,
      speedRatio: totalLocalTPS > 0 ? weightedCloudTPS / totalLocalTPS : Infinity,
    };
  }).sort((a, b) => a.dailyCost - b.dailyCost);

  // API provider calculations - aggregate costs across models
  // Find providers that serve ALL models in workload
  const apiCostsByProvider = {};

  for (const entry of workload) {
    const modelApiList = apiProviders.providers[entry.modelId] || [];
    for (const api of modelApiList) {
      if (!apiCostsByProvider[api.name]) {
        apiCostsByProvider[api.name] = {
          name: api.name,
          totalDailyCost: 0,
          modelsServed: 0,
          details: [],
        };
      }
      const model = getModel(models, entry.developerId, entry.modelId);
      const tps = isMac ? model.localTokPerSec : model.dgxSparkTokPerSec;
      const modelTokensPerDay = calculateTokensPerDay(tps * entry.quantity, dailyHours);
      const blendedRate = calculateBlendedRate(api.inputPer1M, api.outputPer1M);
      const dailyCost = calculateApiDailyCost(modelTokensPerDay, blendedRate);

      apiCostsByProvider[api.name].totalDailyCost += dailyCost;
      apiCostsByProvider[api.name].modelsServed += 1;
      apiCostsByProvider[api.name].details.push({
        modelId: entry.modelId,
        inputPer1M: api.inputPer1M,
        outputPer1M: api.outputPer1M,
        blendedPer1M: blendedRate,
        dailyCost,
      });
    }
  }

  // Only include providers that serve ALL models in workload
  const apiResults = Object.values(apiCostsByProvider)
    .filter(p => p.modelsServed === workload.length)
    .map(p => {
      const monthlyCost = p.totalDailyCost * 30;
      const payoffDays = calculatePayoffDays(localPrice, p.totalDailyCost);
      // Average blended rate across models
      const avgBlended = p.details.reduce((sum, d) => sum + d.blendedPer1M, 0) / p.details.length;
      return {
        name: p.name,
        blendedPer1M: avgBlended,
        inputPer1M: p.details[0]?.inputPer1M || 0,
        outputPer1M: p.details[0]?.outputPer1M || 0,
        dailyCost: p.totalDailyCost,
        monthlyCost,
        payoffDays: Math.ceil(payoffDays),
        payoffMonths: payoffDays / 30,
      };
    })
    .sort((a, b) => a.dailyCost - b.dailyCost);

  // Proprietary alternatives - use the largest model's tier
  const largestModel = workload.reduce((largest, entry) => {
    const model = getModel(models, entry.developerId, entry.modelId);
    if (!model) return largest;
    const currentParams = parseInt(model.params?.replace(/[^\d]/g, '') || '0', 10);
    const largestParams = parseInt(largest?.params?.replace(/[^\d]/g, '') || '0', 10);
    return currentParams > largestParams ? model : largest;
  }, null);

  const proprietaryTier = getProprietaryTier(largestModel?.params);
  const proprietaryResults = computeProprietaryAlternatives({
    tier: proprietaryTier,
    tokensPerDay: totalTokensPerDay,
    localTPS: totalLocalTPS,
    localPrice,
    apiProviders,
  });

  return {
    canRun: true,
    memoryInfo,
    localName,
    localPrice,
    localTPS: totalLocalTPS,
    bandwidth: localBandwidth,
    memory: localMemory,
    tokensPerDay: totalTokensPerDay,
    workloadSummary,
    providers: cloudResults,
    apiProviders: apiResults,
    proprietaryAlternatives: proprietaryResults,
    proprietaryTier,
  };
}
