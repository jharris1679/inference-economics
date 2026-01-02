import React, { useState, useMemo } from 'react';

// Data
import models from '../data/models.json';
import hardware from '../data/hardware.json';
import cloudProviders from '../data/cloud-providers.json';
import apiProviders from '../data/api-providers.json';

// Calculations
import {
  computeComparison,
  formatPayoff,
  formatTokens,
  formatHours,
} from '../lib/calculations.js';

const modelSizes = Object.keys(models.models);
const ramOptions = Object.keys(hardware.mac.configs).map(Number);
const cadToUsd = hardware.cadToUsd;

export default function PayoffCalculator() {
  const [modelSize, setModelSize] = useState('70B');
  const [dailyHours, setDailyHours] = useState(8);
  const [macRAM, setMacRAM] = useState(512);
  const [selectedHardware, setSelectedHardware] = useState('mac');

  const calculations = useMemo(() => computeComparison({
    modelSize,
    dailyHours,
    macRAM,
    selectedHardware,
    models,
    hardware,
    cloudProviders,
    apiProviders,
  }), [modelSize, dailyHours, macRAM, selectedHardware]);

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
                <div className="font-medium">{hardware.mac.name}</div>
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
                <div className="font-medium">{hardware.dgxSpark.name}</div>
                <div className="text-sm opacity-75">${hardware.dgxSpark.priceUSD.toLocaleString()} • {hardware.dgxSpark.memory}GB</div>
              </button>
            </div>
          </div>

          {/* Mac RAM Slider */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              {selectedHardware === 'mac' ? (
                <>Mac RAM: <span className="text-white font-bold">{macRAM}GB</span></>
              ) : (
                <>DGX Spark: <span className="text-white font-bold">{hardware.dgxSpark.memory}GB</span> (fixed)</>
              )}
            </label>
            {selectedHardware === 'mac' ? (
              <>
                <input
                  type="range"
                  min="0"
                  max={ramOptions.length - 1}
                  value={ramOptions.indexOf(macRAM)}
                  onChange={(e) => setMacRAM(ramOptions[Number(e.target.value)])}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  {ramOptions.map(r => <span key={r}>{r}</span>)}
                </div>
                <div className="mt-2 text-sm text-green-400">
                  ${(hardware.mac.configs[macRAM].priceCAD * cadToUsd).toLocaleString(undefined, {maximumFractionDigits: 0})} USD
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 mt-4">
                Fixed {hardware.dgxSpark.memory}GB unified memory<br/>
                {hardware.dgxSpark.bandwidth} GB/s bandwidth
              </div>
            )}
          </div>

          {/* Model Size */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">Model</label>
            <div className="grid grid-cols-3 gap-1">
              {modelSizes.map((size) => {
                const model = models.models[size];
                const currentMemory = selectedHardware === 'mac' ? macRAM : hardware.dgxSpark.memory;
                const canRun = currentMemory >= model.minRAM &&
                  (selectedHardware === 'mac' || model.dgxSparkTokPerSec > 0);
                const tps = selectedHardware === 'mac' ? model.localTokPerSec : model.dgxSparkTokPerSec;
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
                      {canRun ? `${tps}t/s` : `>${model.minRAM}GB`}
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
                  Cannot run {modelSize} — needs {calculations.minRAM}GB+ RAM
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
                ? `${modelSize} requires at least ${calculations.minRAM}GB RAM. Select a larger Mac configuration or smaller model.`
                : `DGX Spark (${hardware.dgxSpark.memory}GB) cannot run ${modelSize}. Try the Mac Studio with 256GB+ RAM.`
              }
            </p>
          </div>
        )}

        <div className="mt-4 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">
            <strong className="text-gray-400">Benchmark sources:</strong> {models.source}
            <br/>
            <strong className="text-gray-400">GPU rental:</strong> {cloudProviders.providers.map(p => `${p.name} $${p.ratePerGPUHour}`).join(', ')} per {cloudProviders.gpuType}/hr.
            <br/>
            <strong className="text-gray-400">API pricing:</strong> {apiProviders.providers['70B'].map(p => p.name).join(', ')} ({apiProviders.updatedAt}). Blended = 50% input + 50% output rate.
            <br/>
            <strong className="text-gray-400">Data updated:</strong> {models.updatedAt} • Mac prices in CAD converted at {cadToUsd}.
          </p>
        </div>
      </div>
    </div>
  );
}
