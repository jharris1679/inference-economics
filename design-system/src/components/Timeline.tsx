import React from 'react';

interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
  return (
    <div className="my-8 space-y-6">
      {events.map((event, idx) => (
        <div key={idx} className="flex gap-6">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-accent flex-shrink-0 mt-1.5" />
            {idx < events.length - 1 && (
              <div className="w-0.5 bg-border flex-grow mt-2" />
            )}
          </div>
          <div className="flex-1 pb-8">
            <time 
              className="text-accent uppercase tracking-wider block mb-2"
              style={{ fontSize: '0.75rem', fontWeight: 700 }}
            >
              {event.date}
            </time>
            <h4 style={{ fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 }}>
              {event.title}
            </h4>
            {event.description && (
              <p 
                className="text-muted-foreground mt-2"
                style={{ fontSize: '0.875rem', lineHeight: 1.6 }}
              >
                {event.description}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
