'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

type Direction = 'under' | 'over' | 'parity';

interface Gap {
  subcategory: string;
  gymreapers_count: number;
  peer_avg: number;
  peer_max: number;
  delta_vs_avg: number;
  gap_direction: Direction;
  top_peer: { brand_slug: string; count: number } | null;
  per_brand: Record<string, number>;
}

interface GapsPayload {
  available: boolean;
  snapshot_date: string | null;
  brand_names: Record<string, string>;
  gaps: Gap[];
}

type SortKey = 'subcategory' | 'gymreapers_count' | 'peer_avg' | 'peer_max' | 'delta_vs_avg';
type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'under' | 'over';

const DIRECTION_STYLES: Record<Direction, { row: string; pill: string; label: string }> = {
  under:  { row: 'bg-gr-danger/5',  pill: 'bg-gr-danger/15 text-gr-danger',  label: 'UNDER' },
  over:   { row: 'bg-gr-success/5', pill: 'bg-gr-success/15 text-gr-success', label: 'OVER' },
  parity: { row: '',                pill: 'bg-gr-raised text-gr-muted',       label: 'PARITY' },
};

function prettySubcategory(slug: string): string {
  return slug.replace(/_/g, ' ');
}

function fmtDelta(n: number): string {
  if (n > 0) return `+${n.toFixed(1)}`;
  if (n < 0) return n.toFixed(1);
  return '0.0';
}

function deltaColor(n: number): string {
  if (n <= -0.5) return 'text-gr-danger';
  if (n >= 0.5) return 'text-gr-success';
  return 'text-gr-muted';
}

