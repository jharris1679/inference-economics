import React, { useState, useMemo } from 'react';

// Memory required per model for inference (Q4 quantization + KV cache headroom)
// These are practical minimums for comfortable inference
const modelRequirements = {
  '7B': { minRAM: 8, tokPerSec: 95 },      // ~4GB weights + KV cache
  '13B': { minRAM: 16, tokPerSec: 55 },    // ~8GB weights + KV cache  
  '34B': { minRAM: 24, tokPerSec: 28 },    // ~20GB weights + KV cache
  '70B': { minRAM: 48, tokPerSec: 12 },    // ~40GB weights + KV cache, confirmed 12-15 tok/s
  '405B': { minRAM: 256, tokPerSec: 2.5 }, // ~200GB weights (FP8) + KV cache
};

// Mac Studio configurations
// Sources: Apple.ca pricing, 800 GB/s unified memory bandwidth
const macConfigs = {
  96: { price: 5499, currency: 'CAD', bandwidth: 800 },
  128: { price: 6999, currency: 'CAD', bandwidth: 800 },
  192: { price: 8999, currency: 'CAD', bandwidth: 800 },
  256: { price: 10499, currency: 'CAD', bandwidth: 800 },
  512: { price: 13749, currency: 'CAD', bandwidth: 800 },
};

// DGX Spark specs (GB10 Grace Blackwell, 128GB, 273 GB/s)
// Lower bandwidth = proportionally lower tok/s (273/800 ≈ 0.34× Mac bandwidth)
const dgxSparkConfig = {
  name: 'NVIDIA DGX Spark',
  price: 3999,
  currency: 'USD',
  memory: 128,
  bandwidth: 273,
};

// DGX Spark throughput - scaled by bandwidth ratio vs Mac (273/800 ≈ 0.34)
// But Blackwell tensor cores help, so roughly 0.4-0.5× Mac throughput
const dgxSparkThroughput = {
  '7B': 45,
  '13B': 30,
  '34B': 15,
  '70B': 6,     // ~6-8 tok/s confirmed in benchmarks
  '405B': 0,    // Won't fit in 128GB
};

// Cloud GPU requirements and throughput per model
// GPU count determined by VRAM needed, same for all providers
// Sources: vLLM benchmarks, NVIDIA TensorRT-LLM, SemiAnalysis
const cloudConfigs = {
  '7B': { gpus: 1, tokPerSec: 120, source: '1× H100, vLLM batch=1' },
  '13B': { gpus: 1, tokPerSec: 75, source: '1× H100, vLLM batch=1' },
  '34B': { gpus: 1, tokPerSec: 40, source: '1× H100, vLLM batch=1' },
  '70B': { gpus: 2, tokPerSec: 35, source: '2× H100 TP=2, vLLM batch=1' },
  '405B': { gpus: 8, tokPerSec: 15, source: '8× H100 FP8, vLLM batch=1' },
};

// Cloud provider pricing per GPU-hour
const cloudPricing = {
  runpod: { name: 'RunPod', rate: 1.99 },
  denvr: { name: 'Denvr', rate: 2.10 },
  lambda: { name: 'Lambda', rate: 2.99 },
  gcp: { name: 'GCP', rate: 3.00 },
  aws: { name: 'AWS', rate: 3.90 },
};

