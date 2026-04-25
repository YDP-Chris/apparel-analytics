'use client';

import { useEffect, useMemo, useState } from 'react';

type Decision = {
  id: string;
  source: string;
  type: string;
  title: string;
  observation: string;
  recommendation: string;
  severity: number;
  actionability: number;
  freshness: number;
  priority: number;
  evidence_url: string;
  metadata?: Record<string, unknown>;
};

type DecisionsFile = {
  generated_at: string;
  count: number;
  decisions: Decision[];
};

const SOURCES: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'gap_analyzer', label: 'Gap analyzer' },
  { id: 'pricing_analyzer', label: 'Pricing' },
  { id: 'palette_analyzer', label: 'Palette' },
];

const TYPE_BADGE: Record<string, string> = {
  class_gap: 'Class gap',
  color_depth: 'Color depth',
  size_coverage: 'Size coverage',
  price_premium: 'Premium price',
  price_discount: 'Discount price',
  palette: 'Palette',
};

export default function DecisionsPage() {
  const [data, setData] = useState<DecisionsFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/analysis/decisions.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  const sources = useMemo(() => {
    if (!data) return SOURCES;
    const have = new Set(data.decisions.map((d) => d.source));
    return SOURCES.filter((s) => s.id === 'all' || have.has(s.id));
  }, [data]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load decisions</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="text-center py-20 text-gr-subtle">Loading decisions...</div>;
  }

  const decisions = filter === 'all' ? data.decisions : data.decisions.filter((d) => d.source === filter);
  const top = data.decisions.slice(0, 3);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Decisions
        </p>
        <h1 className="text-4xl font-bold tracking-tight">What To Decide This Week</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Ranked output of the decision synthesizer. Pulls findings from gap analysis, pricing, color depth,
          and palette mix into one priority queue. Updated{' '}
          {new Date(data.generated_at).toLocaleDateString()}.
        </p>
      </header>

      <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
        <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
        <p className="text-lg text-gr-text leading-relaxed">
          <b className="text-gr-accent">{data.count}</b> open decisions ranked across class gaps, pricing, color
          depth, and palette mix. Top three this week:
        </p>
        <ul className="mt-3 space-y-1.5 text-gr-text">
          {top.map((d, i) => (
            <li key={d.id} className="leading-relaxed">
              <span className="text-gr-subtle font-mono text-sm mr-2">{i + 1}.</span>
              <b>{d.title}</b>{' '}
              <span className="text-gr-subtle font-mono text-xs">priority {d.priority}</span>
            </li>
          ))}
        </ul>
        <p className="text-gr-muted text-base mt-4 leading-relaxed">
          <span className="text-gr-text font-bold">Decision lens:</span> priority is{' '}
          <span className="font-mono">severity × actionability × freshness</span>. High-severity gaps that are
          easy to close and showed up in the latest run rise to the top. Walk down the list with merch and
          marketing leads — three decisions per week is a sustainable rhythm.
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Filter by</div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">Source</h2>
          </div>
          <div className="text-xs text-gr-subtle font-mono">{decisions.length} of {data.count}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter(s.id)}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] border transition ${
                filter === s.id
                  ? 'bg-gr-accent-soft text-gr-accent border-gr-accent'
                  : 'bg-gr-surface text-gr-muted border-gr-border hover:text-gr-text hover:border-gr-border-strong'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Evidence</div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">Ranked Decisions</h2>
          </div>
        </div>
        <div className="space-y-3">
          {decisions.map((d) => {
            const badge = TYPE_BADGE[d.type] || d.type;
            return (
              <div key={d.id} className="bg-gr-surface border border-gr-border rounded-md p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gr-subtle uppercase tracking-wider px-2 py-0.5 bg-gr-bg border border-gr-border rounded">
                        {badge}
                      </span>
                      <span className="text-xs text-gr-subtle font-mono">{d.source}</span>
                    </div>
                    <div className="text-lg font-bold text-gr-text leading-snug">{d.title}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-gr-accent">{d.priority}</div>
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono">priority</div>
                  </div>
                </div>
                <div className="text-sm text-gr-muted leading-relaxed">
                  <span className="text-gr-text font-bold">Read:</span> {d.observation}
                </div>
                <div className="text-sm text-gr-muted leading-relaxed mt-2">
                  <span className="text-gr-text font-bold">Move:</span> {d.recommendation}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-gr-subtle font-mono">
                  <span>severity {d.severity}</span>
                  <span>·</span>
                  <span>actionability {d.actionability}</span>
                  <span>·</span>
                  <span>freshness {d.freshness}</span>
                  {d.evidence_url && (
                    <>
                      <span>·</span>
                      <a href={d.evidence_url} className="text-gr-accent hover:underline">
                        evidence &rarr;
                      </a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {decisions.length === 0 && (
            <div className="bg-gr-surface border border-gr-border rounded-md p-6 text-center text-gr-muted">
              No decisions match this filter.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
