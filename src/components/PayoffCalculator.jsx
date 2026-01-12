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
        className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border  text-sm text-foreground hover:bg-muted hover:border-border transition-colors"
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
        <div className="absolute right-0 z-20 mt-1 w-56 bg-muted  shadow-xl border border-border overflow-hidden">
          {/* All/Clear buttons */}
          <div className="flex gap-2 p-2 border-b border-border bg-secondary">
            <button
              onClick={selectAll}
              className="flex-1 px-2 py-1 text-xs font-medium text-accent bg-accent/10 rounded hover:bg-accent/20 transition-colors"
            >
              All
            </button>
            <button
              onClick={clearAll}
              className="flex-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded hover:bg-border transition-colors"
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
                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selected[key] !== false}
                    onChange={() => toggleOption(key)}
                    className="rounded border-border bg-secondary text-accent focus:ring-accent focus:ring-offset-0"
                  />
                  <span className="text-sm text-foreground">{getLabel(opt)}</span>
                  {detail && <span className="text-xs text-muted-foreground ml-auto">{detail}</span>}
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
  TRAINING_CATEGORIES,
} from '../lib/calculations.js';

import trainingProviders from '../data/training-providers.json';

const developerList = getDeveloperList(models);
const ramOptions = Object.keys(hardware.mac.configs).map(Number);
const cadToUsd = hardware.cadToUsd;

