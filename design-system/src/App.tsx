import React from 'react';
import { ArticleHeader } from './components/ArticleHeader';
import { StatCard } from './components/StatCard';
import { DataBar } from './components/DataBar';
import { EditorialChart } from './components/EditorialChart';
import { PullQuote } from './components/PullQuote';
import { CalloutBox } from './components/CalloutBox';
import { DataTable } from './components/DataTable';
import { Timeline } from './components/Timeline';
import { BarChart3, LineChart as LineChartIcon, TrendingUp, Users } from 'lucide-react';

export default function App() {
  // Sample data for charts
  const economicData = [
    { month: 'Jan', gdp: 4200, inflation: 2.3, employment: 95.2 },
    { month: 'Feb', gdp: 4350, inflation: 2.5, employment: 95.5 },
    { month: 'Mar', gdp: 4500, inflation: 2.8, employment: 95.8 },
    { month: 'Apr', gdp: 4400, inflation: 3.1, employment: 96.0 },
    { month: 'May', gdp: 4600, inflation: 3.2, employment: 96.2 },
    { month: 'Jun', gdp: 4750, inflation: 3.0, employment: 96.5 },
  ];

  const sectorData = [
    { label: 'Technology', value: 1240 },
    { label: 'Healthcare', value: 980 },
    { label: 'Finance', value: 850 },
    { label: 'Manufacturing', value: 720 },
    { label: 'Retail', value: 650 },
  ];

  const tableData = [
    ['Q1 2025', '4.2%', '$1.2T', '95.2%'],
    ['Q2 2025', '4.5%', '$1.3T', '95.8%'],
    ['Q3 2025', '4.8%', '$1.4T', '96.2%'],
    ['Q4 2025', '5.1%', '$1.5T', '96.5%'],
  ];

  const timelineEvents = [
    {
      date: 'January 2025',
      title: 'Federal Reserve Announces Rate Decision',
      description: 'Interest rates maintained at 5.25% amid economic uncertainty.',
    },
    {
      date: 'March 2025',
      title: 'GDP Growth Exceeds Expectations',
      description: 'Economy grows 4.5% in Q1, surpassing analyst predictions.',
    },
    {
      date: 'May 2025',
      title: 'Employment Reaches Record High',
      description: 'Unemployment drops to 3.5%, lowest in two decades.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card sticky top-0 z-50" style={{ borderBottomColor: '#e2e2e2', borderBottomWidth: '1px' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Inference Economics
            </div>
            <div className="flex items-center gap-8">
              <a 
                href="#" 
                className="hover:opacity-60 transition-opacity" 
                style={{ fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: '#121212' }}
              >
                Analysis
              </a>
              <a 
                href="#" 
                className="hover:opacity-60 transition-opacity" 
                style={{ fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: '#121212' }}
              >
                Data
              </a>
              <a 
                href="#" 
                className="hover:opacity-60 transition-opacity" 
                style={{ fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: '#121212' }}
              >
                Research
              </a>
              <a 
                href="#" 
                className="hover:opacity-60 transition-opacity" 
                style={{ fontSize: '0.8125rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: '#121212' }}
              >
                About
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="border-b" style={{ borderBottomColor: '#e2e2e2' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <ArticleHeader
            kicker="Economic Analysis"
            headline="Understanding Modern Economic Trends Through Data"
            subheadline="A comprehensive look at how inference and statistical methods shape our understanding of economic patterns in 2026."
            byline="Economics Research Team"
            date="Jan. 11, 2026"
            variant="centered"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h5 className="mb-8 uppercase tracking-wider" style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', color: '#121212' }}>
            Key Economic Indicators
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="GDP Growth"
              value="4.8"
              unit="%"
              change={{ value: '0.3%', trend: 'up' }}
              description="Year-over-year growth"
            />
            <StatCard
              label="Inflation Rate"
              value="3.0"
              unit="%"
              change={{ value: '0.2%', trend: 'down' }}
              description="Consumer price index"
            />
            <StatCard
              label="Employment"
              value="96.5"
              unit="%"
              change={{ value: '0.3%', trend: 'up' }}
              description="Labor force participation"
            />
            <StatCard
              label="Market Cap"
              value="$1.5"
              unit="T"
              change={{ value: '5.2%', trend: 'up' }}
              description="Total market value"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Article Column */}
          <article className="lg:col-span-8 space-y-8">
            <section className="max-w-2xl">
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', lineHeight: 1.7, color: '#121212', marginBottom: '1.5rem' }}>
                The economic landscape of 2026 presents a complex tapestry of interconnected trends, 
                where traditional metrics intersect with emerging patterns in unexpected ways. Through 
                careful analysis and statistical inference, we can begin to understand the forces 
                shaping our economic future.
              </p>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.125rem', lineHeight: 1.7, color: '#121212' }}>
                Recent data suggests a fundamental shift in how markets respond to policy changes, 
                with increased volatility in short-term indicators masking longer-term stability in 
                core economic fundamentals.
              </p>
            </section>

            <EditorialChart
              title="Economic Growth Trajectory"
              description="Monthly GDP, inflation, and employment trends showing the relationship between key indicators."
              data={economicData}
              type="line"
              dataKeys={['gdp', 'inflation', 'employment']}
              xAxisKey="month"
              height={400}
            />

            <PullQuote
              quote="The challenge isn't predicting the future, but understanding the present with enough clarity to make informed decisions."
              attribution="Dr. Sarah Chen, Economic Policy Institute"
              variant="bordered"
            />

            <section className="prose prose-lg max-w-none">
              <h2>Sector Performance Analysis</h2>
              <p style={{ fontSize: '1.125rem', lineHeight: 1.7 }}>
                Breaking down economic performance by sector reveals significant disparities in growth 
                patterns. Technology continues to lead, but healthcare and finance show surprising resilience.
              </p>
            </section>

            <div className="border border-border bg-card p-8">
              <h4 className="mb-6" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Sector Growth Comparison (Billions)
              </h4>
              <DataBar data={sectorData} showValues={true} />
            </div>

            <CalloutBox title="Methodology" variant="methodology">
              <p>
                Our analysis employs a combination of Bayesian inference, time-series analysis, and 
                machine learning techniques to identify patterns in economic data. All figures are 
                adjusted for seasonal variations and represent real values after accounting for inflation.
              </p>
              <p className="mt-2">
                Data sources include: Federal Reserve Economic Data (FRED), Bureau of Labor Statistics, 
                and proprietary market analysis tools.
              </p>
            </CalloutBox>

            <section className="prose prose-lg max-w-none">
              <h2>Quarterly Performance Breakdown</h2>
              <p style={{ fontSize: '1.125rem', lineHeight: 1.7 }}>
                A detailed look at quarterly performance metrics reveals the underlying patterns 
                driving annual trends. Employment figures show consistent improvement across all 
                measured periods.
              </p>
            </section>

            <DataTable
              caption="Quarterly Economic Indicators - 2025"
              headers={['Period', 'GDP Growth', 'Market Value', 'Employment']}
              rows={tableData}
              zebra={true}
              highlightColumn={1}
            />

            <EditorialChart
              title="Comparative Growth Analysis"
              description="Year-over-year comparison of GDP growth across quarters."
              data={economicData}
              type="bar"
              dataKeys={['gdp']}
              xAxisKey="month"
              height={350}
              showLegend={false}
            />
          </article>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-8">
            <div className="border border-border bg-card p-6 sticky top-24">
              <h4 className="mb-4 uppercase tracking-wider" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                Key Developments
              </h4>
              <Timeline events={timelineEvents} />
            </div>

            <div className="border border-border bg-secondary/50 p-6">
              <h4 className="mb-4 uppercase tracking-wider" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                Related Research
              </h4>
              <div className="space-y-4">
                {[
                  { title: 'Inflation Dynamics in Modern Markets', date: 'Jan 8, 2026' },
                  { title: 'Labor Market Shifts Post-Pandemic', date: 'Jan 5, 2026' },
                  { title: 'Technology Sector Growth Analysis', date: 'Dec 28, 2025' },
                ].map((item, idx) => (
                  <a
                    key={idx}
                    href="#"
                    className="block group"
                  >
                    <h5 
                      className="group-hover:text-accent transition-colors"
                      style={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.4 }}
                    >
                      {item.title}
                    </h5>
                    <time 
                      className="text-muted-foreground block mt-1"
                      style={{ fontSize: '0.75rem' }}
                    >
                      {item.date}
                    </time>
                  </a>
                ))}
              </div>
            </div>

            <div className="border border-border bg-card p-6">
              <h4 className="mb-4 uppercase tracking-wider" style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                Newsletter
              </h4>
              <p className="text-muted-foreground mb-4" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                Get weekly insights delivered to your inbox.
              </p>
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-2 border border-border bg-background mb-3"
                style={{ fontSize: '0.875rem' }}
              />
              <button
                className="w-full bg-accent text-accent-foreground px-4 py-2 hover:opacity-90 transition-opacity"
                style={{ fontSize: '0.875rem', fontWeight: 600 }}
              >
                Subscribe
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary/30 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="font-serif mb-4" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Inference Economics
              </div>
              <p className="text-muted-foreground" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                Data-driven economic analysis and research.
              </p>
            </div>
            <div>
              <h5 className="mb-3 uppercase tracking-wider" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                Research
              </h5>
              <ul className="space-y-2">
                {['Publications', 'Data Sets', 'Methodology', 'Archive'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: '0.875rem' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="mb-3 uppercase tracking-wider" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                About
              </h5>
              <ul className="space-y-2">
                {['Team', 'Contact', 'Careers', 'Press'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: '0.875rem' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="mb-3 uppercase tracking-wider" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                Legal
              </h5>
              <ul className="space-y-2">
                {['Privacy', 'Terms', 'Disclaimer', 'Cookies'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: '0.875rem' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground" style={{ fontSize: '0.75rem' }}>
            © 2026 Inference Economics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}