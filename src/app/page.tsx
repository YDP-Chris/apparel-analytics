'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type ClassGap = {
  class: string;
  class_name: string;
  we_have: number;
  peer_max_brand: string;
  peer_max_styles: number;
  gap_size: number;
};

type ColorGap = {
  class: string;
  focus_colors_per_style: number;
  leader: string;
  leader_colors_per_style: number;
  delta: number;
};

type Gaps = {
  generated_at: string;
  class_gaps: ClassGap[];
  color_depth_gaps: ColorGap[];
};

type ClassPricing = {
  class: string;
  class_name: string;
  focus_styles: number;
  focus_median: number;
  peer_median: number;
  gap_vs_peer_median_pct: number;
  position: string;
};

type Pricing = {
  class_pricing: ClassPricing[];
};

type Canonical = {
  divisions: Array<{ departments: Array<{ classes: unknown[] }> }>;
};

export default function OverviewPage() {
  const [gaps, setGaps] = useState<Gaps | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [canonical, setCanonical] = useState<Canonical | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/analysis/gaps.json').then((r) => r.json()).catch(() => null),
      fetch('/analysis/pricing.json').then((r) => r.json()).catch(() => null),
      fetch('/canonical.json').then((r) => r.json()).catch(() => null),
    ]).then(([g, p, c]) => {
      setGaps(g);
      setPricing(p);
      setCanonical(c);
    });
  }, []);

  const topGaps = gaps?.class_gaps.slice(0, 3) || [];
  const topColorGaps = gaps?.color_depth_gaps.slice(0, 3) || [];
  const premiumPositions = (pricing?.class_pricing || [])
    .filter((r) => r.position === 'premium')
    .sort((a, b) => b.gap_vs_peer_median_pct - a.gap_vs_peer_median_pct)
    .slice(0, 3);
  const discountPositions = (pricing?.class_pricing || [])
    .filter((r) => r.position === 'discount')
    .sort((a, b) => a.gap_vs_peer_median_pct - b.gap_vs_peer_median_pct)
    .slice(0, 3);

  const totalClasses =
    canonical?.divisions.reduce(
      (s, d) => s + d.departments.reduce((s2, dept) => s2 + dept.classes.length, 0),
      0,
    ) || 0;

  return (
    <div className="space-y-12">
      <header className="text-center pt-6">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">
          Gymreapers / Data &amp; Analytics
        </p>
        <h1 className="text-5xl font-bold tracking-tight text-gr-text">
          Win the Customer. Win the Market.
        </h1>
        <p className="text-lg text-gr-muted mt-4 max-w-3xl mx-auto leading-relaxed">
          Where Gymreapers stands today, what changed this week, and the decisions to make this Monday. One
          source of truth for catalog, pricing, gaps, and competitive moves in the strength market.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/gymreapers"
          className="bg-gr-surface border border-gr-border rounded-md p-6 hover:border-gr-accent transition group"
        >
          <div className="text-3xl font-bold text-gr-text">1,047</div>
          <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-2 font-mono">
            Active Styles
          </div>
          <div className="text-xs text-gr-subtle mt-3 group-hover:text-gr-accent transition">
            Scorecard &rarr;
          </div>
        </Link>
        <Link
          href="/gaps"
          className="bg-gr-surface border border-gr-border rounded-md p-6 hover:border-gr-accent transition group"
        >
          <div className="text-3xl font-bold text-gr-text">{gaps ? gaps.class_gaps.length : '-'}</div>
          <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-2 font-mono">Class Gaps</div>
          <div className="text-xs text-gr-subtle mt-3 group-hover:text-gr-accent transition">
            Where peers eat us &rarr;
          </div>
        </Link>
        <Link
          href="/pricing"
          className="bg-gr-surface border border-gr-border rounded-md p-6 hover:border-gr-accent transition group"
        >
          <div className="text-3xl font-bold text-gr-text">
            {pricing ? pricing.class_pricing.length : '-'}
          </div>
          <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-2 font-mono">
            Priced Classes
          </div>
          <div className="text-xs text-gr-subtle mt-3 group-hover:text-gr-accent transition">
            Premium / discount mix &rarr;
          </div>
        </Link>
        <Link
          href="/taxonomy"
          className="bg-gr-surface border border-gr-border rounded-md p-6 hover:border-gr-accent transition group"
        >
          <div className="text-3xl font-bold text-gr-text">{totalClasses}</div>
          <div className="text-xs text-gr-muted uppercase tracking-[0.2em] mt-2 font-mono">
            Canonical Classes
          </div>
          <div className="text-xs text-gr-subtle mt-3 group-hover:text-gr-accent transition">
            How we organize products &rarr;
          </div>
        </Link>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">
            Where Peers Are Eating Us
          </h2>
          <Link href="/gaps" className="text-xs text-gr-muted hover:text-gr-accent uppercase tracking-wider">
            All gaps &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {topGaps.length === 0 && (
            <div className="md:col-span-3 bg-gr-surface border border-gr-border rounded-md p-6 text-gr-muted">
              No gap data loaded yet. Run the pipeline.
            </div>
          )}
          {topGaps.map((g) => (
            <div key={g.class} className="bg-gr-surface border border-gr-border rounded-md p-5">
              <div className="text-lg font-bold text-gr-text">{g.class_name}</div>
              <div className="mt-3 text-3xl font-bold text-gr-accent">+{g.gap_size}</div>
              <div className="text-xs text-gr-muted mt-1">styles to close</div>
              <div className="text-sm text-gr-muted mt-3">
                We have <b className="text-gr-text">{g.we_have}</b>. {g.peer_max_brand} has{' '}
                <b className="text-gr-text">{g.peer_max_styles}</b>.
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">
            Pricing Position vs Strength Market
          </h2>
          <Link
            href="/pricing"
            className="text-xs text-gr-muted hover:text-gr-accent uppercase tracking-wider"
          >
            All classes &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gr-muted mb-2 uppercase tracking-wider font-mono">
              Most premium (over peer median)
            </div>
            <div className="space-y-2">
              {premiumPositions.map((r) => (
                <div key={r.class} className="bg-gr-surface border border-gr-border rounded-md p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-bold text-gr-text">{r.class_name || r.class}</div>
                    <div className="text-xl font-bold text-gr-accent">
                      +{r.gap_vs_peer_median_pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-xs text-gr-muted mt-1">
                    ${r.focus_median.toFixed(0)} vs peer ${r.peer_median.toFixed(0)} &middot; {r.focus_styles}{' '}
                    styles
                  </div>
                </div>
              ))}
              {premiumPositions.length === 0 && <div className="text-sm text-gr-subtle">No data.</div>}
            </div>
          </div>
          <div>
            <div className="text-sm text-gr-muted mb-2 uppercase tracking-wider font-mono">
              Most discount (under peer median)
            </div>
            <div className="space-y-2">
              {discountPositions.map((r) => (
                <div key={r.class} className="bg-gr-surface border border-gr-border rounded-md p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-bold text-gr-text">{r.class_name || r.class}</div>
                    <div className="text-xl font-bold text-gr-warning">
                      {r.gap_vs_peer_median_pct.toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-xs text-gr-muted mt-1">
                    ${r.focus_median.toFixed(0)} vs peer ${r.peer_median.toFixed(0)} &middot; {r.focus_styles}{' '}
                    styles
                  </div>
                </div>
              ))}
              {discountPositions.length === 0 && <div className="text-sm text-gr-subtle">No data.</div>}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">
            Color Depth Gaps
          </h2>
          <Link href="/gaps" className="text-xs text-gr-muted hover:text-gr-accent uppercase tracking-wider">
            Detail &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {topColorGaps.length === 0 && (
            <div className="md:col-span-3 bg-gr-surface border border-gr-border rounded-md p-6 text-gr-muted">
              No color depth data loaded yet.
            </div>
          )}
          {topColorGaps.map((g) => (
            <div key={g.class} className="bg-gr-surface border border-gr-border rounded-md p-5">
              <div className="text-lg font-bold text-gr-text">
                {g.class.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
              <div className="mt-3 text-3xl font-bold text-gr-accent">+{g.delta.toFixed(1)}</div>
              <div className="text-xs text-gr-muted mt-1">colors/style behind</div>
              <div className="text-sm text-gr-muted mt-3">
                We: <b className="text-gr-text">{g.focus_colors_per_style.toFixed(1)}</b> &middot; {g.leader}:{' '}
                <b className="text-gr-text">{g.leader_colors_per_style.toFixed(1)}</b>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-8">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">
          What This Dashboard Is For
        </h2>
        <div className="space-y-3 text-gr-muted leading-relaxed">
          <p>
            One question:{' '}
            <span className="text-gr-text font-semibold">
              how do we make Gymreapers better and win the customer and the market?
            </span>{' '}
            Every page on this site exists to answer some piece of that.
          </p>
          <p>
            Catalog scorecard, gap analysis, pricing position, taxonomy, launch tracker, social signal, hiring
            signal, search trends. Each is a single lens on the strength market and where we sit in it.
          </p>
          <p className="text-sm text-gr-subtle">
            Internal only. Built and maintained by the data team. Questions: ping Chris.
          </p>
        </div>
      </section>
    </div>
  );
}
