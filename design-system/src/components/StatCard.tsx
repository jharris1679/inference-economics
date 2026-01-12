import React from 'react';

interface StatCardProps {
  value: string | number;
  label: string;
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  unit?: string;
  description?: string;
}

export function StatCard({ value, label, change, unit, description }: StatCardProps) {
  return (
    <div className="bg-secondary p-6">
      <div className="space-y-3">
        <div 
          className="uppercase tracking-wider" 
          style={{ 
            fontSize: '0.6875rem', 
            fontWeight: 700, 
            letterSpacing: '0.08em',
            color: '#666666'
          }}
        >
          {label}
        </div>
        <div className="flex items-baseline gap-2">
          <div 
            style={{ 
              fontFamily: 'var(--font-headline)', 
              fontSize: '3rem', 
              fontWeight: 700, 
              lineHeight: 1, 
              letterSpacing: '-0.03em',
              color: '#121212'
            }}
          >
            {value}
          </div>
          {unit && (
            <span 
              style={{ 
                fontSize: '1.5rem', 
                fontWeight: 400,
                color: '#666666'
              }}
            >
              {unit}
            </span>
          )}
        </div>
        {change && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-1 ${
                change.trend === 'up'
                  ? 'bg-white'
                  : change.trend === 'down'
                  ? 'bg-white'
                  : 'bg-white'
              }`}
              style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700,
                color: change.trend === 'up' ? '#54a24b' : change.trend === 'down' ? '#e45756' : '#666666',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {change.trend === 'up' ? '▲' : change.trend === 'down' ? '▼' : '—'} {change.value}
            </span>
          </div>
        )}
        {description && (
          <p 
            style={{ 
              fontSize: '0.8125rem', 
              lineHeight: 1.5,
              color: '#666666',
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