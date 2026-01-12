import React from 'react';

/**
 * CalloutBox - NYT-style callout/aside box for important information
 *
 * @param {string} title - Optional title for the callout
 * @param {React.ReactNode} children - Content of the callout
 * @param {'info'|'methodology'|'note'} variant - Visual variant
 */
export function CalloutBox({ title, children, variant = 'info' }) {
  const bgColor =
    variant === 'methodology' ? 'bg-accent/10' :
    variant === 'note' ? 'bg-warning/10' :
    'bg-secondary';

  const borderColor =
    variant === 'methodology' ? 'border-accent/30' :
    variant === 'note' ? 'border-warning/30' :
    'border-border';

  return (
    <aside className={`${bgColor} border ${borderColor} p-6 my-8`}>
      {title && (
        <h4
          className="uppercase tracking-wider mb-3 text-foreground"
          style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}
        >
          {title}
        </h4>
      )}
      <div
        className="text-foreground/80"
        style={{ fontSize: '0.875rem', lineHeight: 1.7 }}
      >
        {children}
      </div>
    </aside>
  );
}
