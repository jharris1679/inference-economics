import React from 'react';

/**
 * StatCard - NYT-style statistics display component
 *
 * @param {string|number} value - The main statistic value
 * @param {string} label - Label/title for the stat
 * @param {object} change - Optional trend indicator { value: string, trend: 'up'|'down'|'neutral' }
 * @param {string} unit - Optional unit suffix (e.g., "%", "tok/s")
 * @param {string} description - Optional description text
 */
export function StatCard({ value, label, change, unit, description }) {
  return (
    <div className="bg-secondary p-6">
      <div className="space-y-3">
        <div
          className="uppercase tracking-wider text-muted-foreground"
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <div
            className="text-foreground font-headline"
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          >
            {value}
          </div>
          {unit && (
            <span
              className="text-muted-foreground"
              style={{
                fontSize: '1.5rem',
                fontWeight: 400,
              }}
            >
              {unit}
            </span>
          )}
        </div>
        {change && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 bg-card ${
                change.trend === 'up'
                  ? 'text-success'
                  : change.trend === 'down'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                fontFamily: 'var(--font-sans)'
              }}
            >
              {change.trend === 'up' ? '▲' : change.trend === 'down' ? '▼' : '—'} {change.value}
            </span>
          </div>
        )}
        {description && (
          <p
            className="text-muted-foreground"
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              fontFamily: 'var(--font-sans)'
            }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
