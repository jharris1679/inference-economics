import React, { useState, useMemo, useRef, useEffect } from 'react';

// Data
import models from '../data/models.json';

/**
 * Reusable multi-select dropdown component for filtering providers.
 * Shows selected count when closed, checkboxes with All/Clear when open.
 */
function MultiSelectDropdown({ options, selected, onChange, getKey = (o) => o.id, getLabel = (o) => o.name, getDetail = () => null }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const totalCount = options.length;

  const selectAll = () => {
    onChange(Object.fromEntries(options.map(o => [getKey(o), true])));
  };

  const clearAll = () => {
    onChange(Object.fromEntries(options.map(o => [getKey(o), false])));
  };

  const toggleOption = (key) => {
    onChange({ ...selected, [key]: !selected[key] });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:border-gray-600 transition-colors"
      >
        <span>
          {selectedCount === totalCount
            ? 'All'
            : selectedCount === 0
              ? 'None'
              : `${selectedCount}/${totalCount}`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-1 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
          {/* All/Clear buttons */}
          <div className="flex gap-2 p-2 border-b border-gray-700 bg-gray-850">
            <button
              onClick={selectAll}
              className="flex-1 px-2 py-1 text-xs font-medium text-blue-400 bg-blue-900/30 rounded hover:bg-blue-900/50 transition-colors"
            >
              All
            </button>
            <button
              onClick={clearAll}
              className="flex-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto">
            {options.map(opt => {
              const key = getKey(opt);
              const detail = getDetail(opt);
              return (
                <label
                  key={key}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected[key] !== false}
                    onChange={() => toggleOption(key)}
                    className="rounded border-gray-600 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-gray-200">{getLabel(opt)}</span>
                  {detail && <span className="text-xs text-gray-500 ml-auto">{detail}</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
import hardware from '../data/hardware.json';
import cloudProviders from '../data/cloud-providers.json';
import apiProviders from '../data/api-providers.json';

// Calculations
import {
  computeComparison,
  computeWorkloadComparison,
  calculateWorkloadMemory,
  formatPayoff,
  formatTokens,
  formatHours,
  getDeveloperList,
  getModelsByDeveloper,
  getModel,
  TRAINING_MODES,
} from '../lib/calculations.js';

const developerList = getDeveloperList(models);
const ramOptions = Object.keys(hardware.mac.configs).map(Number);
const cadToUsd = hardware.cadToUsd;

export default function PayoffCalculator() {
  const [dailyHours, setDailyHours] = useState(8);
  const [macRAM, setMacRAM] = useState(512);
  const [selectedHardware, setSelectedHardware] = useState('mac');
  const [trainingMode, setTrainingMode] = useState('inference'); // ANS-514: Training mode selector

  // Workload state (ANS-504) - array of models to run
  const [workload, setWorkload] = useState(() => [{
    id: crypto.randomUUID(),
    developerId: 'meta',
    modelId: 'llama-3.1-70b',
    quantity: 1,
  }]);

  // Provider filter state (ANS-511) - multi-select dropdowns in section headers
  const [cloudGPUFilters, setCloudGPUFilters] = useState(() =>
    Object.fromEntries(cloudProviders.providers.map(p => [p.id, true]))
  );
  const [ossAPIFilters, setOssAPIFilters] = useState({
    Groq: true, Together: true, Fireworks: true, DeepInfra: true,
    Cerebras: true, OpenAI: true, Moonshot: true
  });
  // Proprietary model filters - dynamically built from all tiers
  const [proprietaryModelFilters, setProprietaryModelFilters] = useState(() => {
    const allModels = {};
    Object.values(apiProviders.proprietaryAlternatives || {}).forEach(tier => {
      tier.models?.forEach(model => {
        allModels[model.name] = true;
      });
    });
    return allModels;
  });

  // Memory info for workload (ANS-514: now includes training mode)
  const memoryInfo = useMemo(() => {
    const availableMemory = selectedHardware === 'mac' ? macRAM : hardware.dgxSpark.memory;
    const memCalc = calculateWorkloadMemory(workload, models, trainingMode);
    const { totalRAM, breakdown, trainingMode: modeName, trainingDescription, isTraining } = memCalc;
    const percentage = (totalRAM / availableMemory) * 100;
    return {
      totalRAM,
      availableMemory,
      breakdown,
      percentage,
      canFit: totalRAM <= availableMemory,
      trainingMode: modeName,
      trainingDescription,
      isTraining,
    };
  }, [workload, macRAM, selectedHardware, trainingMode]);

  // Workload management functions
  const addModelToWorkload = () => {
    setWorkload(prev => [...prev, {
      id: crypto.randomUUID(),
      developerId: 'meta',
      modelId: 'llama-3.1-8b',
      quantity: 1,
    }]);
  };

  const removeFromWorkload = (id) => {
    if (workload.length <= 1) return; // Keep at least one model
    setWorkload(prev => prev.filter(w => w.id !== id));
  };

  const updateWorkloadEntry = (id, updates) => {
    setWorkload(prev => prev.map(w =>
      w.id === id ? { ...w, ...updates } : w
    ));
  };

  const calculations = useMemo(() => computeWorkloadComparison({
    workload,
    dailyHours,
    macRAM,
    selectedHardware,
    models,
    hardware,
    cloudProviders,
    apiProviders,
    trainingMode,
  }), [workload, dailyHours, macRAM, selectedHardware, trainingMode]);

  // Filter results by provider selection (ANS-511)
  // Map provider names to IDs for filtering
  const providerNameToId = Object.fromEntries(
    cloudProviders.providers.map(p => [p.name, p.id])
  );

  const filteredProviders = useMemo(() =>
    calculations.providers.filter(p => {
      const id = providerNameToId[p.provider] || p.provider.toLowerCase();
      return cloudGPUFilters[id] !== false;
    }),
    [calculations.providers, cloudGPUFilters]
  );

  const filteredApiProviders = useMemo(() =>
    calculations.apiProviders.filter(p => ossAPIFilters[p.name] !== false),
    [calculations.apiProviders, ossAPIFilters]
  );

  const filteredProprietaryAlternatives = useMemo(() =>
    (calculations.proprietaryAlternatives || []).filter(p => proprietaryModelFilters[p.name] !== false),
    [calculations.proprietaryAlternatives, proprietaryModelFilters]
  );

  const cheapest = filteredProviders[0];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* ANS-517: Header with data freshness indicator */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-white">Hardware vs. Cloud Payoff Calculator</h1>
            <p className="text-gray-400">
              Using real benchmark data — cloud hours adjusted to match your local token output
            </p>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-gray-300">
              Data updated: <span className="text-white font-medium">{apiProviders.updatedAt}</span>
            </span>
          </div>
        </div>

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

          {/* Workload Builder (ANS-504) - spans 2 columns */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-400">Workload</label>
              <button
                onClick={addModelToWorkload}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-400 bg-blue-900/30 rounded hover:bg-blue-900/50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Model
              </button>
            </div>

            {/* Workload entries */}
            <div className="space-y-2">
              {workload.map((entry, idx) => {
                const developerModels = getModelsByDeveloper(models, entry.developerId);
                const currentModel = getModel(models, entry.developerId, entry.modelId);
                return (
                  <div key={entry.id} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
                    {/* Developer dropdown */}
                    <select
                      value={entry.developerId}
                      onChange={(e) => {
                        const newDevId = e.target.value;
                        const devModels = getModelsByDeveloper(models, newDevId);
                        updateWorkloadEntry(entry.id, {
                          developerId: newDevId,
                          modelId: devModels[0]?.id || '',
                        });
                      }}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {developerList.map(dev => (
                        <option key={dev.id} value={dev.id}>{dev.name.split(' ')[0]}</option>
                      ))}
                    </select>

                    {/* Model dropdown */}
                    <select
                      value={entry.modelId}
                      onChange={(e) => updateWorkloadEntry(entry.id, { modelId: e.target.value })}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {developerModels.map(model => {
                        const tps = selectedHardware === 'mac' ? model.localTokPerSec : model.dgxSparkTokPerSec;
                        return (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.params}) — {tps} tok/s
                          </option>
                        );
                      })}
                    </select>

                    {/* Quantity */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">×</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={entry.quantity}
                        onChange={(e) => updateWorkloadEntry(entry.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* RAM indicator */}
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {currentModel ? currentModel.minRAM * entry.quantity : 0}GB
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFromWorkload(entry.id)}
                      disabled={workload.length <= 1}
                      className={`p-1 rounded transition-colors ${
                        workload.length <= 1
                          ? 'text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Memory Summary Bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">Memory Usage</span>
                <span className={memoryInfo.canFit ? 'text-green-400' : 'text-red-400'}>
                  {memoryInfo.totalRAM}GB / {memoryInfo.availableMemory}GB
                  {memoryInfo.canFit ? ' ✓' : ` (${memoryInfo.totalRAM - memoryInfo.availableMemory}GB over)`}
                </span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    memoryInfo.percentage > 100 ? 'bg-red-500' :
                    memoryInfo.percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(memoryInfo.percentage, 100)}%` }}
                />
              </div>
              {/* Memory breakdown tooltip */}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                {memoryInfo.breakdown.map((b, i) => (
                  <span key={i} className="bg-gray-800 px-1.5 py-0.5 rounded">
                    {b.name}: {b.subtotal}GB{b.quantity > 1 ? ` (×${b.quantity})` : ''}
                  </span>
                ))}
              </div>
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

          {/* ANS-514: Training Mode Selector */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 lg:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Mode: <span className="text-white font-bold">{memoryInfo.trainingMode}</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(TRAINING_MODES).map(([key, mode]) => (
                <button
                  key={key}
                  onClick={() => setTrainingMode(key)}
                  className={`p-2 rounded-lg text-left transition-all ${
                    trainingMode === key
                      ? key === 'inference'
                        ? 'bg-blue-600 text-white'
                        : 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">{mode.name}</div>
                  <div className="text-xs opacity-75 truncate">{mode.multiplier}× RAM</div>
                </button>
              ))}
            </div>
            {memoryInfo.isTraining && (
              <div className="mt-3 text-xs text-orange-400 bg-orange-900/20 rounded-lg p-2">
                <strong>Training mode:</strong> {memoryInfo.trainingDescription}
                <br />
                <span className="text-orange-300">
                  Memory includes: weights + gradients + optimizer states + activations
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Workload Summary */}
        {calculations.canRun && (
          <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
            <div className="text-sm text-gray-400 mb-2">
              Daily workload:{' '}
              <span className="text-white font-medium">
                {calculations.workloadSummary?.length > 1
                  ? `${calculations.workloadSummary.length} models`
                  : calculations.workloadSummary?.[0]?.name || 'Unknown'}
              </span>
              {calculations.workloadSummary?.length > 1 && (
                <span className="text-gray-500">
                  {' '}({calculations.workloadSummary.map(w =>
                    `${w.quantity > 1 ? w.quantity + '× ' : ''}${w.name}`
                  ).join(', ')})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{dailyHours}h × {calculations.localTPS} tok/s</div>
                <div className="text-xs text-gray-500">runtime × combined throughput</div>
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
                  Cannot run workload — needs {calculations.memoryInfo?.totalRAM || 0}GB RAM
                  {calculations.memoryInfo?.incompatibleModels?.length > 0 && (
                    <> (incompatible: {calculations.memoryInfo.incompatibleModels.join(', ')})</>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cloud Comparison */}
        {calculations.canRun && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Cloud Alternatives</h2>
              <MultiSelectDropdown
                options={cloudProviders.providers}
                selected={cloudGPUFilters}
                onChange={setCloudGPUFilters}
                getKey={(p) => p.id}
                getLabel={(p) => p.name}
                getDetail={(p) => `$${p.ratePerGPUHour}/hr`}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Hours adjusted to produce {formatTokens(calculations.tokensPerDay)} tokens/day — same as local
            </p>

            {filteredProviders.length > 0 ? (
              <>
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
                    <th className="w-8 py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviders.map((p, idx) => {
                    const payoffColor =
                      p.payoffMonths < 3 ? 'text-green-400' :
                      p.payoffMonths < 6 ? 'text-emerald-400' :
                      p.payoffMonths < 12 ? 'text-yellow-400' :
                      p.payoffMonths < 24 ? 'text-orange-400' : 'text-red-400';

                    return (
                      <tr key={`${p.provider}-${p.gpus}`} className={`border-b border-gray-800/50 ${idx === 0 ? 'bg-blue-900/10' : ''}`}>
                        <td className="py-3 px-3">
                          {/* ANS-517: Link to provider pricing page */}
                          <a
                            href={cloudProviders.sources?.[p.provider]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-white hover:text-blue-400 transition-colors"
                          >
                            {p.provider}
                          </a>
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
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setCloudGPUFilters(prev => ({ ...prev, [p.provider]: false }))}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            title="Remove from comparison"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
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
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                No cloud providers selected. Use the dropdown above to select providers to compare.
              </div>
            )}
          </div>
        )}

        {/* API Provider Comparison */}
        {calculations.canRun && calculations.apiProviders.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">API Provider Comparison</h2>
              <MultiSelectDropdown
                options={Object.keys(ossAPIFilters).map(name => ({ id: name, name }))}
                selected={ossAPIFilters}
                onChange={setOssAPIFilters}
                getKey={(p) => p.id}
                getLabel={(p) => p.name}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Pay-per-token pricing for workload — {formatTokens(calculations.tokensPerDay)} tokens/day
            </p>

            {filteredApiProviders.length > 0 ? (
              <>
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
                        <th className="w-8 py-3 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApiProviders.map((api, idx) => {
                        const payoffColor =
                          api.payoffMonths < 3 ? 'text-green-400' :
                          api.payoffMonths < 6 ? 'text-emerald-400' :
                          api.payoffMonths < 12 ? 'text-yellow-400' :
                          api.payoffMonths < 24 ? 'text-orange-400' : 'text-red-400';
                        const hasBreakdown = api.modelBreakdown && api.modelBreakdown.length > 1;

                        return (
                          <React.Fragment key={api.name}>
                            <tr className={`border-b border-gray-800/50 ${idx === 0 ? 'bg-purple-900/10' : ''}`}>
                              <td className="py-3 px-3">
                                {/* ANS-517: Link to provider pricing page */}
                                <a
                                  href={apiProviders.sources?.[api.name]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-white hover:text-blue-400 transition-colors"
                                >
                                  {api.name}
                                </a>
                                {/* ANS-515: Show model breakdown inline for multi-model workloads */}
                                {hasBreakdown && (
                                  <div className="mt-1 text-xs text-gray-500">
                                    {api.modelBreakdown.map((m, i) => (
                                      <span key={m.modelId}>
                                        {m.modelId}: ${m.dailyCost.toFixed(2)} ({m.percentage.toFixed(0)}%)
                                        {i < api.modelBreakdown.length - 1 ? ' + ' : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="text-right py-3 px-2 font-mono text-gray-400">
                                ${api.inputPer1M.toFixed(2)}
                              </td>
                              <td className="text-right py-3 px-2 font-mono text-gray-400">
                                ${api.outputPer1M.toFixed(2)}
                              </td>
                              <td className="text-right py-3 px-2 bg-purple-900/10 font-mono text-purple-400">
                                ${api.blendedPer1M.toFixed(2)}
                                {hasBreakdown && <span className="text-xs text-gray-500 block">avg</span>}
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
                              <td className="py-3 px-2">
                                <button
                                  onClick={() => setOssAPIFilters(prev => ({ ...prev, [api.name]: false }))}
                                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                  title="Remove from comparison"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 bg-purple-900/20 border border-purple-800/30 rounded-lg p-4">
                  <div className="font-medium text-purple-300 mb-1">API vs GPU Rental vs Local</div>
                  <div className="text-purple-200/70 text-sm">
                    {filteredApiProviders[0] && cheapest && (
                      <>
                        <strong>Cheapest API:</strong> {filteredApiProviders[0].name} @ ${filteredApiProviders[0].dailyCost.toFixed(2)}/day
                        ({formatPayoff(filteredApiProviders[0].payoffMonths)} payoff) —
                        {filteredApiProviders[0].dailyCost < cheapest.dailyCost
                          ? ` ${((cheapest.dailyCost / filteredApiProviders[0].dailyCost - 1) * 100).toFixed(0)}% cheaper than GPU rental`
                          : ` ${((filteredApiProviders[0].dailyCost / cheapest.dailyCost - 1) * 100).toFixed(0)}% more expensive than GPU rental`
                        }
                      </>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                No API providers selected. Use the dropdown above to select providers to compare.
              </div>
            )}
          </div>
        )}

        {/* Proprietary API Alternatives */}
        {calculations.canRun && calculations.proprietaryAlternatives?.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Proprietary API Alternatives</h2>
              <MultiSelectDropdown
                options={calculations.proprietaryAlternatives || []}
                selected={proprietaryModelFilters}
                onChange={setProprietaryModelFilters}
                getKey={(p) => p.name}
                getLabel={(p) => p.name}
                getDetail={(p) => p.provider}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Commercial API models — {formatTokens(calculations.tokensPerDay)} tokens/day
            </p>

            {filteredProprietaryAlternatives.length > 0 ? (
              <>
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
                        <th className="w-8 py-3 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProprietaryAlternatives.map((api, idx) => {
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
                            <td className="py-3 px-2">
                              <button
                                onClick={() => setProprietaryModelFilters(prev => ({ ...prev, [api.name]: false }))}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                title="Remove from comparison"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
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
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-900/50 rounded-lg border border-gray-800">
                No proprietary models selected. Use the dropdown above to select models to compare.
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        {calculations.canRun && (filteredProviders.length > 0 || filteredApiProviders.length > 0 || filteredProprietaryAlternatives.length > 0) && (
          <div className="mt-6 bg-blue-900/20 border border-blue-800/50 rounded-xl p-5">
              <h3 className="font-semibold text-blue-300 mb-3">Bottom Line</h3>
              <div className="space-y-2 text-sm text-blue-200/80">
                <p>
                  Running <strong>{workload.length} model{workload.length > 1 ? 's' : ''}</strong> for <strong>{dailyHours}h/day</strong> on <strong>{calculations.localName}</strong>:
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
                  {filteredApiProviders[0] && (
                    <div className="bg-black/20 rounded-lg p-3">
                      <div className="text-purple-400 font-medium mb-1">API ({filteredApiProviders[0].name})</div>
                      <div>${filteredApiProviders[0].blendedPer1M.toFixed(2)}/1M tokens</div>
                      <div>${filteredApiProviders[0].dailyCost.toFixed(2)}/day = ${filteredApiProviders[0].monthlyCost.toFixed(0)}/mo</div>
                    </div>
                  )}
                </div>

                {/* Determine best option */}
                {(() => {
                  const cheapestApi = filteredApiProviders[0];
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
        )}

        {!calculations.canRun && (
          <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-5">
            <h3 className="font-semibold text-red-300 mb-2">Cannot Run Workload</h3>
            <p className="text-sm text-red-200/70">
              {calculations.memoryInfo?.deficit > 0
                ? `This workload requires ${calculations.memoryInfo?.totalRAM}GB RAM but only ${calculations.memoryInfo?.availableRAM}GB available. Reduce workload or increase RAM.`
                : calculations.memoryInfo?.incompatibleModels?.length > 0
                  ? `Some models not compatible with ${selectedHardware === 'spark' ? 'DGX Spark' : 'this hardware'}: ${calculations.memoryInfo.incompatibleModels.join(', ')}`
                  : `Cannot run this workload on ${selectedHardware === 'mac' ? 'Mac Studio' : 'DGX Spark'}. Try adjusting the configuration.`
              }
            </p>
          </div>
        )}

        {/* ANS-517: Footer with Data Sources & Methodology */}
        <div className="mt-4 bg-gray-900/50 rounded-xl p-5 border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Data Sources & Methodology</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
            {/* Calculation Methodology */}
            <div>
              <h4 className="text-gray-400 font-medium mb-2">How We Calculate</h4>
              <ul className="space-y-1.5">
                <li><strong className="text-gray-400">Payoff:</strong> Hardware cost ÷ daily cloud savings = days to break even</li>
                <li><strong className="text-gray-400">Cloud hours:</strong> Adjusted to match local token output using throughput ratios</li>
                <li><strong className="text-gray-400">API costs:</strong> 50% input + 50% output tokens (blended rate)</li>
                <li><strong className="text-gray-400">Memory:</strong> Model weights + KV cache overhead; training modes add optimizer states</li>
              </ul>
            </div>

            {/* Data Sources */}
            <div>
              <h4 className="text-gray-400 font-medium mb-2">Data Sources</h4>
              <ul className="space-y-1.5">
                <li>
                  <strong className="text-gray-400">Benchmarks:</strong>{' '}
                  {models.sources.slice(0, 3).map((s, i) => (
                    <span key={s.id}>
                      <a href={s.url} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                        {s.name}
                      </a>
                      {i < 2 && ', '}
                    </span>
                  ))}
                  {models.sources.length > 3 && ` +${models.sources.length - 3} more`}
                </li>
                <li>
                  <strong className="text-gray-400">GPU rental:</strong>{' '}
                  {cloudProviders.providers.slice(0, 3).map((p, i) => (
                    <span key={p.id}>
                      <a href={cloudProviders.sources?.[p.name]} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                        {p.name}
                      </a>
                      {i < 2 && ', '}
                    </span>
                  ))}
                  {cloudProviders.providers.length > 3 && ` +${cloudProviders.providers.length - 3} more`}
                </li>
                <li>
                  <strong className="text-gray-400">API pricing:</strong>{' '}
                  {Object.keys(apiProviders.sources || {}).slice(0, 4).map((name, i, arr) => (
                    <span key={name}>
                      <a href={apiProviders.sources[name]} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">
                        {name}
                      </a>
                      {i < arr.length - 1 && ', '}
                    </span>
                  ))}
                  {Object.keys(apiProviders.sources || {}).length > 4 && ` +${Object.keys(apiProviders.sources).length - 4} more`}
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-600">
            <strong className="text-gray-500">Last updated:</strong> {apiProviders.updatedAt} •{' '}
            <strong className="text-gray-500">Mac prices:</strong> CAD converted at {cadToUsd} USD •{' '}
            <strong className="text-gray-500">GPU type:</strong> {cloudProviders.gpuType}
          </div>
        </div>
      </div>
    </div>
  );
}
