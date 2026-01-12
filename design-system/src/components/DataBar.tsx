import React from 'react';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface DataBarProps {
  data: DataPoint[];
  maxValue?: number;
  showValues?: boolean;
  orientation?: 'horizontal' | 'vertical';
  height?: string;
}

export function DataBar({ 
  data, 
  maxValue, 
  showValues = true, 
  orientation = 'horizontal',
  height = '32px' 
}: DataBarProps) {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  if (orientation === 'vertical') {
    return (
      <div className="space-y-4">
        {data.map((item, idx) => {
          const percentage = (item.value / max) * 100;
          return (
            <div key={idx} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <div className="text-muted-foreground" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {item.label}
                </div>
                <div 
                  className="bg-muted relative overflow-hidden" 
                  style={{ height }}
                >
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color || `var(--chart-${(idx % 8) + 1})`,
                    }}
                  />
                </div>
              </div>
              {showValues && (
                <div className="min-w-[60px] text-right font-serif" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                  {item.value.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {data.map((item, idx) => {
        const percentage = (item.value / max) * 100;
        return (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                {item.label}
              </span>
              {showValues && (
                <span className="font-serif" style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {item.value.toLocaleString()}
                </span>
              )}
            </div>
            <div className="bg-muted h-2 relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color || `var(--chart-${(idx % 8) + 1})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
