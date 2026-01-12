import React from 'react';

interface DataTableProps {
  headers: string[];
  rows: (string | number)[][];
  caption?: string;
  highlightColumn?: number;
  zebra?: boolean;
}

export function DataTable({ 
  headers, 
  rows, 
  caption, 
  highlightColumn,
  zebra = true 
}: DataTableProps) {
  return (
    <div className="my-8 overflow-x-auto">
      {caption && (
        <div 
          className="mb-3 text-muted-foreground"
          style={{ fontSize: '0.875rem', fontWeight: 500 }}
        >
          {caption}
        </div>
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-foreground">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className={`text-left py-3 px-4 ${
                  highlightColumn === idx ? 'bg-secondary' : ''
                }`}
                style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={`border-b border-border ${
                zebra && rowIdx % 2 === 0 ? 'bg-secondary/30' : ''
              }`}
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className={`py-3 px-4 ${
                    highlightColumn === cellIdx ? 'bg-secondary font-semibold' : ''
                  }`}
                  style={{ fontSize: '0.875rem', lineHeight: 1.5 }}
                >
                  {typeof cell === 'number' ? cell.toLocaleString() : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
