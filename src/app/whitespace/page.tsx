'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type Row = {
  class: string;
  class_name: string;
  department: string;
  division: string;
  cells: Record<string, number>;
  brands_present: number;
  total_styles: number;
  focus_styles: number;
  category: 'white_space' | 'niche' | 'contested' | 'crowded' | 'universal';
  we_in: boolean;
};

type Whitespace = {
  generated_at: string;
  focus_brand: string;
  all_brands: string[];
  total_classes: number;
  we_absent_count: number;
  we_absent_with_peers_count: number;
  by_category: Record<string, number>;
  rows: Row[];
  by_department: Record<string, Row[]>;
};

const BRAND_LABELS: Record<string, string> = {
  gymreapers: 'GR',
  gymshark: 'GS',
  sbd: 'SBD',
  schiek: 'SCK',
  harbinger: 'HAR',
  bear_grips: 'BG',
};

const BRAND_FULL: Record<string, string> = {
  gymreapers: 'Gymreapers',
  gymshark: 'Gymshark',
  sbd: 'SBD',
  schiek: 'Schiek',
  harbinger: 'Harbinger',
  bear_grips: 'Bear Grips',
};

const CATEGORY_LABELS: Record<string, string> = {
  white_space: 'White space',
  niche: 'Niche',
  contested: 'Contested',
  crowded: 'Crowded',
  universal: 'Universal',
};

const CATEGORY_COLOR: Record<string, string> = {
  white_space: 'text-gr-success',
  niche: 'text-gr-accent',
  contested: 'text-gr-warning',
  crowded: 'text-gr-muted',
  universal: 'text-gr-subtle',
};

function intensity(count: number): { bg: string; text: string } {
  if (count === 0) return { bg: 'bg-gr-bg border border-gr-border', text: 'text-gr-subtle' };
  if (count < 3) return { bg: 'bg-gr-accent-soft', text: 'text-gr-text' };
  if (count < 10) return { bg: 'bg-gr-accent', text: 'text-gr-text' };
  if (count < 30) return { bg: 'bg-gr-accent', text: 'text-gr-text font-bold' };
  return { bg: 'bg-gr-accent-hover', text: 'text-gr-text font-bold' };
}