export default function CoverageGapsPage() {
  const [data, setData] = useState<GapsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('delta_vs_avg');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/gaps`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: GapsPayload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const gaps = data?.gaps ?? [];
  const brandNames = data?.brand_names ?? {};

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = gaps.filter((g) => {
      if (filter === 'under' && g.gap_direction !== 'under') return false;
      if (filter === 'over' && g.gap_direction !== 'over') return false;
      if (q && !g.subcategory.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [gaps, filter, search, sortKey, sortDir]);

  const kpis = useMemo(() => {
    const tracked = gaps.length;
    const underCount = gaps.filter((g) => g.delta_vs_avg < -0.5).length;
    const overCount = gaps.filter((g) => g.delta_vs_avg > 0.5).length;
    const worst = gaps.reduce<Gap | null>((acc, g) => {
      if (!acc || g.delta_vs_avg < acc.delta_vs_avg) return g;
      return acc;
    }, null);
    return { tracked, underCount, overCount, worst };
  }, [gaps]);

  const onFilter = (mode: FilterMode) => {
    setFilter(mode);
    trackEvent('change', { label: 'gap_filter', metadata: { filter: mode } });
  };

  const onRowExpand = (subcategory: string) => {
    const next = expanded === subcategory ? null : subcategory;
    setExpanded(next);
    if (next) {
      trackEvent('expand', { label: 'gap_row', metadata: { subcategory } });
    }
  };

  const onSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'subcategory' ? 'asc' : 'asc');
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading coverage gaps...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data || !data.available) {
    return <div className="text-center py-20 text-gr-subtle">Gaps feed unavailable.</div>;
  }

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Coverage Gaps
          </p>
          <ConfidenceBadge source="brand_mix" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Where Gymreapers under- or over-indexes vs peers
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Per-subcategory product count delta between Gymreapers and peer average. Negative delta
          means peers have more SKUs in that pocket. Positive delta means Gymreapers is overweight
          relative to the field. Use to spot range extension opportunities (under) or pruning
          candidates (over).
        </p>
      </header>

      <SectionExplainer
        what="Each row is one subcategory. Sorted by largest underweight (Gymreapers SKU count minus peer average). The most-underserved pocket where peers are deep but Gymreapers is thin sits at the top."
        howToRead="Negative delta in red means Gymreapers needs more SKUs. Positive in green means Gymreapers has more than peers (possibly overweight). 'Top peer' shows who is leading the pocket so you know who to study."
        whatToDo="Top 5 underweights are immediate range-extension candidates. Top 5 overweights are pruning candidates if those SKUs aren't selling. Cross-reference against /for-product/demand to confirm whether the under-served pocket has real demand."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Subcategories tracked</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.tracked}</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Underweight</div>
          <div className="text-3xl font-bold text-gr-danger tabular-nums">{kpis.underCount}</div>
          <div className="text-[11px] text-gr-subtle mt-0.5">delta &lt; -0.5</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Overweight</div>
          <div className="text-3xl font-bold text-gr-success tabular-nums">{kpis.overCount}</div>
          <div className="text-[11px] text-gr-subtle mt-0.5">delta &gt; 0.5</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Worst gap</div>
          {kpis.worst ? (
            <>
              <div className="text-xl font-bold text-gr-text capitalize truncate">{prettySubcategory(kpis.worst.subcategory)}</div>
              <div className="text-sm font-bold text-gr-danger tabular-nums mt-0.5">{fmtDelta(kpis.worst.delta_vs_avg)}</div>
            </>
          ) : (
            <div className="text-gr-subtle text-sm">--</div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-md border border-gr-border bg-gr-surface p-0.5">
            {(['all', 'under', 'over'] as FilterMode[]).map((m) => {
              const active = filter === m;
              const label = m === 'all' ? 'Show all' : m === 'under' ? 'Underweight only' : 'Overweight only';
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onFilter(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                    active ? 'bg-gr-accent text-white' : 'text-gr-muted hover:text-gr-text'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter subcategory..."
            className="bg-gr-surface border border-gr-border rounded px-3 py-1.5 text-sm text-gr-text placeholder:text-gr-subtle focus:outline-none focus:border-gr-accent w-full sm:w-64"
          />
        </div>

        <div className="bg-gr-surface border border-gr-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gr-bg/50 border-b border-gr-border">
                <tr className="text-left text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => onSort('subcategory')} className="hover:text-gr-text">
                      Subcategory{sortArrow('subcategory')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onSort('gymreapers_count')} className="hover:text-gr-text">
                      GR count{sortArrow('gymreapers_count')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onSort('peer_avg')} className="hover:text-gr-text">
                      Peer avg{sortArrow('peer_avg')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onSort('peer_max')} className="hover:text-gr-text">
                      Peer max{sortArrow('peer_max')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button type="button" onClick={() => onSort('delta_vs_avg')} className="hover:text-gr-text">
                      Delta{sortArrow('delta_vs_avg')}
                    </button>
                  </th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Top peer</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gr-subtle">
                      No subcategories match this filter.
                    </td>
                  </tr>
                )}
                {filteredSorted.map((g) => {
                  const style = DIRECTION_STYLES[g.gap_direction];
                  const isOpen = expanded === g.subcategory;
                  const topPeerName = g.top_peer ? (brandNames[g.top_peer.brand_slug] || g.top_peer.brand_slug) : '--';
                  return (
                    <Fragment key={g.subcategory}>
                      <tr
                        onClick={() => onRowExpand(g.subcategory)}
                        className={`border-b border-gr-border/60 cursor-pointer hover:bg-gr-raised/40 transition ${style.row}`}
                      >
                        <td className="px-4 py-3 font-semibold text-gr-text capitalize">
                          <span className="inline-block w-3 text-gr-subtle">{isOpen ? '-' : '+'}</span>{' '}
                          {prettySubcategory(g.subcategory)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-gr-text">{g.gymreapers_count}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gr-muted">{g.peer_avg.toFixed(1)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gr-muted">{g.peer_max}</td>
                        <td className={`px-4 py-3 text-right tabular-nums font-bold ${deltaColor(g.delta_vs_avg)}`}>
                          {fmtDelta(g.delta_vs_avg)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${style.pill}`}>
                            {style.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gr-muted">
                          {g.top_peer ? (
                            <>
                              <span className="text-gr-text font-medium">{topPeerName}</span>{' '}
                              <span className="text-gr-subtle tabular-nums">· {g.top_peer.count}</span>
                            </>
                          ) : (
                            <span className="text-gr-subtle">--</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-gr-bg/40 border-b border-gr-border/60">
                          <td colSpan={7} className="px-4 py-5">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-3">
                              Per-brand product count
                            </div>
                            <PerBrandBars perBrand={g.per_brand} brandNames={brandNames} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="text-xs text-gr-subtle leading-relaxed">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.brand_subcategories</code>.
        Subcategory classification is URL-derived (see{' '}
        <a href="/methodology" className="text-gr-accent hover:underline">/methodology</a>). Updated
        daily as part of the competitive-intel sync. Peer set = all tracked brands except
        Gymreapers.
        {data.snapshot_date && (
          <> Snapshot: <span className="tabular-nums">{data.snapshot_date}</span>.</>
        )}
      </div>
    </div>
  );
}

interface PerBrandBarsProps {
  perBrand: Record<string, number>;
  brandNames: Record<string, string>;
}

function PerBrandBars({ perBrand, brandNames }: PerBrandBarsProps) {
  const entries = Object.entries(perBrand).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="space-y-1.5">
      {entries.map(([slug, count]) => {
        const isGR = slug === 'gymreapers';
        const name = brandNames[slug] || slug;
        const pct = (count / max) * 100;
        return (
          <div key={slug} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
            <div className={`text-xs truncate ${isGR ? 'text-gr-accent font-bold' : 'text-gr-muted'}`}>
              {name}
            </div>
            <div className="relative h-4 bg-gr-bg rounded">
              <div
                className={`h-full rounded ${isGR ? 'bg-gr-accent ring-1 ring-gr-accent-hover' : 'bg-gr-border-strong'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className={`text-xs tabular-nums text-right ${isGR ? 'text-gr-accent font-bold' : 'text-gr-muted'}`}>
              {count}
            </div>
          </div>
        );
      })}
    </div>
  );
}