// API provider pricing per million tokens (output tokens, Dec 2025)
// Assumes 1:1 input:output ratio for simplicity, using blended rate
const apiPricing = {
  '7B': [
    { name: 'Groq', inputPer1M: 0.05, outputPer1M: 0.08 },
    { name: 'Together', inputPer1M: 0.18, outputPer1M: 0.18 },
    { name: 'Fireworks', inputPer1M: 0.10, outputPer1M: 0.10 },
    { name: 'DeepInfra', inputPer1M: 0.05, outputPer1M: 0.05 },
  ],
  '13B': [
    { name: 'Groq (Qwen3 32B)', inputPer1M: 0.29, outputPer1M: 0.59 },
    { name: 'Together', inputPer1M: 0.20, outputPer1M: 0.20 },
    { name: 'Fireworks', inputPer1M: 0.20, outputPer1M: 0.20 },
  ],
  '34B': [
    { name: 'Groq (Qwen3 32B)', inputPer1M: 0.29, outputPer1M: 0.59 },
    { name: 'Together', inputPer1M: 0.80, outputPer1M: 0.80 },
    { name: 'Fireworks', inputPer1M: 0.90, outputPer1M: 0.90 },
  ],
  '70B': [
    { name: 'Groq', inputPer1M: 0.59, outputPer1M: 0.79 },
    { name: 'Together', inputPer1M: 0.88, outputPer1M: 0.88 },
    { name: 'Fireworks', inputPer1M: 0.90, outputPer1M: 0.90 },
    { name: 'DeepInfra', inputPer1M: 0.35, outputPer1M: 0.40 },
  ],
  '405B': [
    { name: 'Together', inputPer1M: 3.50, outputPer1M: 3.50 },
    { name: 'Fireworks', inputPer1M: 0.90, outputPer1M: 0.90 }, // Only has 16B+ bucket
    { name: 'DeepInfra', inputPer1M: 1.79, outputPer1M: 1.79 },
  ],
};

const CAD_TO_USD = 0.72;

