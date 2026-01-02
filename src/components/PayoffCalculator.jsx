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
  getDeveloperList,
  getModelsByDeveloper,
} from '../lib/calculations.js';

const developerList = getDeveloperList(models);
const ramOptions = Object.keys(hardware.mac.configs).map(Number);
const cadToUsd = hardware.cadToUsd;

export default function PayoffCalculator() {
  const [developerId, setDeveloperId] = useState('meta');
  const [modelId, setModelId] = useState('llama-3.1-70b');
  const [dailyHours, setDailyHours] = useState(8);
  const [macRAM, setMacRAM] = useState(512);
  const [selectedHardware, setSelectedHardware] = useState('mac');

  // Get models for selected developer
  const developerModels = useMemo(
    () => getModelsByDeveloper(models, developerId),
    [developerId]
  );

  // When developer changes, select first compatible model
  const handleDeveloperChange = (newDevId) => {
    setDeveloperId(newDevId);
    const devModels = getModelsByDeveloper(models, newDevId);
    if (devModels.length > 0) {
      // Find first model that can run on current hardware
      const currentMemory = selectedHardware === 'mac' ? macRAM : hardware.dgxSpark.memory;
      const compatible = devModels.find(m =>
        currentMemory >= m.minRAM &&
        (selectedHardware === 'mac' || m.dgxSparkTokPerSec > 0)
      );
      setModelId(compatible ? compatible.id : devModels[0].id);
    }
  };

  const calculations = useMemo(() => computeComparison({
    developerId,
    modelId,
    dailyHours,
    macRAM,
    selectedHardware,
    models,
    hardware,
    cloudProviders,
    apiProviders,
  }), [developerId, modelId, dailyHours, macRAM, selectedHardware]);

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

          {/* Developer & Model Selection */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-3">Model</label>

            {/* Developer tabs */}
            <div className="flex flex-wrap gap-1 mb-3">
              {developerList.map((dev) => (
                <button
                  key={dev.id}
                  onClick={() => handleDeveloperChange(dev.id)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                    developerId === dev.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {dev.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Model dropdown */}
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {developerModels.map((model) => {
                const currentMemory = selectedHardware === 'mac' ? macRAM : hardware.dgxSpark.memory;
                const canRun = currentMemory >= model.minRAM &&
                  (selectedHardware === 'mac' || model.dgxSparkTokPerSec > 0);
                const tps = selectedHardware === 'mac' ? model.localTokPerSec : model.dgxSparkTokPerSec;
                return (
                  <option
                    key={model.id}
                    value={model.id}
                    disabled={!canRun}
                  >
                    {model.name} ({model.params}) — {canRun ? `${tps} tok/s` : `needs ${model.minRAM}GB+`}
                  </option>
                );
              })}
            </select>

            {/* Model info */}
            {calculations.modelName && (
              <div className="mt-2 text-xs text-gray-500">
                {calculations.quantization} • {calculations.notes}
              </div>
            )}
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
            <div className="text-sm text-gray-400 mb-2">
              Daily workload: <span className="text-white font-medium">{calculations.modelName}</span>
              {calculations.activeParams && (
                <span className="text-gray-500"> ({calculations.modelParams} total, {calculations.activeParams} active)</span>
              )}
            </div>
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
                  Cannot run {calculations.modelName || 'model'} — needs {calculations.minRAM}GB+ RAM
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
                  Pay-per-token pricing for {calculations.modelName} — {formatTokens(calculations.tokensPerDay)} tokens/day
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

            {/* Proprietary API Alternatives */}
            {calculations.proprietaryAlternatives?.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-white mb-2">Proprietary API Alternatives</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Commercial models with comparable capability ({calculations.proprietaryTier} tier) — {formatTokens(calculations.tokensPerDay)} tokens/day
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-800">
                        <th className="text-left py-3 px-3">Provider</th>
                        <th className="text-left py-3 px-2">Model</th>
                        <th className="text-center py-3 px-2">tok/s</th>
                        <th className="text-center py-3 px-2">vs Local</th>
                        <th className="text-right py-3 px-2 bg-purple-900/20">$/1M tok</th>
                        <th className="text-right py-3 px-2 bg-red-900/20">$/day</th>
                        <th className="text-right py-3 px-2">$/mo</th>
                        <th className="text-right py-3 px-3 bg-green-900/20">Payoff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.proprietaryAlternatives.map((api, idx) => {
                        const payoffColor =
                          api.payoffMonths < 3 ? 'text-green-400' :
                          api.payoffMonths < 6 ? 'text-emerald-400' :
                          api.payoffMonths < 12 ? 'text-yellow-400' :
                          api.payoffMonths < 24 ? 'text-orange-400' : 'text-red-400';

                        return (
                          <tr key={`${api.provider}-${api.name}`} className={`border-b border-gray-800/50 ${idx === 0 ? 'bg-indigo-900/10' : ''}`}>
                            <td className="py-3 px-3">
                              <a
                                href={apiProviders.sources?.[api.provider]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-white hover:text-blue-400 transition-colors"
                              >
                                {api.provider}
                              </a>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-gray-200">{api.name}</div>
                            </td>
                            <td className="text-center py-3 px-2 text-gray-300">
                              {api.tokPerSec}
                            </td>
                            <td className="text-center py-3 px-2 text-gray-400">
                              {api.speedRatio.toFixed(1)}×
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

                <div className="mt-4 bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-4">
                  <div className="font-medium text-indigo-300 mb-1">Why consider proprietary alternatives?</div>
                  <div className="text-indigo-200/70 text-sm">
                    Different models with comparable quality. Trade-offs include: API lock-in, no local control, but often faster inference and no hardware investment.
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-xl p-5">
              <h3 className="font-semibold text-blue-300 mb-3">Bottom Line</h3>
              <div className="space-y-2 text-sm text-blue-200/80">
                <p>
                  Running <strong>{calculations.modelName}</strong> for <strong>{dailyHours}h/day</strong> on <strong>{calculations.localName}</strong>:
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
            <h3 className="font-semibold text-red-300 mb-2">Cannot Run {calculations.modelName || 'Model'}</h3>
            <p className="text-sm text-red-200/70">
              {selectedHardware === 'mac'
                ? `This model requires at least ${calculations.minRAM}GB RAM. Select a larger Mac configuration or smaller model.`
                : `DGX Spark (${hardware.dgxSpark.memory}GB) cannot run this model. Try the Mac Studio with more RAM.`
              }
            </p>
          </div>
        )}

        {/* Footer with sources */}
        <div className="mt-4 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-500">
            <strong className="text-gray-400">Benchmark sources:</strong> {models.methodology}
            <br/>
            <strong className="text-gray-400">GPU rental:</strong> {cloudProviders.providers.map(p => `${p.name} $${p.ratePerGPUHour}`).join(', ')} per {cloudProviders.gpuType}/hr.
            <br/>
            <strong className="text-gray-400">Data updated:</strong> {models.updatedAt} • Mac prices in CAD converted at {cadToUsd}.
            <br/>
            <strong className="text-gray-400">Sources:</strong>{' '}
            {models.sources.slice(0, 3).map((s, i) => (
              <span key={s.id}>
                <a href={s.url} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
                {i < 2 && ', '}
              </span>
            ))}
            {models.sources.length > 3 && ` +${models.sources.length - 3} more`}
          </p>
        </div>
      </div>
    </div>
  );
}
