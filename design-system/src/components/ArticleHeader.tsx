import React from 'react';

interface ArticleHeaderProps {
  kicker?: string;
  headline: string;
  subheadline?: string;
  byline?: string;
  date?: string;
  variant?: 'default' | 'centered';
}

export function ArticleHeader({
  kicker,
  headline,
  subheadline,
  byline,
  date,
  variant = 'default',
}: ArticleHeaderProps) {
  const containerClass = variant === 'centered' ? 'text-center max-w-3xl mx-auto' : 'max-w-3xl';
  
  return (
    <header className={`space-y-6 ${containerClass}`}>
      {kicker && (
        <div 
          className="uppercase tracking-wider"
          style={{ 
            fontSize: '0.6875rem', 
            fontWeight: 700, 
            letterSpacing: '0.1em',
            color: '#121212'
          }}
        >
          {kicker}
        </div>
      )}
      <h1 style={{ 
        fontFamily: 'var(--font-headline)', 
        fontSize: '2.75rem', 
        fontWeight: 700, 
        lineHeight: 1.1, 
        letterSpacing: '-0.025em',
        marginBottom: '1rem'
      }}>
        {headline}
      </h1>
      {subheadline && (
        <p 
          className="text-muted-foreground"
          style={{ 
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem', 
            lineHeight: 1.5, 
            fontWeight: 400,
            color: '#333333'
          }}
        >
          {subheadline}
        </p>
      )}
      {(byline || date) && (
        <div 
          className="flex items-center gap-2 pt-6 border-t"
          style={{ 
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-sans)',
            color: '#666666',
            borderTopColor: '#e2e2e2'
          }}
        >
          {byline && <span style={{ fontWeight: 700, color: '#121212' }}>By {byline}</span>}
          {byline && date && <span style={{ margin: '0 0.25rem' }}>•</span>}
          {date && <time>{date}</time>}
        </div>
      )}
    </header>
  );
}