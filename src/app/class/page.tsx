'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trackEvent } from '@/lib/usage';

type Style = {
  brand: string;
  style_id: number | string;
  style_title: string;
  product_type: string;
  class: string;
  class_name: string;
  department: string;
  division: string;
  gender: string;
  url: string;
  colors: string[];
  color_count: number;
  sizes: string[];
  size_count: number;
  price_min: number;
  price_max: number;
};

type StylesIndex = {
  generated_at: string;
  count: number;
  styles: Style[];
};

const BRAND_LABELS: Record<string, string> = {
  gymreapers: 'Gymreapers',
  gymshark: 'Gymshark',
  sbd: 'SBD',
  schiek: 'Schiek',
  harbinger: 'Harbinger',
  bear_grips: 'Bear Grips',
  twopood: '2POOD',
  inzer: 'Inzer',
  slingshot: 'Mark Bell Slingshot',
};

const FOCUS = 'gymreapers';
const ALL_BRANDS = ['gymreapers', 'sbd', 'gymshark', 'bear_grips', 'schiek', 'harbinger', 'slingshot', 'inzer', 'twopood'];

function priceFmt(min: number, max: number): string {
  if (!min && !max) return '—';
  if (min === max) return `$${min.toFixed(0)}`;
  return `$${min.toFixed(0)}–$${max.toFixed(0)}`;
}

