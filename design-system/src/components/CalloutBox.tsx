import React from 'react';

interface CalloutBoxProps {
  title?: string;
  children: React.ReactNode;
  variant?: 'info' | 'methodology' | 'note';
}

export function CalloutBox({ title, children, variant = 'info' }: CalloutBoxProps) {
  const bgColor = 
    variant === 'methodology' ? 'bg-blue-50' :
    variant === 'note' ? 'bg-yellow-50' :
    'bg-secondary';
    
  const borderColor = 
    variant === 'methodology' ? 'border-blue-200' :
    variant === 'note' ? 'border-yellow-200' :
    'border-border';

  return (
    <aside className={`${bgColor} border ${borderColor} p-6 my-8`}>
      {title && (
        <h4 
          className="uppercase tracking-wider mb-3"
          style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}
        >
          {title}
        </h4>
      )}
      <div className="prose prose-sm" style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
        {children}
      </div>
    </aside>
  );
}