export default function PayoffCalculator() {
  const [dailyHours, setDailyHours] = useState(12);
  const [macRAM, setMacRAM] = useState(512);
  const [selectedHardware, setSelectedHardware] = useState('mac');
  // ANS-514: Training mode with category/variant selection
  const [trainingCategory, setTrainingCategory] = useState('inference');
  const [trainingMode, setTrainingMode] = useState('inference');

  // Helper to check if we're in training mode (not inference)
  const isTrainingMode = trainingMode !== 'inference';

  // Workload state (ANS-504) - array of models to run
  const [workload, setWorkload] = useState(() => [
    {
      id: crypto.randomUUID(),
      developerId: 'openai',
      modelId: 'gpt-oss-120b',
      quantity: 4,
    },
    {
      id: crypto.randomUUID(),
      developerId: 'openai',
      modelId: 'gpt-oss-20b',
      quantity: 8,
    },
  ]);

  // Provider filter state (ANS-511) - multi-select dropdowns in section headers
  const [cloudGPUFilters, setCloudGPUFilters] = useState(() =>
    Object.fromEntries(cloudProviders.providers.map(p => [p.id, true]))
  );
  const [ossAPIFilters, setOssAPIFilters] = useState({
    Groq: true, Together: true, Fireworks: true, DeepInfra: true,
    Cerebras: true, OpenAI: true, Moonshot: true, 'Amazon Bedrock': true
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

  const cheapest = filteredProviders[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* ANS-517: Header with data freshness indicator */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2 text-foreground font-headline">Hardware vs. Cloud Payoff Calculator</h1>
            <p className="text-muted-foreground">
              Using real benchmark data — cloud hours adjusted to match your local token output
            </p>
          </div>
          <div className="mt-3 md:mt-0 flex items-center gap-2 bg-secondary px-3 py-2 border border-border">
            <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-muted-foreground">
              Data updated: <span className="text-foreground font-medium">{apiProviders.updatedAt}</span>
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          {/* Hardware Selection */}
          <div className="bg-secondary p-4 border border-border">
            <label className="block text-sm font-medium text-muted-foreground mb-3">Hardware</label>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedHardware('mac')}
                className={`w-full text-left p-3 transition-all border ${
                  selectedHardware === 'mac'
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-muted text-foreground hover:bg-border border-border'
                }`}
              >
                <div className="font-medium">{hardware.mac.name}</div>
                <div className="text-sm opacity-75">Up to 512GB unified</div>
              </button>
              <button
                onClick={() => setSelectedHardware('spark')}
                className={`w-full text-left p-3 transition-all border ${
                  selectedHardware === 'spark'
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-muted text-foreground hover:bg-border border-border'
                }`}
              >
                <div className="font-medium">{hardware.dgxSpark.name}</div>
                <div className="text-sm opacity-75">${hardware.dgxSpark.priceUSD.toLocaleString()} • {hardware.dgxSpark.memory}GB</div>
              </button>
            </div>
          </div>

          {/* Mac RAM Slider */}
          <div className="bg-secondary p-4 border border-border">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              {selectedHardware === 'mac' ? (
                <>Mac RAM: <span className="text-foreground font-bold">{macRAM}GB</span></>
              ) : (
                <>DGX Spark: <span className="text-foreground font-bold">{hardware.dgxSpark.memory}GB</span> (fixed)</>
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
                  className="w-full h-2 bg-muted  appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  {ramOptions.map(r => <span key={r}>{r}</span>)}
                </div>
                <div className="mt-2 text-sm text-success">
                  ${(hardware.mac.configs[macRAM].priceCAD * cadToUsd).toLocaleString(undefined, {maximumFractionDigits: 0})} USD
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground mt-4">
                Fixed {hardware.dgxSpark.memory}GB unified memory<br/>
                {hardware.dgxSpark.bandwidth} GB/s bandwidth
              </div>
            )}
          </div>

          {/* Workload Builder (ANS-504) - spans 2 columns */}
          <div className="bg-secondary p-4 border border-border lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-muted-foreground">Workload</label>
              <button
                onClick={addModelToWorkload}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-accent bg-accent/10 hover:bg-accent/20 transition-colors"
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
                  <div key={entry.id} className="flex items-center gap-2 p-2 bg-muted/50 border border-border">
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
                      className="bg-card border border-border px-2 py-1 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      {developerList.map(dev => (
                        <option key={dev.id} value={dev.id}>{dev.name.split(' ')[0]}</option>
                      ))}
                    </select>

                    {/* Model dropdown */}
                    <select
                      value={entry.modelId}
                      onChange={(e) => updateWorkloadEntry(entry.id, { modelId: e.target.value })}
                      className="flex-1 bg-card border border-border px-2 py-1 text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-accent"
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
                      <span className="text-xs text-muted-foreground">×</span>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={entry.quantity}
                        onChange={(e) => updateWorkloadEntry(entry.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 bg-card border border-border px-2 py-1 text-foreground text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    {/* RAM indicator */}
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {currentModel ? currentModel.minRAM * entry.quantity : 0}GB
                    </span>

                    {/* Remove button */}
                    <button
                      onClick={() => removeFromWorkload(entry.id)}
                      disabled={workload.length <= 1}
                      className={`p-1 transition-colors ${
                        workload.length <= 1
                          ? 'text-border cursor-not-allowed'
                          : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
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
                <span className="text-muted-foreground">Memory Usage</span>
                <span className={memoryInfo.canFit ? 'text-success' : 'text-destructive'}>
                  {memoryInfo.totalRAM}GB / {memoryInfo.availableMemory}GB
                  {memoryInfo.canFit ? ' ✓' : ` (${memoryInfo.totalRAM - memoryInfo.availableMemory}GB over)`}
                </span>
              </div>
              <div className="h-2 bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    memoryInfo.percentage > 100 ? 'bg-destructive' :
                    memoryInfo.percentage > 80 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${Math.min(memoryInfo.percentage, 100)}%` }}
                />
              </div>
              {/* Memory breakdown tooltip */}
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                {memoryInfo.breakdown.map((b, i) => (
                  <span key={i} className="bg-muted px-1.5 py-0.5">
                    {b.name}: {b.subtotal}GB{b.quantity > 1 ? ` (×${b.quantity})` : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Hours */}
          <div className="bg-secondary p-4 border border-border">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Usage: <span className="text-foreground font-bold">{dailyHours}h/day</span>
            </label>
            <input
              type="range"
              min="1"
              max="24"
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="w-full h-2 bg-muted  appearance-none cursor-pointer accent-accent"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1h</span>
              <span>12h</span>
              <span>24h</span>
            </div>
          </div>

          {/* ANS-514: Training Mode Selector with Category/Variant */}
          <div className="bg-secondary p-4 border border-border lg:col-span-2">
            <label className="block text-sm font-medium text-muted-foreground mb-3">
              Mode: <span className="text-foreground font-bold">{memoryInfo.trainingMode}</span>
              {isTrainingMode && (
                <span className="ml-2 text-warning text-xs">({TRAINING_MODES[trainingMode]?.multiplier}× RAM)</span>
              )}
            </label>

            {/* Category selector */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.entries(TRAINING_CATEGORIES).map(([catKey, cat]) => (
                <button
                  key={catKey}
                  onClick={() => {
                    setTrainingCategory(catKey);
                    // Auto-select first variant when changing category
                    setTrainingMode(cat.variants[0]);
                  }}
                  className={`px-3 py-1.5 text-sm font-medium transition-all ${
                    trainingCategory === catKey
                      ? catKey === 'inference'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-warning text-warning-foreground'
                      : 'bg-muted text-foreground hover:bg-border'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Variant selector (only show if category has multiple variants) */}
            {TRAINING_CATEGORIES[trainingCategory]?.variants.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {TRAINING_CATEGORIES[trainingCategory].variants.map((variantKey) => {
                  const variant = TRAINING_MODES[variantKey];
                  return (
                    <button
                      key={variantKey}
                      onClick={() => setTrainingMode(variantKey)}
                      className={`px-3 py-1.5 text-xs transition-all ${
                        trainingMode === variantKey
                          ? 'bg-foreground text-background ring-2 ring-warning'
                          : 'bg-muted text-muted-foreground hover:bg-border'
                      }`}
                    >
                      {variant.name.replace(`${TRAINING_CATEGORIES[trainingCategory].name} `, '')}
                      <span className="text-muted-foreground ml-1">({variant.multiplier}×)</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Description */}
            <div className={`text-xs p-2 ${
              isTrainingMode
                ? 'text-warning bg-warning/10'
                : 'text-muted-foreground bg-muted/50'
            }`}>
              {isTrainingMode ? (
                <>
                  <strong>Training mode:</strong> {TRAINING_MODES[trainingMode]?.description}
                  <br />
                  <span className="text-warning">
                    Memory includes: weights + gradients + optimizer states + activations
                  </span>
                </>
              ) : (
                <>
                  <strong>Inference mode:</strong> {TRAINING_MODES[trainingMode]?.description}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Workload Summary */}
        {calculations.canRun && (
          <div className="bg-secondary p-4 mb-6 border border-border">
            <div className="text-sm text-muted-foreground mb-2">
              Daily workload:{' '}
              <span className="text-foreground font-medium">
                {calculations.workloadSummary?.length > 1
                  ? `${calculations.workloadSummary.length} models`
                  : calculations.workloadSummary?.[0]?.name || 'Unknown'}
              </span>
              {calculations.workloadSummary?.length > 1 && (
                <span className="text-muted-foreground">
                  {' '}({calculations.workloadSummary.map(w =>
                    `${w.quantity > 1 ? w.quantity + '× ' : ''}${w.name}`
                  ).join(', ')})
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-foreground">{dailyHours}h × {calculations.localTPS} tok/s</div>
                <div className="text-xs text-muted-foreground">runtime × combined throughput</div>
              </div>
              <div className="text-xl text-muted-foreground">=</div>
              <div className="text-center">
                <div className="text-xl font-bold text-accent">{formatTokens(calculations.tokensPerDay)}</div>
                <div className="text-xs text-muted-foreground">tokens/day</div>
              </div>
            </div>
          </div>
        )}

        {/* Local Hardware Card */}
        <div className={`p-5 border mb-6 ${
          calculations.canRun
            ? 'bg-success/10 border-success/30'
            : 'bg-destructive/10 border-destructive/30'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{calculations.localName}</h2>
              <div className="text-sm text-muted-foreground">
                {calculations.memory}GB • {calculations.bandwidth} GB/s bandwidth
              </div>
            </div>
            <div className="flex gap-6 items-center">
              {calculations.canRun ? (
                <>
                  <div className="text-center">
                    <div className="text-xl font-bold text-accent">{calculations.localTPS} tok/s</div>
                    <div className="text-xs text-muted-foreground">throughput</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-success">
                      ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </div>
                    <div className="text-xs text-muted-foreground">USD</div>
                  </div>
                </>
              ) : (
                <div className="text-destructive">
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
              <h2 className="text-lg font-semibold text-foreground">Cloud Alternatives</h2>
              <MultiSelectDropdown
                options={cloudProviders.providers}
                selected={cloudGPUFilters}
                onChange={setCloudGPUFilters}
                getKey={(p) => p.id}
                getLabel={(p) => p.name}
                getDetail={(p) => `$${p.ratePerGPUHour}/hr`}
              />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Hours adjusted to produce {formatTokens(calculations.tokensPerDay)} tokens/day — same as local
            </p>

            {filteredProviders.length > 0 ? (
              <>
                <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b-2 border-foreground">
                    <th className="text-left py-3 px-3">Provider</th>
                    <th className="text-center py-3 px-2">GPUs</th>
                    <th className="text-center py-3 px-2">Cloud tok/s</th>
                    <th className="text-center py-3 px-2">Speedup</th>
                    <th className="text-center py-3 px-2 bg-warning/10">Hrs needed</th>
                    <th className="text-right py-3 px-2">$/hr</th>
                    <th className="text-right py-3 px-2 bg-destructive/10">$/day</th>
                    <th className="text-right py-3 px-2">$/mo</th>
                    <th className="text-right py-3 px-3 bg-success/10">Payoff</th>
                    <th className="w-8 py-3 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviders.map((p, idx) => {
                    const payoffColor =
                      p.payoffMonths < 3 ? 'text-success' :
                      p.payoffMonths < 6 ? 'text-success' :
                      p.payoffMonths < 12 ? 'text-warning' :
                      p.payoffMonths < 24 ? 'text-warning' : 'text-destructive';

                    return (
                      <tr key={`${p.provider}-${p.gpus}`} className={`border-b border-border ${idx === 0 ? 'bg-accent/5' : ''} ${idx % 2 === 0 ? 'bg-secondary/30' : ''}`}>
                        <td className="py-3 px-3">
                          {/* ANS-517: Link to provider pricing page */}
                          <a
                            href={cloudProviders.sources?.[p.provider]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-accent transition-colors"
                          >
                            {p.provider}
                          </a>
                          <div className="text-xs text-muted-foreground">${p.hourlyRatePerGPU}/GPU/hr</div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className={`font-mono ${p.gpus > 1 ? 'text-warning' : 'text-foreground'}`}>
                            {p.gpus}× H100
                          </span>
                        </td>
                        <td className="text-center py-3 px-2 text-foreground">
                          {p.cloudTPS}
                        </td>
                        <td className="text-center py-3 px-2 text-muted-foreground">
                          {p.speedRatio.toFixed(1)}×
                        </td>
                        <td className="text-center py-3 px-2 bg-warning/10 font-mono text-warning">
                          {formatHours(p.cloudHoursNeeded)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                          ${p.hourlyRateTotal.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 bg-destructive/10 font-mono text-destructive">
                          ${p.dailyCost.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-destructive">
                          ${p.monthlyCost.toFixed(0)}
                        </td>
                        <td className={`text-right py-3 px-3 bg-success/10 font-bold ${payoffColor}`}>
                          {formatPayoff(p.payoffMonths)}
                        </td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => setCloudGPUFilters(prev => ({ ...prev, [p.provider]: false }))}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
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
              <div className="bg-warning/10 border border-warning/30 p-4">
                <div className="font-medium text-warning mb-1">Hrs needed</div>
                <div className="text-foreground/70">
                  Cloud is {cheapest?.speedRatio.toFixed(1)}× faster, so you only need {formatHours(cheapest?.cloudHoursNeeded)}
                  to match {dailyHours}h of local output.
                </div>
              </div>
              <div className="bg-destructive/10 border border-destructive/30 p-4">
                <div className="font-medium text-destructive mb-1">$/day</div>
                <div className="text-foreground/70">
                  {formatHours(cheapest?.cloudHoursNeeded)} × ${cheapest?.hourlyRateTotal.toFixed(2)}/hr
                  = ${cheapest?.dailyCost.toFixed(2)}/day for equivalent work.
                </div>
              </div>
              <div className="bg-success/10 border border-success/30 p-4">
                <div className="font-medium text-success mb-1">Payoff</div>
                <div className="text-foreground/70">
                  ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})} ÷
                  ${cheapest?.dailyCost.toFixed(2)}/day = {cheapest?.payoffDays} days to break even.
                </div>
              </div>
            </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-secondary/50 border border-border">
                No cloud providers selected. Use the dropdown above to select providers to compare.
              </div>
            )}
          </div>
        )}

        {/* API Provider Comparison - Only shown in inference mode */}
        {calculations.canRun && calculations.apiProviders.length > 0 && !isTrainingMode && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground">API Provider Comparison</h2>
              <MultiSelectDropdown
                options={Object.keys(ossAPIFilters).map(name => ({ id: name, name }))}
                selected={ossAPIFilters}
                onChange={setOssAPIFilters}
                getKey={(p) => p.id}
                getLabel={(p) => p.name}
              />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Pay-per-token pricing for workload — {formatTokens(calculations.tokensPerDay)} tokens/day
            </p>

            {filteredApiProviders.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground border-b-2 border-foreground">
                        <th className="text-left py-3 px-3">Provider</th>
                        <th className="text-right py-3 px-2">Input $/1M</th>
                        <th className="text-right py-3 px-2">Output $/1M</th>
                        <th className="text-right py-3 px-2 bg-accent/10">Blended $/1M</th>
                        <th className="text-right py-3 px-2 bg-destructive/10">$/day</th>
                        <th className="text-right py-3 px-2">$/mo</th>
                        <th className="text-right py-3 px-3 bg-success/10">Payoff</th>
                        <th className="w-8 py-3 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApiProviders.map((api, idx) => {
                        const payoffColor =
                          api.payoffMonths < 3 ? 'text-success' :
                          api.payoffMonths < 6 ? 'text-success' :
                          api.payoffMonths < 12 ? 'text-warning' :
                          api.payoffMonths < 24 ? 'text-warning' : 'text-destructive';
                        // ANS-515: Show per-model breakdown for multi-model workloads
                        const showBreakdown = api.details && api.details.length > 1;

                        return (
                          <tr key={api.name} className={`border-b border-border ${idx === 0 ? 'bg-accent/5' : ''} ${idx % 2 === 0 ? 'bg-secondary/30' : ''}`}>
                            <td className="py-3 px-3">
                              {/* ANS-517: Link to provider pricing page */}
                              <a
                                href={apiProviders.sources?.[api.name]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground hover:text-accent transition-colors"
                              >
                                {api.name}
                              </a>
                              {/* ANS-515: Show model breakdown inline for multi-model workloads */}
                              {showBreakdown && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {api.details.map((d, i) => (
                                    <span key={d.modelId}>
                                      {d.quantity > 1 ? `${d.quantity}× ` : ''}{d.modelName}: ${d.blendedPer1M.toFixed(2)}/1M
                                      {i < api.details.length - 1 ? ' • ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                              ${api.inputPer1M.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                              ${api.outputPer1M.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 bg-accent/10 font-mono text-accent">
                              ${api.blendedPer1M.toFixed(2)}
                              {showBreakdown && <span className="text-xs text-muted-foreground block">weighted</span>}
                            </td>
                            <td className="text-right py-3 px-2 bg-destructive/10 font-mono text-destructive">
                              ${api.dailyCost.toFixed(2)}
                            </td>
                            <td className="text-right py-3 px-2 font-mono text-destructive">
                              ${api.monthlyCost.toFixed(0)}
                            </td>
                            <td className={`text-right py-3 px-3 bg-success/10 font-bold ${payoffColor}`}>
                              {formatPayoff(api.payoffMonths)}
                            </td>
                            <td className="py-3 px-2">
                              <button
                                onClick={() => setOssAPIFilters(prev => ({ ...prev, [api.name]: false }))}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1"
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

                <div className="mt-4 bg-accent/10 border border-accent/30 p-4">
                  <div className="font-medium text-accent mb-1">API vs GPU Rental vs Local</div>
                  <div className="text-foreground/70 text-sm">
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
              <div className="text-center py-8 text-muted-foreground bg-secondary/50 border border-border">
                No API providers selected. Use the dropdown above to select providers to compare.
              </div>
            )}
          </div>
        )}

        {/* Training Providers - Only shown in training mode */}
        {calculations.canRun && isTrainingMode && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground">Training Providers</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Cloud GPU platforms for {TRAINING_MODES[trainingMode]?.name} workloads
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-3 px-3">Provider</th>
                    <th className="text-center py-3 px-2">GPU</th>
                    <th className="text-right py-3 px-2">$/hr</th>
                    <th className="text-right py-3 px-2 bg-red-900/20">$/day</th>
                    <th className="text-right py-3 px-2">$/mo</th>
                    <th className="text-right py-3 px-3 bg-green-900/20">Payoff</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingProviders.providers.map((provider, idx) => {
                    // Calculate costs based on daily hours and GPU requirements
                    const gpusNeeded = Math.ceil(
                      calculations.workloadSummary?.reduce((sum, w) => {
                        const model = getModel(models, workload.find(e => e.modelId === w.modelId)?.developerId, w.modelId);
                        return sum + (model?.cloudGPUs || 1) * w.quantity;
                      }, 0) || 1
                    );
                    const dailyCost = provider.ratePerGPUHour * gpusNeeded * dailyHours;
                    const monthlyCost = dailyCost * 30;
                    const payoffDays = calculations.localPrice / dailyCost;
                    const payoffMonths = payoffDays / 30;

                    const payoffColor =
                      payoffMonths < 3 ? 'text-success' :
                      payoffMonths < 6 ? 'text-success' :
                      payoffMonths < 12 ? 'text-warning' :
                      payoffMonths < 24 ? 'text-warning' : 'text-destructive';

                    return (
                      <tr key={provider.id} className={`border-b border-border/50 ${idx === 0 ? 'bg-orange-900/10' : ''}`}>
                        <td className="py-3 px-3">
                          <a
                            href={provider.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-accent transition-colors"
                          >
                            {provider.name}
                          </a>
                          <div className="text-xs text-muted-foreground mt-1">
                            {provider.description}
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className={`font-mono ${gpusNeeded > 1 ? 'text-warning' : 'text-foreground'}`}>
                            {gpusNeeded}× {provider.gpuType}
                          </span>
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                          ${(provider.ratePerGPUHour * gpusNeeded).toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 bg-red-900/10 font-mono text-destructive">
                          ${dailyCost.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-destructive">
                          ${monthlyCost.toFixed(0)}
                        </td>
                        <td className={`text-right py-3 px-3 bg-green-900/10 font-bold ${payoffColor}`}>
                          {formatPayoff(payoffMonths)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 bg-warning/10 border border-warning/30  p-4">
              <div className="font-medium text-warning mb-1">Training vs Inference Providers</div>
              <div className="text-warning/80/70 text-sm">
                Training providers like <strong>Prime Intellect</strong> offer specialized RL/fine-tuning infrastructure
                including distributed training frameworks, environment libraries, and optimized training stacks.
                {trainingProviders.providers[0] && (
                  <> Cheapest option: {trainingProviders.providers[0].name} @ ${trainingProviders.providers[0].ratePerGPUHour}/GPU-hr</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Proprietary API Alternatives - Provider Stacks - Only shown in inference mode */}
        {calculations.canRun && calculations.proprietaryAlternatives?.length > 0 && !isTrainingMode && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-foreground">Proprietary API Alternatives</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Equivalent workload using each provider's comparable models — {formatTokens(calculations.tokensPerDay)} tokens/day
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
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
                  {calculations.proprietaryAlternatives.map((stack, idx) => {
                    const payoffColor =
                      stack.payoffMonths < 3 ? 'text-success' :
                      stack.payoffMonths < 6 ? 'text-success' :
                      stack.payoffMonths < 12 ? 'text-warning' :
                      stack.payoffMonths < 24 ? 'text-warning' : 'text-destructive';
                    const showBreakdown = stack.breakdown && stack.breakdown.length > 1;

                    return (
                      <tr key={stack.provider} className={`border-b border-border/50 ${idx === 0 ? 'bg-accent/5' : ''}`}>
                        <td className="py-3 px-3">
                          <a
                            href={apiProviders.sources?.[stack.provider]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground hover:text-accent transition-colors"
                          >
                            {stack.provider}
                          </a>
                          {/* Tier breakdown */}
                          <div className="text-xs text-muted-foreground mt-1">
                            {stack.breakdown.map((b, i) => (
                              <span key={b.tier}>
                                {b.model}: ${b.blendedPer1M.toFixed(2)}/1M
                                {i < stack.breakdown.length - 1 ? ' • ' : ''}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                          ${stack.inputPer1M.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-muted-foreground">
                          ${stack.outputPer1M.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 bg-purple-900/10 font-mono text-accent">
                          ${stack.blendedPer1M.toFixed(2)}
                          {showBreakdown && <span className="text-xs text-muted-foreground block">weighted</span>}
                        </td>
                        <td className="text-right py-3 px-2 bg-red-900/10 font-mono text-destructive">
                          ${stack.dailyCost.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-2 font-mono text-destructive">
                          ${stack.monthlyCost.toFixed(0)}
                        </td>
                        <td className={`text-right py-3 px-3 bg-green-900/10 font-bold ${payoffColor}`}>
                          {formatPayoff(stack.payoffMonths)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 bg-accent/10 border border-accent/30  p-4">
              <div className="font-medium text-accent mb-1">How this works</div>
              <div className="text-accent/80/70 text-sm">
                Each row shows what it would cost to run your exact workload using that provider's comparable models.
                {calculations.proprietaryAlternatives[0]?.breakdown?.length > 1 && (
                  <> Your workload spans {calculations.proprietaryAlternatives[0].breakdown.length} tiers, so each provider uses multiple models.</>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {calculations.canRun && (filteredProviders.length > 0 || filteredApiProviders.length > 0 || calculations.proprietaryAlternatives?.length > 0 || isTrainingMode) && (
          <div className={`mt-6  p-5 ${isTrainingMode ? 'bg-warning/10 border border-warning/50' : 'bg-accent/10 border border-accent/50'}`}>
              <h3 className={`font-semibold mb-3 ${isTrainingMode ? 'text-warning' : 'text-accent'}`}>
                Bottom Line {isTrainingMode && `(${TRAINING_MODES[trainingMode]?.name})`}
              </h3>
              <div className={`space-y-2 text-sm ${isTrainingMode ? 'text-warning/80/80' : 'text-accent/80/80'}`}>
                <p>
                  {isTrainingMode ? 'Training' : 'Running'} <strong>{workload.length} model{workload.length > 1 ? 's' : ''}</strong> for <strong>{dailyHours}h/day</strong> on <strong>{calculations.localName}</strong>:
                </p>
                <div className={`grid grid-cols-1 ${isTrainingMode ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4 mt-3`}>
                  <div className="bg-black/20  p-3">
                    <div className="text-success font-medium mb-1">Local Hardware</div>
                    {isTrainingMode ? (
                      <>
                        <div>{memoryInfo.totalRAM}GB RAM ({TRAINING_MODES[trainingMode]?.multiplier}× inference)</div>
                        <div>One-time: ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                      </>
                    ) : (
                      <>
                        <div>{dailyHours}h/day @ {calculations.localTPS} tok/s</div>
                        <div>One-time: ${calculations.localPrice.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                      </>
                    )}
                  </div>
                  {isTrainingMode ? (
                    // Training mode: show training provider comparison
                    <div className="bg-black/20  p-3">
                      <div className="text-warning font-medium mb-1">
                        Training Provider ({trainingProviders.providers[0]?.name})
                      </div>
                      {(() => {
                        const gpusNeeded = Math.ceil(
                          calculations.workloadSummary?.reduce((sum, w) => {
                            const model = getModel(models, workload.find(e => e.modelId === w.modelId)?.developerId, w.modelId);
                            return sum + (model?.cloudGPUs || 1) * w.quantity;
                          }, 0) || 1
                        );
                        const provider = trainingProviders.providers[0];
                        const dailyCost = provider?.ratePerGPUHour * gpusNeeded * dailyHours || 0;
                        return (
                          <>
                            <div>{gpusNeeded}× {provider?.gpuType} @ ${provider?.ratePerGPUHour}/hr</div>
                            <div>${dailyCost.toFixed(2)}/day = ${(dailyCost * 30).toFixed(0)}/mo</div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    // Inference mode: show GPU rental and API
                    <>
                      <div className="bg-black/20  p-3">
                        <div className="text-warning font-medium mb-1">GPU Rental ({cheapest?.provider})</div>
                        <div>{formatHours(cheapest?.cloudHoursNeeded)}/day @ {cheapest?.cloudTPS} tok/s</div>
                        <div>${cheapest?.dailyCost.toFixed(2)}/day = ${cheapest?.monthlyCost.toFixed(0)}/mo</div>
                      </div>
                      {filteredApiProviders[0] && (
                        <div className="bg-black/20  p-3">
                          <div className="text-accent font-medium mb-1">API ({filteredApiProviders[0].name})</div>
                          <div>${filteredApiProviders[0].blendedPer1M.toFixed(2)}/1M tokens</div>
                          <div>${filteredApiProviders[0].dailyCost.toFixed(2)}/day = ${filteredApiProviders[0].monthlyCost.toFixed(0)}/mo</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Determine best option */}
                {(() => {
                  if (isTrainingMode) {
                    // Training mode payoff calculation
                    const gpusNeeded = Math.ceil(
                      calculations.workloadSummary?.reduce((sum, w) => {
                        const model = getModel(models, workload.find(e => e.modelId === w.modelId)?.developerId, w.modelId);
                        return sum + (model?.cloudGPUs || 1) * w.quantity;
                      }, 0) || 1
                    );
                    const provider = trainingProviders.providers[0];
                    const dailyCost = provider?.ratePerGPUHour * gpusNeeded * dailyHours || Infinity;
                    const payoffDays = calculations.localPrice / dailyCost;
                    const payoffMonths = payoffDays / 30;

                    return (
                      <p className={payoffMonths < 12 ? 'text-success mt-3' : 'text-warning mt-3'}>
                        {payoffMonths < 12
                          ? `✓ Hardware pays off in ${Math.ceil(payoffDays)} days (${formatPayoff(payoffMonths)}) vs cloud training (${provider?.name}). After that, training is essentially free.`
                          : `⚠ Hardware takes ${formatPayoff(payoffMonths)} to pay off vs cloud training (${provider?.name}) at this utilization level.`
                        }
                      </p>
                    );
                  }

                  // Inference mode payoff calculation
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
                    <p className={payoffMonths < 12 ? 'text-success mt-3' : 'text-warning mt-3'}>
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
          <div className="bg-red-900/20 border border-red-800/50  p-5">
            <h3 className="font-semibold text-destructive mb-2">Cannot Run Workload</h3>
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
        <div className="mt-4 bg-secondary/50  p-5 border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Data Sources & Methodology</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            {/* Calculation Methodology */}
            <div>
              <h4 className="text-muted-foreground font-medium mb-2">How We Calculate</h4>
              <ul className="space-y-1.5">
                <li><strong className="text-muted-foreground">Payoff:</strong> Hardware cost ÷ daily cloud savings = days to break even</li>
                <li><strong className="text-muted-foreground">Cloud hours:</strong> Adjusted to match local token output using throughput ratios</li>
                <li><strong className="text-muted-foreground">API costs:</strong> 50% input + 50% output tokens (blended rate)</li>
                <li><strong className="text-muted-foreground">Memory:</strong> Model weights + KV cache overhead; training modes add optimizer states</li>
              </ul>
            </div>

            {/* Data Sources */}
            <div>
              <h4 className="text-muted-foreground font-medium mb-2">Data Sources</h4>
              <ul className="space-y-1.5">
                <li>
                  <strong className="text-muted-foreground">Benchmarks:</strong>{' '}
                  {models.sources.slice(0, 3).map((s, i) => (
                    <span key={s.id}>
                      <a href={s.url} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                        {s.name}
                      </a>
                      {i < 2 && ', '}
                    </span>
                  ))}
                  {models.sources.length > 3 && ` +${models.sources.length - 3} more`}
                </li>
                <li>
                  <strong className="text-muted-foreground">GPU rental:</strong>{' '}
                  {cloudProviders.providers.slice(0, 3).map((p, i) => (
                    <span key={p.id}>
                      <a href={cloudProviders.sources?.[p.name]} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                        {p.name}
                      </a>
                      {i < 2 && ', '}
                    </span>
                  ))}
                  {cloudProviders.providers.length > 3 && ` +${cloudProviders.providers.length - 3} more`}
                </li>
                <li>
                  <strong className="text-muted-foreground">API pricing:</strong>{' '}
                  {Object.keys(apiProviders.sources || {}).slice(0, 4).map((name, i, arr) => (
                    <span key={name}>
                      <a href={apiProviders.sources[name]} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
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

          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <strong className="text-muted-foreground">Last updated:</strong> {apiProviders.updatedAt} •{' '}
            <strong className="text-muted-foreground">Mac prices:</strong> CAD converted at {cadToUsd} USD •{' '}
            <strong className="text-muted-foreground">GPU type:</strong> {cloudProviders.gpuType}
          </div>
        </div>
      </div>
    </div>
  );
}
