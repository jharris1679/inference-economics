/**
 * Pure calculation functions for inference cost comparisons.
 * No React, no side effects — just math.
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
 * Main calculation that combines everything.
 * Returns all derived data for the UI.
 */
export function computeComparison({
  modelSize,
  dailyHours,
  macRAM,
  selectedHardware,
  models,
  hardware,
  cloudProviders,
  apiProviders
}) {
  const model = models.models[modelSize];
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

  // API provider calculations
  const apiList = apiProviders.providers[modelSize] || [];
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

  return {
    localName,
    localPrice,
    localTPS,
    canRun,
    tokensPerDay,
    bandwidth: localBandwidth,
    memory: localMemory,
    minRAM: model.minRAM,
    providers: cloudResults,
    apiProviders: apiResults,
  };
}
