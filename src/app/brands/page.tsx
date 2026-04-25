'use client';

import { useEffect, useState } from 'react';

type BrandAnalysis = {
  total_products: number;
  category_mix?: Record<string, { count: number; pct: number }>;
  color_stats?: { avg_per_style: number; max_colors: number; total_unique: number };
  size_stats?: { extended_size_pct?: number; ranges?: Record<string, number> };
  price_stats?: { min: number; max: number; avg: number; median: number };
};

type BrandMix = {
  analyses: Record<string, BrandAnalysis>;
};

type Palette = {
  by_brand: Record<string, { sku_count: number; pct: Record<string, number> }>;
  palette_order: string[];
};

const BRAND_LABELS: Record<string, string> = {
  gymreapers: 'Gymreapers',
  gymshark: 'Gymshark',
  sbd: 'SBD',
  schiek: 'Schiek',
  harbinger: 'Harbinger',
  bear_grips: 'Bear Grips',
};

// Brands rendered in order of catalog size (largest peer first), with focus
// brand pinned to the front for visual continuity.
const FOCUS_BRAND = 'gymreapers';
const KNOWN_BRANDS = ['gymreapers', 'sbd', 'gymshark', 'bear_grips', 'schiek', 'harbinger'];
const PALETTE_FAMILIES = ['neutral', 'bright', 'earth', 'print', 'other'];
const PALETTE_HEX: Record<string, string> = {
  neutral: '#6b6b6b',
  bright: '#dc2626',
  earth: '#a16207',
  print: '#7c3aed',
  other: '#3a3a3a',
};

