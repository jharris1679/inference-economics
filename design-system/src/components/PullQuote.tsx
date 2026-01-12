import React from 'react';

interface PullQuoteProps {
  quote: string;
  attribution?: string;
  variant?: 'default' | 'large' | 'bordered';
}

export function PullQuote({ quote, attribution, variant = 'default' }: PullQuoteProps) {
  const fontSize = 
    variant === 'large' ? '1.75rem' : 
    variant === 'bordered' ? '1.5rem' : 
    '1.625rem';
    
  const containerClass = 
    variant === 'bordered'
      ? 'border-l-4 pl-8 my-12'
      : 'my-12';
  
  const borderStyle = variant === 'bordered' ? { borderLeftColor: '#121212', borderLeftWidth: '3px' } : {};

  return (
    <blockquote className={containerClass} style={borderStyle}>
      <p 
        style={{ 
          fontFamily: 'var(--font-serif)',
          fontSize, 
          lineHeight: 1.35, 
          fontWeight: 400,
          letterSpacing: '-0.015em',
          color: '#121212',
          fontStyle: 'italic'
        }}
      >
        "{quote}"
      </p>
      {attribution && (
        <footer 
          className="mt-4"
          style={{ 
            fontSize: '0.9375rem', 
            fontWeight: 600,
            color: '#666666',
            fontFamily: 'var(--font-sans)',
            fontStyle: 'normal'
          }}
        >
          — {attribution}
        </footer>
      )}
    </blockquote>
  );
}