function ClassPageInner() {
  const params = useSearchParams();
  const slug = params.get('slug') || '';
  const [data, setData] = useState<StylesIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | 'all'>('all');

  useEffect(() => {
    fetch('/analysis/styles.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  const inClass = useMemo(() => {
    if (!data || !slug) return [];
    return data.styles.filter((s) => s.class === slug);
  }, [data, slug]);

  const className = inClass[0]?.class_name || slug;
  const department = inClass[0]?.department || '';
  const division = inClass[0]?.division || '';

  const byBrand = useMemo(() => {
    const out = new Map<string, Style[]>();
    for (const s of inClass) {
      if (!out.has(s.brand)) out.set(s.brand, []);
      out.get(s.brand)!.push(s);
    }
    // sort each brand's styles by price desc
    for (const arr of out.values()) {
      arr.sort((a, b) => (b.price_min || 0) - (a.price_min || 0));
    }
    return out;
  }, [inClass]);

  const brandSummaries = useMemo(() => {
    return ALL_BRANDS
      .map((b) => {
        const styles = byBrand.get(b) || [];
        if (styles.length === 0) return null;
        const prices = styles.map((s) => s.price_min).filter(Boolean);
        const median = prices.length
          ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
          : 0;
        const allColors = new Set<string>();
        for (const s of styles) for (const c of s.colors) allColors.add(c);
        return {
          brand: b,
          count: styles.length,
          median_price: median,
          unique_colors: allColors.size,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b!.count - a!.count)) as Array<{
        brand: string;
        count: number;
        median_price: number;
        unique_colors: number;
      }>;
  }, [byBrand]);

  const filtered = activeBrand === 'all' ? inClass : inClass.filter((s) => s.brand === activeBrand);
  const filteredSorted = useMemo(
    () => [...filtered].sort((a, b) => (b.price_min || 0) - (a.price_min || 0)),
    [filtered],
  );

  if (!slug) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Pick a class</h1>
        <p className="text-gr-muted mb-6">
          This page expects a <span className="font-mono">?slug=</span> parameter. Try going through{' '}
          <Link href="/whitespace" className="text-gr-accent hover:underline">/whitespace</Link> or{' '}
          <Link href="/gaps" className="text-gr-accent hover:underline">/gaps</Link> and clicking a class.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load styles</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="text-center py-20 text-gr-subtle">Loading class detail...</div>;
  }

  const focusCount = byBrand.get(FOCUS)?.length || 0;
  const topBrand = brandSummaries[0];

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Class Drill-Down
        </p>
        <h1 className="text-4xl font-bold tracking-tight">{className}</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          {division} / {department} &middot; All strength market styles in this class, side by side.
        </p>
      </header>

      <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
        <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
        <p className="text-lg text-gr-text leading-relaxed">
          {inClass.length} total styles in <b>{className}</b> across {brandSummaries.length} brands.
          {topBrand && (
            <>
              {' '}
              <b className="text-gr-accent">{BRAND_LABELS[topBrand.brand] || topBrand.brand}</b> leads with{' '}
              <b>{topBrand.count}</b> styles at a <b>${topBrand.median_price.toFixed(0)}</b> median.
            </>
          )}
          {' '}Gymreapers carries <b className="text-gr-accent">{focusCount}</b> styles here.
        </p>
        <p className="text-gr-muted text-base mt-3 leading-relaxed">
          <span className="text-gr-text font-bold">Use this page to:</span> compare each brand&apos;s offering
          in this class, scan price points, color counts, and size ranges. Pull screenshots for
          merchandising review.
        </p>
      </section>

      <section>
        <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Evidence</div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">
          Per-Brand Summary (sorted by style count)
        </h2>
        <div className="grid md:grid-cols-3 gap-3 mb-6">
          {brandSummaries.map((b) => {
            const isFocus = b.brand === FOCUS;
            return (
              <button
                key={b.brand}
                onClick={() => setActiveBrand(b.brand)}
                className={`text-left bg-gr-surface border rounded-md p-4 transition ${
                  activeBrand === b.brand
                    ? 'border-gr-accent'
                    : isFocus
                      ? 'border-gr-accent-soft'
                      : 'border-gr-border hover:border-gr-border-strong'
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className={`font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                    {BRAND_LABELS[b.brand] || b.brand}
                  </div>
                  <div className="text-2xl font-bold text-gr-text">{b.count}</div>
                </div>
                <div className="text-xs text-gr-muted font-mono mt-2">
                  ${b.median_price.toFixed(0)} median &middot; {b.unique_colors} unique colors
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveBrand('all')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] border transition ${
              activeBrand === 'all'
                ? 'bg-gr-accent-soft text-gr-accent border-gr-accent'
                : 'bg-gr-surface text-gr-muted border-gr-border hover:text-gr-text'
            }`}
          >
            All brands
          </button>
          {brandSummaries.map((b) => (
            <button
              key={b.brand}
              onClick={() => setActiveBrand(b.brand)}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] border transition ${
                activeBrand === b.brand
                  ? 'bg-gr-accent-soft text-gr-accent border-gr-accent'
                  : 'bg-gr-surface text-gr-muted border-gr-border hover:text-gr-text'
              }`}
            >
              {BRAND_LABELS[b.brand] || b.brand} ({b.count})
            </button>
          ))}
        </div>

        <div className="bg-gr-surface border border-gr-border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gr-raised">
              <tr>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                  Brand
                </th>
                <th className="text-left p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                  Style
                </th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                  Price
                </th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                  Colors
                </th>
                <th className="text-right p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                  Sizes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gr-border">
              {filteredSorted.slice(0, 200).map((s, i) => {
                const isFocus = s.brand === FOCUS;
                return (
                  <tr key={`${s.brand}-${s.style_id}-${i}`} className="hover:bg-gr-raised">
                    <td className={`p-3 font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                      {BRAND_LABELS[s.brand] || s.brand}
                    </td>
                    <td className="p-3 text-gr-text">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: (s.url || '').slice(0, 200) } })}
                          className="hover:text-gr-accent hover:underline"
                        >
                          {s.style_title || s.product_type || '(unnamed)'}
                        </a>
                      ) : (
                        s.style_title || s.product_type || '(unnamed)'
                      )}
                      {s.gender && s.gender !== 'unisex' && (
                        <span className="ml-2 text-xs text-gr-subtle font-mono uppercase">{s.gender}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-gr-text">
                      {priceFmt(s.price_min, s.price_max)}
                    </td>
                    <td className="p-3 text-right font-mono text-gr-text">{s.color_count}</td>
                    <td className="p-3 text-right font-mono text-gr-text">{s.size_count}</td>
                  </tr>
                );
              })}
              {filteredSorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gr-muted">
                    No styles match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {filteredSorted.length > 200 && (
            <div className="p-3 text-center text-xs text-gr-subtle bg-gr-raised">
              Showing 200 of {filteredSorted.length} styles. Filter by brand to see more.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function ClassPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-gr-subtle">Loading...</div>}>
      <ClassPageInner />
    </Suspense>
  );
}
