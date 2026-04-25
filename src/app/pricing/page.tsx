'use client';

import { useEffect, useState } from 'react';

type ClassPricing = {
  class: string;
  class_name: string;
  department: string;
  division: string;
  focus_styles: number;
  focus_median: number;
  focus_avg: number;
  peer_median: number;
  gap_vs_peer_median_pct: number;
  position: 'premium' | 'discount' | 'parity';
  per_brand: Record<string, { avg: number; median: number; min: number; max: number; styles: number }>;
};

type Pricing = {
  generated_at: string;
  focus_brand: string;
  peers: string[];
  class_pricing: ClassPricing[];
  summary: { classes_analyzed: number; positions: Record<string, number> };
};

const POS_STYLES: Record<string, string> = {
  premium: 'text-gr-accent',
  discount: 'text-gr-warning',
  parity: 'text-gr-muted',
};

export default function PricingPage() {
  const [data, setData] = useState<Pricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'premium' | 'discount'>('all');

  useEffect(() => {
    fetch('/analysis/pricing.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Could not load pricing</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-gr-bg text-gr-muted -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 text-center py-20">
        Loading pricing analysis...
      </div>
    );
  }

  const rows = data.class_pricing.filter((r) => (filter === 'all' ? true : r.position === filter));
  const summary = data.summary.positions;

  // The Read
  const sortedPremium = [...data.class_pricing]
    .filter((r) => r.position === 'premium')
    .sort((a, b) => b.gap_vs_peer_median_pct - a.gap_vs_peer_median_pct);
  const sortedDiscount = [...data.class_pricing]
    .filter((r) => r.position === 'discount')
    .sort((a, b) => a.gap_vs_peer_median_pct - b.gap_vs_peer_median_pct);
  const widestPremium = sortedPremium[0];
  const widestDiscount = sortedDiscount[0];

  return (
    <div className="min-h-screen bg-gr-bg text-gr-text -mx-4 sm:-mx-6 lg:-mx-8 -my-8 px-4 sm:px-6 lg:px-8 py-12">
      <div className="space-y-8 max-w-6xl mx-auto">
        <header>
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
            Gymreapers / Price Positioning
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Where We Sit Above Or Below The Strength Market</h1>
          <p className="text-gr-muted mt-3 max-w-3xl">
            Per-class median price vs the strength-market median (SBD, Schiek, Harbinger, Bear Grips, Gymshark).
            Premium = over 15% above peer median. Discount = over 15% below. Updated{' '}
            {new Date(data.generated_at).toLocaleDateString()}.
          </p>
        </header>

        <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
          <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
          <p className="text-lg text-gr-text leading-relaxed">
            <b className="text-gr-accent">{summary.premium ?? 0} classes premium</b>
            , <b className="text-gr-warning">{summary.discount ?? 0} discount</b>, {summary.parity ?? 0} at parity.
            {widestPremium && (
              <> Our most aggressive premium is <b>{widestPremium.class_name || widestPremium.class}</b> at +{widestPremium.gap_vs_peer_median_pct.toFixed(0)}% above peer median (${widestPremium.focus_median.toFixed(0)} vs ${widestPremium.peer_median.toFixed(0)}).</>
            )}
            {widestDiscount && (
              <> Our deepest discount is <b>{widestDiscount.class_name || widestDiscount.class}</b> at {widestDiscount.gap_vs_peer_median_pct.toFixed(0)}% below peer median (${widestDiscount.focus_median.toFixed(0)} vs ${widestDiscount.peer_median.toFixed(0)}).</>
            )}
          </p>
          <p className="text-gr-muted text-base mt-3 leading-relaxed">
            <span className="text-gr-text font-bold">Decision lens:</span> premium is fine when the PDP earns it
            (fit, durability, certification, athlete usage). For each premium class, audit the top-traffic SKU
            for whether the premium reason is visible above the fold. For each discount class, ask if we&apos;re
            leaving money on the table or signaling value position deliberately.
          </p>
        </section>

        {(() => {
          // Diverging horizontal bar chart: premium right, discount left, sorted by magnitude
          const sorted = [...data.class_pricing]
            .filter((r) => r.position !== 'parity')
            .sort((a, b) => b.gap_vs_peer_median_pct - a.gap_vs_peer_median_pct);
          const max = Math.max(
            ...sorted.map((r) => Math.abs(r.gap_vs_peer_median_pct)),
            1,
          );
          if (sorted.length === 0) return null;
          return (
            <section>
              <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">
                Evidence
              </div>
              <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">
                Premium vs Discount Classes (sorted by magnitude)
              </h2>
              <div className="bg-gr-surface border border-gr-border rounded-md p-5">
                <div className="space-y-2">
                  {sorted.map((r) => {
                    const v = r.gap_vs_peer_median_pct;
                    const pct = Math.min(50, (Math.abs(v) / max) * 50);
                    const isPremium = v > 0;
                    return (
                      <div key={r.class} className="flex items-center gap-3 text-xs">
                        <div className="w-40 truncate text-right text-gr-text" title={r.class_name || r.class}>
                          {r.class_name || r.class}
                        </div>
                        <div className="flex-1 h-6 relative bg-gr-bg rounded-sm overflow-hidden border border-gr-border">
                          <div
                            className="absolute top-0 bottom-0 w-px bg-gr-border-strong"
                            style={{ left: '50%' }}
                          />
                          {!isPremium && (
                            <div
                              className="absolute top-0 bottom-0 bg-gr-warning"
                              style={{ right: '50%', width: `${pct}%` }}
                              title={`${v.toFixed(0)}% below peer median`}
                            />
                          )}
                          {isPremium && (
                            <div
                              className="absolute top-0 bottom-0 bg-gr-accent"
                              style={{ left: '50%', width: `${pct}%` }}
                              title={`+${v.toFixed(0)}% above peer median`}
                            />
                          )}
                          <div
                            className={`absolute top-0 bottom-0 flex items-center px-2 font-mono text-[11px] font-bold ${
                              isPremium ? 'text-gr-text' : 'text-gr-text'
                            }`}
                            style={{
                              [isPremium ? 'left' : 'right']: '50%',
                              transform: isPremium ? `translateX(${pct}%)` : `translateX(-${pct}%)`,
                            }}
                          >
                            <span className={`${isPremium ? 'ml-2' : 'mr-2'}`}>
                              {v >= 0 ? '+' : ''}
                              {v.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-16 text-gr-subtle font-mono text-right">
                          {r.focus_styles} sku
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-gr-muted font-mono pt-3 border-t border-gr-border">
                  <span>
                    <span className="inline-block w-3 h-3 bg-gr-warning align-middle mr-1.5" />
                    Below peer median (discount)
                  </span>
                  <span>
                    <span className="inline-block w-3 h-3 bg-gr-accent align-middle mr-1.5" />
                    Above peer median (premium)
                  </span>
                  <span className="text-gr-subtle">·</span>
                  <span>Sorted by magnitude</span>
                </div>
              </div>
            </section>
          );
        })()}

        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`p-5 rounded text-left border transition ${
              filter === 'all' ? 'bg-gr-raised border-gr-accent' : 'bg-gr-surface border-gr-border hover:border-gr-border-strong'
            }`}
          >
            <div className="text-3xl font-bold">{data.summary.classes_analyzed}</div>
            <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-1">Total classes</div>
          </button>
          <button
            onClick={() => setFilter('premium')}
            className={`p-5 rounded text-left border transition ${
              filter === 'premium' ? 'bg-gr-raised border-gr-accent' : 'bg-gr-surface border-gr-border hover:border-gr-border-strong'
            }`}
          >
            <div className="text-3xl font-bold text-gr-accent">{summary.premium ?? 0}</div>
            <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-1">Premium</div>
          </button>
          <button
            onClick={() => setFilter('discount')}
            className={`p-5 rounded text-left border transition ${
              filter === 'discount' ? 'bg-gr-raised border-gr-accent' : 'bg-gr-surface border-gr-border hover:border-gr-border-strong'
            }`}
          >
            <div className="text-3xl font-bold text-gr-warning">{summary.discount ?? 0}</div>
            <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-1">Discount</div>
          </button>
        </div>

        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.class} className="bg-gr-surface border border-gr-border rounded-md p-5">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <div className="text-xl font-bold">{r.class_name || r.class}</div>
                  <div className="text-xs font-mono text-gr-subtle uppercase tracking-wider mt-1">
                    {r.division} / {r.department} &middot; {r.focus_styles} of our styles
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${POS_STYLES[r.position]}`}>
                    {r.gap_vs_peer_median_pct >= 0 ? '+' : ''}
                    {r.gap_vs_peer_median_pct.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gr-muted uppercase tracking-wider">{r.position}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-6 text-sm">
                <div>
                  <span className="text-gr-muted">Our median:</span>{' '}
                  <span className="font-bold text-gr-text">${r.focus_median.toFixed(0)}</span>
                </div>
                <div className="text-gr-subtle">vs</div>
                <div>
                  <span className="text-gr-muted">peer median:</span>{' '}
                  <span className="font-bold text-gr-text">${r.peer_median.toFixed(0)}</span>
                </div>
              </div>
              <details className="mt-4">
                <summary className="text-xs text-gr-muted uppercase tracking-wider cursor-pointer hover:text-gr-text">
                  Per-brand breakdown
                </summary>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {Object.entries(r.per_brand).map(([brand, b]) => (
                    <div key={brand} className="p-3 rounded bg-gr-bg border border-gr-border">
                      <div className="text-gr-muted truncate">{brand}</div>
                      <div className="text-gr-text font-bold mt-1">
                        ${b.median.toFixed(0)} <span className="text-gr-subtle font-normal">median</span>
                      </div>
                      <div className="text-gr-subtle font-mono">
                        ${b.min.toFixed(0)} - ${b.max.toFixed(0)} ({b.styles} styles)
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="bg-gr-surface border border-gr-border rounded p-6 text-gr-muted text-center">
              No classes match this filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
