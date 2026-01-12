import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  [key: string]: string | number;
}

interface ChartProps {
  data: ChartData[];
  type?: 'line' | 'bar' | 'area';
  dataKeys: string[];
  xAxisKey: string;
  colors?: string[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  title?: string;
  description?: string;
}

const defaultColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
];

export function EditorialChart({
  data,
  type = 'line',
  dataKeys,
  xAxisKey,
  colors = defaultColors,
  height = 400,
  showGrid = true,
  showLegend = true,
  title,
  description,
}: ChartProps) {
  const ChartComponent = 
    type === 'bar' ? BarChart : 
    type === 'area' ? AreaChart : 
    LineChart;
    
  const DataComponent = 
    type === 'bar' ? Bar : 
    type === 'area' ? Area : 
    Line;

  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="space-y-3">
          {title && (
            <h3 
              style={{ 
                fontFamily: 'var(--font-serif)', 
                fontSize: '1.375rem', 
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: '#121212'
              }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p 
              style={{ 
                fontSize: '0.9375rem', 
                lineHeight: 1.6,
                color: '#666666',
                fontFamily: 'var(--font-sans)'
              }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <div className="bg-secondary p-8">
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent data={data}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="0" 
                stroke="#e2e2e2" 
                vertical={false}
              />
            )}
            <XAxis
              dataKey={xAxisKey}
              stroke="#666666"
              fontSize={11}
              fontFamily="var(--font-sans)"
              fontWeight={600}
              tickLine={false}
              axisLine={{ stroke: '#e2e2e2' }}
            />
            <YAxis
              stroke="#666666"
              fontSize={11}
              fontFamily="var(--font-sans)"
              fontWeight={600}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e2e2',
                borderRadius: '0',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-sans)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              labelStyle={{ 
                fontWeight: 700, 
                marginBottom: '6px',
                color: '#121212'
              }}
            />
            {showLegend && (
              <Legend
                wrapperStyle={{
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-sans)',
                  paddingTop: '24px',
                  fontWeight: 600
                }}
              />
            )}
            {dataKeys.map((key, idx) => {
              const color = colors[idx % colors.length];
              const props = {
                key,
                dataKey: key,
                stroke: color,
                fill: color,
                strokeWidth: 3,
              };
              
              if (type === 'area') {
                return <DataComponent {...props} fillOpacity={0.15} />;
              }
              if (type === 'bar') {
                return <DataComponent {...props} radius={[0, 0, 0, 0]} />;
              }
              return <DataComponent {...props} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />;
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}