export default function WhitespacePage() {
  const [data, setData] = useState<Whitespace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'absent' | 'niche' | 'crowded'>('all');

  useEffect(() => {
    fetch('/analysis/whitespace.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setData(d))
      .catch((e) => setError(String(e)));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'absent') return data.rows.filter((r) => !r.we_in && r.brands_present > 0);
    if (filter === 'niche') return data.rows.filter((r) => r.category === 'niche');
    if (filter === 'crowded')
      return data.rows.filter((r) => r.category === 'crowded' || r.category === 'universal');
    return data.rows;
  }, [data, filter]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load white space</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="text-center py-20 text-gr-subtle">Loading the strength market map...</div>;
  }

  const topNiche = data.rows
    .filter((r) => r.category === 'niche' && !r.we_in)
    .slice(0, 3);
  const allBrands = data.all_brands;

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / White Space
        </p>
        <h1 className="text-4xl font-bold tracking-tight">The Strength Market Map</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Every class in the canonical taxonomy mapped against every tracked brand. Cell intensity = style
          count. Niche cells (1-2 brands present) are competitive openings. Crowded rows (5+ brands) are
          commodity zones we have to play in. Updated{' '}
          {new Date(data.generated_at).toLocaleDateString()}.
        </p>
      </header>

      <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
        <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
        <p className="text-lg text-gr-text leading-relaxed">
          The strength market plays in <b className="text-gr-accent">{data.total_classes}</b> classes. Of those,{' '}
          <b className="text-gr-accent">{data.by_category.niche || 0}</b> are niche (1-2 brands present),{' '}
          <b>{data.by_category.contested || 0}</b> contested,{' '}
          <b>{data.by_category.crowded || 0}</b> crowded.
          {' '}We&apos;re absent in <b className="text-gr-accent">{data.we_absent_with_peers_count}</b> classes
          where peers are active.
          {topNiche.length > 0 && (
            <>
              {' '}Single-brand or two-brand niches where we have no presence:{' '}
              {topNiche.map((r, i) => (
                <span key={r.class}>
                  <b>{r.class_name}</b>
                  {i < topNiche.length - 1 ? ', ' : '.'}
                </span>
              ))}
            </>
          )}
        </p>
        <p className="text-gr-muted text-base mt-3 leading-relaxed">
          <span className="text-gr-text font-bold">Decision lens:</span> niche classes where we&apos;re absent
          are the cheapest land to acquire — fewer competitors, less crowding. Crowded classes are commodity:
          we have to play but they&apos;re not where we win. White space (zero brands) is rare in this map
          because we filter to classes someone is already in.
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Filter</div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">View</h2>
          </div>
          <div className="text-xs text-gr-subtle font-mono">{filtered.length} of {data.total_classes}</div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'all' as const, label: 'All classes' },
            { id: 'absent' as const, label: 'We are absent' },
            { id: 'niche' as const, label: 'Niche only' },
            { id: 'crowded' as const, label: 'Crowded / universal' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] border transition ${
                filter === f.id
                  ? 'bg-gr-accent-soft text-gr-accent border-gr-accent'
                  : 'bg-gr-surface text-gr-muted border-gr-border hover:text-gr-text hover:border-gr-border-strong'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-gr-surface border border-gr-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gr-raised">
                <tr>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-gr-muted font-mono sticky left-0 bg-gr-raised z-10 min-w-[200px]">
                    Class
                  </th>
                  <th className="text-left p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                    Status
                  </th>
                  {allBrands.map((b) => (
                    <th
                      key={b}
                      className={`p-2 text-xs uppercase tracking-wider font-mono ${b === data.focus_brand ? 'text-gr-accent' : 'text-gr-muted'}`}
                      style={{ minWidth: '60px' }}
                      title={BRAND_FULL[b] || b}
                    >
                      {BRAND_LABELS[b] || b}
                    </th>
                  ))}
                  <th className="text-right p-3 text-xs uppercase tracking-wider text-gr-muted font-mono">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gr-border">
                {filtered.map((r) => (
                  <tr
                    key={r.class}
                    className={`hover:bg-gr-raised transition ${!r.we_in ? 'border-l-2 border-gr-accent' : ''}`}
                  >
                    <td className="p-3 sticky left-0 bg-gr-surface hover:bg-gr-raised transition z-10">
                      <Link
                        href={`/class?slug=${r.class}`}
                        className="font-bold text-gr-text hover:text-gr-accent transition"
                      >
                        {r.class_name}
                      </Link>
                      <div className="text-xs text-gr-subtle font-mono">{r.department}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${CATEGORY_COLOR[r.category]}`}
                      >
                        {CATEGORY_LABELS[r.category]}
                      </span>
                    </td>
                    {allBrands.map((b) => {
                      const n = r.cells[b] || 0;
                      const isFocus = b === data.focus_brand;
                      const intens = intensity(n);
                      return (
                        <td key={b} className="p-1">
                          <div
                            className={`${intens.bg} ${intens.text} ${isFocus ? 'border-2 border-gr-accent' : ''} rounded text-center py-1.5 text-sm`}
                            title={`${BRAND_FULL[b]}: ${n} styles`}
                          >
                            {n || '·'}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-3 text-right font-mono text-gr-text">{r.total_styles}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={allBrands.length + 3} className="p-6 text-center text-gr-muted">
                      No classes match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gr-muted font-mono">
          <span><span className="inline-block w-3 h-3 rounded-sm bg-gr-bg border border-gr-border align-middle mr-1.5"></span>0 styles</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-gr-accent-soft align-middle mr-1.5"></span>1-2</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-gr-accent align-middle mr-1.5"></span>3-29</span>
          <span><span className="inline-block w-3 h-3 rounded-sm bg-gr-accent-hover align-middle mr-1.5"></span>30+</span>
          <span className="text-gr-subtle">·</span>
          <span><span className="inline-block w-3 h-3 rounded-sm border-2 border-gr-accent align-middle mr-1.5"></span>Gymreapers column</span>
          <span><span className="inline-block w-3 h-3 rounded-sm border-l-2 border-gr-accent align-middle mr-1.5"></span>row where we&apos;re absent</span>
        </div>
      </section>
    </div>
  );
}
