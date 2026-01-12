import React from 'react';

/**
 * ArticleHeader - NYT-style article header with kicker, headline, subheadline
 *
 * @param {string} kicker - Optional category/section label
 * @param {string} headline - Main headline text
 * @param {string} subheadline - Optional deck/subheadline text
 * @param {string} byline - Optional author name
 * @param {string} date - Optional publication date
 * @param {'default'|'centered'} variant - Layout variant
 */
export function ArticleHeader({
  kicker,
  headline,
  subheadline,
  byline,
  date,
  variant = 'default',
}) {
  const containerClass = variant === 'centered' ? 'text-center max-w-3xl mx-auto' : 'max-w-3xl';

  return (
    <header className={`space-y-6 ${containerClass}`}>
      {kicker && (
        <div
          className="uppercase tracking-wider text-foreground"
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          {kicker}
        </div>
      )}
      <h1
        className="font-headline text-foreground"
        style={{
          fontSize: '2.75rem',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.025em',
          marginBottom: '1rem'
        }}
      >
        {headline}
      </h1>
      {subheadline && (
        <p
          className="text-muted-foreground font-serif"
          style={{
            fontSize: '1.25rem',
            lineHeight: 1.5,
            fontWeight: 400,
          }}
        >
          {subheadline}
        </p>
      )}
      {(byline || date) && (
        <div
          className="flex items-center gap-2 pt-6 border-t border-border text-muted-foreground"
          style={{
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {byline && <span className="font-bold text-foreground">By {byline}</span>}
          {byline && date && <span style={{ margin: '0 0.25rem' }}>•</span>}
          {date && <time>{date}</time>}
        </div>
      )}
    </header>
  );
}