export default function PayoffCalculator() {
  const [modelSize, setModelSize] = useState('70B');
  const [dailyHours, setDailyHours] = useState(8);
  const [macRAM, setMacRAM] = useState(512);
  const [selectedHardware, setSelectedHardware] = useState('mac');

  const modelSizes = ['7B', '13B', '34B', '70B', '405B'];
  const ramOptions = [96, 128, 192, 256, 512];

  const calculations = useMemo(() => {
    // Model requirements
    const modelReq = modelRequirements[modelSize];
    
    // Mac hardware specs
    const macConfig = macConfigs[macRAM];
    const canMacRun = macRAM >= modelReq.minRAM;
    const macTPS = canMacRun ? modelReq.tokPerSec : 0;
    const macPriceUSD = macConfig.price * CAD_TO_USD;
    
    // DGX Spark specs
    const canSparkRun = dgxSparkConfig.memory >= modelReq.minRAM && dgxSparkThroughput[modelSize] > 0;
    const sparkTPS = canSparkRun ? dgxSparkThroughput[modelSize] : 0;
    
    // Local hardware throughput based on selection
    const localTPS = selectedHardware === 'mac' ? macTPS : sparkTPS;
    const localPrice = selectedHardware === 'mac' ? macPriceUSD : dgxSparkConfig.price;
    const localName = selectedHardware === 'mac' 
      ? `Mac Studio M3 Ultra (${macRAM}GB)`
      : dgxSparkConfig.name;
    const localMemory = selectedHardware === 'mac' ? macRAM : dgxSparkConfig.memory;
    const localBandwidth = selectedHardware === 'mac' ? macConfig.bandwidth : dgxSparkConfig.bandwidth;
    const canRun = selectedHardware === 'mac' ? canMacRun : canSparkRun;
    
    // Tokens generated per day on local hardware
    const tokensPerDay = localTPS * 3600 * dailyHours;
    
    // Cloud configuration for this model (same GPU count for all providers)
    const cloudSetup = cloudConfigs[modelSize];
    
    // Calculate for each cloud provider
    const results = [];
    
    for (const [providerKey, provider] of Object.entries(cloudPricing)) {
      const hourlyRate = provider.rate * cloudSetup.gpus;
      
      // Hours needed to generate same tokens as local
      const cloudHoursNeeded = tokensPerDay > 0 && cloudSetup.tokPerSec > 0
        ? tokensPerDay / (cloudSetup.tokPerSec * 3600)
        : Infinity;
      
      const dailyCost = cloudHoursNeeded * hourlyRate;
      const monthlyCost = dailyCost * 30;
      
      // Payoff: hardware cost / daily cloud cost
      const payoffDays = dailyCost > 0 ? localPrice / dailyCost : Infinity;
      
      results.push({
        provider: provider.name,
        gpus: cloudSetup.gpus,
        cloudTPS: cloudSetup.tokPerSec,
        source: cloudSetup.source,
        hourlyRatePerGPU: provider.rate,
        hourlyRateTotal: hourlyRate,
        cloudHoursNeeded,
        dailyCost,
        monthlyCost,
        payoffDays: Math.ceil(payoffDays),
        payoffMonths: payoffDays / 30,
        speedRatio: localTPS > 0 ? cloudSetup.tokPerSec / localTPS : Infinity,
      });
    }
    
    // Sort by daily cost
    results.sort((a, b) => a.dailyCost - b.dailyCost);
    
    // Calculate API costs (assuming 50% input, 50% output tokens)
    const apiProviders = apiPricing[modelSize] || [];
    const apiResults = apiProviders.map(api => {
      // Blended rate: 50% input + 50% output
      const blendedRatePer1M = (api.inputPer1M + api.outputPer1M) / 2;
      const tokensInMillions = tokensPerDay / 1_000_000;
      const dailyCost = tokensInMillions * blendedRatePer1M;
      const monthlyCost = dailyCost * 30;
      const payoffDays = dailyCost > 0 ? localPrice / dailyCost : Infinity;
      
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
    });
    
    // Sort API results by daily cost
    apiResults.sort((a, b) => a.dailyCost - b.dailyCost);
    
    return {
      localName,
      localPrice,
      localTPS,
      canRun,
      tokensPerDay,
      bandwidth: localBandwidth,
      memory: localMemory,
      minRAM: modelReq.minRAM,
      providers: results,
      apiProviders: apiResults,
    };
  }, [modelSize, dailyHours, macRAM, selectedHardware]);

  const formatPayoff = (months) => {
    if (!isFinite(months) || isNaN(months)) return 'N/A';
    if (months >= 12) return `${(months / 12).toFixed(1)}y`;
    if (months >= 1) return `${months.toFixed(1)}mo`;
    return `${Math.ceil(months * 30)}d`;
  };

  const formatTokens = (num) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatHours = (hours) => {
    if (!isFinite(hours)) return '—';
    if (hours < 1) return `${(hours * 60).toFixed(0)}m`;
    return `${hours.toFixed(1)}h`;
  };

  const cheapest = calculations.providers[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-2 text-white">Hardware vs. Cloud Payoff Calculator</h1>
        <p className="text-gray-400 mb-6">
          Using real benchmark data — cloud hours adjusted to match your local token output
        </p>
        
        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Hardware Selection */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">Hardware</label>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedHardware('mac')}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedHardware === 'mac'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">Mac Studio M3 Ultra</div>
                <div className="text-sm opacity-75">Up to 512GB unified</div>
              </button>
              <button
                onClick={() => setSelectedHardware('spark')}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedHardware === 'spark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium">DGX Spark</div>
                <div className="text-sm opacity-75">$3,999 • 128GB</div>
              </button>
            </div>
          </div>

          {/* Mac RAM Slider */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              {selectedHardware === 'mac' ? (
                <>Mac RAM: <span className="text-white font-bold">{macRAM}GB</span></>
              ) : (
                <>DGX Spark: <span className="text-white font-bold">128GB</span> (fixed)</>
              )}
            </label>
            {selectedHardware === 'mac' ? (
              <>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={ramOptions.indexOf(macRAM)}
                  onChange={(e) => setMacRAM(ramOptions[Number(e.target.value)])}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  {ramOptions.map(r => <span key={r}>{r}</span>)}
                </div>
                <div className="mt-2 text-sm text-green-400">
                  ${(macConfigs[macRAM].price * CAD_TO_USD).toLocaleString(undefined, {maximumFractionDigits: 0})} USD
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 mt-4">
                Fixed 128GB unified memory<br/>
                273 GB/s bandwidth
              </div>
            )}
          </div>
          
          {/* Model Size */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">Model</label>
            <div className="grid grid-cols-3 gap-1">
              {modelSizes.map((size) => {
                const req = modelRequirements[size];
                const currentMemory = selectedHardware === 'mac' ? macRAM : dgxSparkConfig.memory;
                const canRun = currentMemory >= req.minRAM && 
                  (selectedHardware === 'mac' || dgxSparkThroughput[size] > 0);
                const tps = selectedHardware === 'mac' ? req.tokPerSec : dgxSparkThroughput[size];
                return (
                  <button
                    key={size}
                    onClick={() => canRun && setModelSize(size)}
                    disabled={!canRun}
                    className={`p-2 rounded-lg text-sm font-medium transition-all ${
                      modelSize === size
                        ? 'bg-blue-600 text-white'
                        : canRun
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {size}
                    <span className="block text-xs opacity-75">
                      {canRun ? `${tps}t/s` : `>${req.minRAM}GB`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Daily Hours */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Usage: <span className="text-white font-bold">{dailyHours}h/day</span>
            </label>
            <input
              type="range"
              min="1"
              max="24"
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>1h</span>
              <span>12h</span>
              <span>24h</span>
            </div>
          </div>
        </div>

        {/* Workload Summary */}
        {calculations.canRun && (
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-2">Daily workload on local hardware</div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{dailyHours}h × {calculations.localTPS} tok/s</div>
                <div className="text-xs text-gray-500">runtime × throughput</div>
              </div>
              <div className="text-xl text-gray-600">=</div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{formatTokens(calculations.tokensPerDay)}</div>
                <div className="text-xs text-gray-500">tokens/day</div>
              </div>
            </div>
          </div>
        )}

        {/* Local Hardware Card */}
        <div className={`rounded-xl p-5 border mb-6 ${
          calculations.canRun 
            ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-green-800/50'
            : 'bg-red-900/20 border-red-800/50'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">{calculations.localName}</h2>
              <div className="text-sm text-gray-400">
                {calculations.memory}GB • {calculations.bandwidth} GB/s bandwidth
              </div>
            </div>
            <div className="flex gap-6 items-center">
              {calculations.canRun ? (
                <>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-400">{calculations.localTPS} tok/s</div>
                    <div className="text-xs text-gray-500">throughput</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-400">
                      ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </div>
                    <div className="text-xs text-gray-500">USD</div>
                  </div>
                </>
              ) : (
                <div className="text-red-400">
                  Cannot run {modelSize} — needs {modelRequirements[modelSize].minRAM}GB+ RAM
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cloud Comparison */}
        {calculations.canRun && calculations.providers.length > 0 && (
          <>
            <h2 className="text-lg font-semibold text-white mb-2">Cloud Alternatives</h2>
            <p className="text-sm text-gray-500 mb-4">
              Hours adjusted to produce {formatTokens(calculations.tokensPerDay)} tokens/day — same as local
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left py-3 px-3">Provider</th>
                    <th className="text-center py-3 px-2">GPUs</th>
                    <th className="text-center py-3 px-2">Cloud tok/s</th>
                    <th className="text-center py-3 px-2">Speedup</th>
                    <th className="text-center py-3 px-2 bg-yellow-900/20">Hrs needed</th>
                    <th className="text-right py-3 px-2">$/hr</th>
                    <th className="text-right py-3 px-2 bg-red-900/20">$/day</th>
                    <th className="text-right py-3 px-2">$/mo</th>
                    <th className="text-right py-3 px-3 bg-green-900/20">Payoff</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.providers.map((p, idx) => {
                    const payoffColor = 
                      p.payoffMonths < 3 ? 'text-green-400' :
                      p.payoffMonths < 6 ? 'text-emerald-400' :
                      p.payoffMonths < 12 ? 'text-yellow-400' :
                      p.payoffMonths < 24 ? 'text-orange-400' : 'text-red-400';
                    
                    return (
                      <tr key={`${p.provider}-${p.gpus}`} className={`border-b border-gray-800/50 ${idx === 0 ? 'bg-blue-900/10' : ''}`}>
                        <td className="py-3 px-3">
                          <div className="font-medium text-white">{p.provider}</div>
                          <div className="text-xs text-gray-500">${p.hourlyRatePerGPU}/GPU/hr</div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className={`font-mono ${p.gpus > 1 ? 'text-yellow-400' : 'text-gray-300'}`}>
                            {p.gpus}× H100
                          </span>
                        </td>
                        <td className="text-center py-3 px-2 text-gray-300">
                          {p.cloudTPS}
                        </td>
                        <td className="text-center py-3 px-2 text-gray-400">
                          {p.speedRatio.toFixed(1)}×
                        </td>
                        <td className="text-center py-3 px-2 bg-yellow-900/10 font-mono text-yellow-400">
                          {formatHours(p.cloudHoursNeeded)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-gray-400">
                          ${p.hourlyRateTotal.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 bg-red-900/10 font-mono text-red-400">
                          ${p.dailyCost.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-red-400">
                          ${p.monthlyCost.toFixed(0)}
                        </td>
                        <td className={`text-right py-3 px-3 bg-green-900/10 font-bold ${payoffColor}`}>
                          {formatPayoff(p.payoffMonths)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Explanation Cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-4">
                <div className="font-medium text-yellow-300 mb-1">Hrs needed</div>
                <div className="text-yellow-200/70">
                  Cloud is {cheapest?.speedRatio.toFixed(1)}× faster, so you only need {formatHours(cheapest?.cloudHoursNeeded)} 
                  to match {dailyHours}h of local output.
                </div>
              </div>
              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                <div className="font-medium text-red-300 mb-1">$/day</div>
                <div className="text-red-200/70">
                  {formatHours(cheapest?.cloudHoursNeeded)} × ${cheapest?.hourlyRateTotal.toFixed(2)}/hr 
                  = ${cheapest?.dailyCost.toFixed(2)}/day for equivalent work.
                </div>
              </div>
              <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                <div className="font-medium text-green-300 mb-1">Payoff</div>
                <div className="text-green-200/70">
                  ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ÷ 
                  ${cheapest?.dailyCost.toFixed(2)}/day = {cheapest?.payoffDays} days to break even.
                </div>
              </div>
            </div>

            {/* API Provider Comparison */}
            {calculations.apiProviders.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-2">API Provider Comparison</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Pay-per-token pricing for {modelSize} models — {formatTokens(calculations.tokensPerDay)} tokens/day
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-800">
                        <th className="text-left py-3 px-3">Provider</th>
                        <th className="text-right py-3 px-2">Input $/1M</th>
                        <th className="text-right py-3 px-2">Output $/1M</th>
                        <th className="text-right py-3 px-2 bg-purple-900/20">Blended $/1M</th>
                        <th className="text-right py-3 px-2 bg-red-900/20">$/day</th>
                        <th className="text-right py-3 px-2">$/mo</th>
                        <th className="text-right py-3 px-3 bg-green-900/20">Payoff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.apiProviders.map((api, idx) => {
                        const payoffColor = 
                          api.payoffMonths < 3 ? 'text-green-400' :
                          api.payoffMonths < 6 ? 'text-emerald-400' :
                          api.payoffMonths < 12 ? 'text-yellow-400' :
                          api.payoffMonths < 24 ? 'text-orange-400' : 'text-red-400';
                        
                        return (
                          <tr key={api.name} className={`border-b border-gray-800/50 ${idx === 0 ? 'bg-purple-900/10' : ''}`}>
                            <td className="py-3 px-3">
                              <div className="font-medium text-white">{api.name}</div>
                            </td>
                            <td className="text-right py-3 px-2 font-mono text-gray-400">
                              ${api.inputPer1M.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 font-mono text-gray-400">
                              ${api.outputPer1M.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 bg-purple-900/10 font-mono text-purple-400">
                              ${api.blendedPer1M.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 bg-red-900/10 font-mono text-red-400">
                              ${api.dailyCost.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 font-mono text-red-400">
                              ${api.monthlyCost.toFixed(0)}
                            </td>
                            <td className={`text-right py-3 px-3 bg-green-900/10 font-bold ${payoffColor}`}>
                              {formatPayoff(api.payoffMonths)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 bg-purple-900/20 border border-purple-800/30 rounded-lg p-4">
                  <div className="font-medium text-purple-300 mb-1">API vs GPU Rental vs Local</div>
                  <div className="text-purple-200/70 text-sm">
                    {calculations.apiProviders[0] && cheapest && (
                      <>
                        <strong>Cheapest API:</strong> {calculations.apiProviders[0].name} @ ${calculations.apiProviders[0].dailyCost.toFixed(2)}/day 
                        ({formatPayoff(calculations.apiProviders[0].payoffMonths)} payoff) — 
                        {calculations.apiProviders[0].dailyCost < cheapest.dailyCost 
                          ? ` ${((cheapest.dailyCost / calculations.apiProviders[0].dailyCost - 1) * 100).toFixed(0)}% cheaper than GPU rental`
                          : ` ${((calculations.apiProviders[0].dailyCost / cheapest.dailyCost - 1) * 100).toFixed(0)}% more expensive than GPU rental`
                        }
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-xl p-5">
              <h3 className="font-semibold text-blue-300 mb-3">Bottom Line</h3>
              <div className="space-y-2 text-sm text-blue-200/80">
                <p>
                  Running <strong>{modelSize}</strong> for <strong>{dailyHours}h/day</strong> on <strong>{calculations.localName}</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-green-400 font-medium mb-1">Local Hardware</div>
                    <div>{dailyHours}h/day @ {calculations.localTPS} tok/s</div>
                    <div>One-time: ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-3">
                    <div className="text-orange-400 font-medium mb-1">GPU Rental ({cheapest?.provider})</div>
                    <div>{formatHours(cheapest?.cloudHoursNeeded)}/day @ {cheapest?.cloudTPS} tok/s</div>
                    <div>${cheapest?.dailyCost.toFixed(2)}/day = ${cheapest?.monthlyCost.toFixed(0)}/mo</div>
                  </div>
                  {calculations.apiProviders[0] && (
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-purple-400 font-medium mb-1">API ({calculations.apiProviders[0].name})</div>
                      <div>${calculations.apiProviders[0].blendedPer1M.toFixed(2)}/1M tokens</div>
                      <div>${calculations.apiProviders[0].dailyCost.toFixed(2)}/day = ${calculations.apiProviders[0].monthlyCost.toFixed(0)}/mo</div>
                    </div>
                  )}
                </div>
                
                {/* Determine best option */}
                {(() => {
                  const cheapestApi = calculations.apiProviders[0];
                  const gpuCost = cheapest?.dailyCost || Infinity;
                  const apiCost = cheapestApi?.dailyCost || Infinity;
                  const minCloudCost = Math.min(gpuCost, apiCost);
                  const payoffDays = calculations.localPrice / minCloudCost;
                  const payoffMonths = payoffDays / 30;
                  
                  const bestCloud = apiCost < gpuCost 
                    ? { name: cheapestApi.name, type: 'API', cost: apiCost }
                    : { name: cheapest?.provider, type: 'GPU', cost: gpuCost };
                  
                  return (
                    <p className={payoffMonths < 12 ? 'text-green-300 mt-3' : 'text-yellow-300 mt-3'}>
                      {payoffMonths < 12 
                        ? `✓ Hardware pays off in ${Math.ceil(payoffDays)} days (${formatPayoff(payoffMonths)}) vs ${bestCloud.type} (${bestCloud.name}). After that, inference is essentially free.`
                        : `⚠ Hardware takes ${formatPayoff(payoffMonths)} to pay off vs ${bestCloud.type} (${bestCloud.name}) at this utilization level.`
                      }
                    </p>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {!calculations.canRun && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-5">
            <h3 className="font-semibold text-red-300 mb-2">Cannot Run {modelSize}</h3>
            <p className="text-sm text-red-200/70">
              {selectedHardware === 'mac' 
                ? `${modelSize} requires at least ${modelRequirements[modelSize].minRAM}GB RAM. Select a larger Mac configuration or smaller model.`
                : `DGX Spark (128GB) cannot run ${modelSize}. Try the Mac Studio with 256GB+ RAM.`
              }
            </p>
          </div>
        )}

        <div className="mt-4 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">
            <strong className="text-gray-400">Benchmark sources:</strong> Mac throughput from llama.cpp discussions (Q4_K_M quantization, batch=1). 
            Cloud throughput from vLLM benchmarks (batch=1, tensor parallel). 
            70B on 2× H100: ~35 tok/s. 405B on 8× H100 FP8: ~15 tok/s.
            <br/>
            <strong className="text-gray-400">GPU rental:</strong> RunPod $1.99, Denvr $2.10, Lambda $2.99, GCP $3.00, AWS $3.90 per H100/hr.
            <br/>
            <strong className="text-gray-400">API pricing:</strong> Groq, Together.ai, Fireworks, DeepInfra (Dec 2025). Blended = 50% input + 50% output rate.
            <br/>
            Mac prices in CAD converted at {CAD_TO_USD}.
          </p>
        </div>
      </div>
    </div>
  );
}