export default function BrandsPage() {
  const [brandMix, setBrandMix] = useState<BrandMix | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/analysis/brand_mix.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/analysis/palette.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([bm, p]) => {
      setBrandMix(bm);
      setPalette(p);
      if (!bm) setError('brand_mix.json not in public/analysis yet — sync via deploy.sh');
    });
  }, []);

  if (error && !brandMix) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load brand data</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!brandMix) {
    return <div className="text-center py-20 text-gr-subtle">Loading strength market...</div>;
  }

  const focus = FOCUS_BRAND;
  const focusData = brandMix.analyses[focus];
  // Sort peers by catalog size desc so biggest competitor reads first
  const peerBrands = KNOWN_BRANDS
    .filter((b) => b !== focus && brandMix.analyses[b])
    .sort(
      (a, b) =>
        (brandMix.analyses[b]?.total_products || 0) - (brandMix.analyses[a]?.total_products || 0),
    );
  const sortedBrands = [focus, ...peerBrands];

  // Synthesize the read across peers
  const peerPriceAvgs = peerBrands.map((b) => brandMix.analyses[b]?.price_stats?.avg || 0).filter(Boolean);
  const peerMedianPrice =
    peerPriceAvgs.length > 0 ? peerPriceAvgs.reduce((s, n) => s + n, 0) / peerPriceAvgs.length : 0;
  const focusPrice = focusData?.price_stats?.avg || 0;
  const richest = sortedBrands.map((b) => ({
    slug: b,
    n: brandMix.analyses[b]?.total_products || 0,
  })).sort((a, b) => b.n - a.n)[0];

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Strength Market
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Who&apos;s Who</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          The strength market through the Gymreapers lens. Six peer brands plus us. Click any card to see how
          their assortment, palette, and pricing compares to ours.
        </p>
      </header>

      <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
        <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
        <p className="text-lg text-gr-text leading-relaxed">
          {richest && (
            <>
              <b className="text-gr-accent">{BRAND_LABELS[richest.slug]}</b> runs the largest catalog at{' '}
              <b>{richest.n.toLocaleString()}</b> products.
            </>
          )}
          {focusData && peerMedianPrice > 0 && (
            <>
              {' '}Gymreapers average price (<b>${focusPrice.toFixed(0)}</b>) sits{' '}
              <b className="text-gr-accent">
                {Math.round(((focusPrice - peerMedianPrice) / peerMedianPrice) * 100)}%
              </b>{' '}
              vs the strength-market average (${peerMedianPrice.toFixed(0)}).
            </>
          )}
          {focusData?.size_stats?.extended_size_pct && (
            <>
              {' '}Our extended-size coverage at <b>{focusData.size_stats.extended_size_pct.toFixed(0)}%</b> is
              one of the most defensible cuts in the field.
            </>
          )}
        </p>
        <p className="text-gr-muted text-base mt-3 leading-relaxed">
          <span className="text-gr-text font-bold">Use this page when:</span> a competitor pops up in a press
          mention, a meet sponsorship, or an internal conversation, and you need a 30-second read on where
          they stand vs us.
        </p>
      </section>

      <section>
        <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Evidence</div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">
          Catalog Size — Sorted Largest First
        </h2>
        <div className="bg-gr-surface border border-gr-border rounded-md p-5 mb-6">
          <div className="space-y-2">
            {(() => {
              const sortedAll = [...sortedBrands]
                .map((slug) => ({ slug, n: brandMix.analyses[slug]?.total_products || 0 }))
                .sort((a, b) => b.n - a.n);
              const max = sortedAll[0]?.n || 1;
              return sortedAll.map((row) => {
                const w = (row.n / max) * 100;
                const isFocus = row.slug === FOCUS_BRAND;
                return (
                  <div key={row.slug} className="flex items-center gap-3 text-sm">
                    <div className="w-32 truncate text-right text-gr-text font-bold">
                      {BRAND_LABELS[row.slug]}
                    </div>
                    <div className="flex-1">
                      <div className="h-7 bg-gr-bg rounded-sm border border-gr-border relative overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 left-0 ${isFocus ? 'bg-gr-accent' : 'bg-gr-muted opacity-70'}`}
                          style={{ width: `${w}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end pr-2 font-mono font-bold text-gr-text">
                          {row.n.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="w-12 text-right text-xs text-gr-subtle font-mono">
                      {((row.n / sortedAll.reduce((s, r) => s + r.n, 0)) * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Evidence</div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">Brand Profiles</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {sortedBrands.filter((b) => brandMix.analyses[b]).map((slug) => {
            const a = brandMix.analyses[slug];
            const p = palette?.by_brand[slug];
            const isFocus = slug === focus;
            const topCats = a.category_mix
              ? Object.entries(a.category_mix)
                  .sort((x, y) => y[1].pct - x[1].pct)
                  .slice(0, 3)
              : [];
            return (
              <div
                key={slug}
                className={`bg-gr-surface rounded-md p-5 border ${isFocus ? 'border-gr-accent' : 'border-gr-border'}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <div>
                    <div className="text-xl font-bold text-gr-text">{BRAND_LABELS[slug]}</div>
                    {isFocus && (
                      <div className="text-xs text-gr-accent font-mono uppercase tracking-wider mt-1">
                        focus brand
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gr-text">{a.total_products.toLocaleString()}</div>
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono">products</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 my-4">
                  <div>
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono">avg price</div>
                    <div className="text-lg font-bold text-gr-text mt-0.5">
                      ${a.price_stats?.avg?.toFixed(0) || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono">colors/style</div>
                    <div className="text-lg font-bold text-gr-text mt-0.5">
                      {a.color_stats?.avg_per_style?.toFixed(1) || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono">2XL+ %</div>
                    <div className="text-lg font-bold text-gr-text mt-0.5">
                      {a.size_stats?.extended_size_pct?.toFixed(0) || '-'}%
                    </div>
                  </div>
                </div>

                {topCats.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono mb-2">
                      top categories
                    </div>
                    <div className="space-y-1">
                      {topCats.map(([cat, m]) => (
                        <div
                          key={cat}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="text-gr-text truncate">{cat}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-20 h-1.5 bg-gr-bg rounded-sm overflow-hidden">
                              <div
                                className="h-full bg-gr-accent rounded-sm"
                                style={{ width: `${Math.min(100, m.pct)}%` }}
                              />
                            </div>
                            <span className="text-gr-muted font-mono text-xs w-10 text-right">
                              {m.pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {p && (
                  <div className="mt-4">
                    <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono mb-2">
                      palette mix
                    </div>
                    <div className="flex h-3 rounded-sm overflow-hidden">
                      {PALETTE_FAMILIES.map((fam) => {
                        const w = p.pct[fam] || 0;
                        return w > 0 ? (
                          <div
                            key={fam}
                            style={{ width: `${w}%`, background: PALETTE_HEX[fam] }}
                            title={`${fam}: ${w.toFixed(1)}%`}
                          />
                        ) : null;
                      })}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gr-muted font-mono">
                      {PALETTE_FAMILIES.map((fam) =>
                        (p.pct[fam] || 0) >= 1 ? (
                          <span key={fam}>
                            <span
                              className="inline-block w-2 h-2 rounded-sm mr-1 align-middle"
                              style={{ background: PALETTE_HEX[fam] }}
                            />
                            {fam} {p.pct[fam].toFixed(0)}%
                          </span>
                        ) : null,
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
