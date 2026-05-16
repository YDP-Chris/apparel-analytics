'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { MetricDelta } from '@/components/MetricDelta';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface PeerBenchmark {
  brand: string;
  handle: string;
  review_count: number;
  rating: number | null;
}

interface SkuRow {
  sku_handle: string;
  product_title: string;
  category: string;
  journey_stage: string;
  first_seen: string | null;
  days_since_launch: number | null;
  variant_count: number;
  color_count: number;
  price_min: number | null;
  price_max: number | null;
  is_on_sale: boolean;
  discount_pct: number | null;
  review_count: number;
  avg_rating: number | null;
  review_count_lw: number;
  review_velocity_7d: number;
  peer_benchmark: PeerBenchmark | null;
}

interface StageRollup {
  sku_count: number;
  avg_review_velocity: number;
}

interface Payload {
  available: boolean;
  snapshot_date: string | null;
  previous_snapshot_date: string | null;
  summary: {
    total_apparel_skus: number;
    new_skus_7d: number;
    on_sale_count: number;
    avg_days_since_launch: number;
    avg_review_velocity_7d: number;
    peer_benchmark_coverage: string;
  };
  skus: SkuRow[];
  by_journey_stage: Record<string, StageRollup>;
}

const STAGE_ORDER: { key: string; label: string }[] = [
  { key: 'training', label: 'Training' },
  { key: 'between_sets', label: 'Between-sets' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'identity', label: 'Identity' },
];

const STAGE_LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  STAGE_ORDER.map((s) => [s.key, s.label]),
);

function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '-';
  return `$${p.toFixed(0)}`;
}

function fmtNum(p: number | null | undefined, digits = 1): string {
  if (p == null || isNaN(p)) return '-';
  return p.toFixed(digits);
}

function fmtRating(r: number | null | undefined): string {
  if (r == null || isNaN(r)) return '-';
  return r.toFixed(2);
}

function productUrl(brand: string | undefined, handle: string | undefined): string {
  if (!handle) return '#';
  const slug = (brand || 'gymreapers').toLowerCase();
  const hosts: Record<string, string> = {
    gymreapers: 'https://gymreapers.com',
    vuori: 'https://vuoriclothing.com',
    alo: 'https://www.aloyoga.com',
    gymshark: 'https://www.gymshark.com',
    lululemon: 'https://shop.lululemon.com',
    rhone: 'https://www.rhone.com',
    athleta: 'https://athleta.gap.com',
    outdoor_voices: 'https://www.outdoorvoices.com',
    tenthousand: 'https://www.tenthousand.cc',
  };
  const host = hosts[slug] || 'https://gymreapers.com';
  return `${host}/products/${handle}`;
}

// Daily review velocity for the peer SKU: rough estimate from total
// review_count divided by a generous 365-day window. This is intentionally
// coarse - the page just needs a comparable per-day number so we can flag
// "are we adding reviews faster than this peer is".
function peerDailyVelocity(peer: PeerBenchmark | null): number {
  if (!peer) return 0;
  const rc = peer.review_count || 0;
  return rc / 365;
}

function rowTint(row: SkuRow): string {
  const peerDaily = peerDailyVelocity(row.peer_benchmark);
  // Only color when we have a meaningful comparison (peer has > 0 reviews
  // and we have positive velocity OR clearly stalled).
  if (!row.peer_benchmark || (row.peer_benchmark.review_count || 0) === 0) return '';
  if (row.review_velocity_7d > peerDaily) return 'bg-gr-success/10';
  if (peerDaily > 0 && row.review_velocity_7d < peerDaily * 0.25) return 'bg-gr-danger/10';
  return '';
}

export default function GrSkuTrackerPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stageFilter, setStageFilter] = useState<string | null>(null);
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);
  const [sortKey, setSortKey] = useState<'velocity' | 'reviews' | 'days'>('velocity');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/gr-sku-performance`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = [...data.skus];
    if (stageFilter) list = list.filter((s) => s.journey_stage === stageFilter);
    if (onSaleOnly) list = list.filter((s) => s.is_on_sale);
    if (newOnly) list = list.filter((s) => (s.days_since_launch ?? 999) <= 30);
    list.sort((a, b) => {
      if (sortKey === 'reviews') return (b.review_count || 0) - (a.review_count || 0);
      if (sortKey === 'days') return (a.days_since_launch ?? 9999) - (b.days_since_launch ?? 9999);
      return (b.review_velocity_7d || 0) - (a.review_velocity_7d || 0);
    });
    return list;
  }, [data, stageFilter, onSaleOnly, newOnly, sortKey]);

  if (loading) {
    return <div className="text-center py-20 text-gr-subtle">Loading apparel SKU tracker...</div>;
  }
  if (error) {
    return <div className="text-center py-20 text-gr-danger">{error}</div>;
  }
  if (!data) {
    return <div className="text-center py-20 text-gr-subtle">No data.</div>;
  }

  if (!data.available || !data.snapshot_date || data.skus.length === 0) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Product &middot; Apparel SKU Tracker
            </p>
            <ConfidenceBadge source="shopify_catalog" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            How each Gymreapers apparel SKU is performing
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Tracker is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The gr-sku-tracker agent needs at least one snapshot cycle before this page renders.
            Daily run lands 6:00 AM ET.
          </p>
        </section>
      </div>
    );
  }

  const s = data.summary;
  const peerCovered = filtered.filter((r) => r.peer_benchmark).length;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Apparel SKU Tracker
          </p>
          <ConfidenceBadge source="shopify_catalog" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          How each Gymreapers apparel SKU is performing
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Per-SKU instrumentation for the apparel push. Tracks review velocity, sale frequency,
          days-since-launch, and benchmarks each against a comparable apparel-tier peer SKU. Reveals
          which launches are winning, which are stalling, and how we stack up vs Vuori/Alo/Gymshark
          on similar products.
        </p>
      </header>

      <SectionExplainer
        what="One row per Gymreapers apparel SKU on today's snapshot. Each row carries its own peer benchmark - the closest comparable product from the apparel-tier set (Vuori, Alo, Gymshark, Lululemon, Rhone, Athleta, Outdoor Voices, Ten Thousand) matched on category + price band."
        howToRead="Sort by velocity (7d) by default - SKUs adding reviews fastest at the top. Green tint means we are outpacing the peer's daily review pace. Red tint means we are well below. Days-since-launch shows how mature the SKU is on site."
        whatToDo="Treat green-tinted rows as winning launches and amplify. Red-tinted rows with mature days_since_launch are stalls - consider repositioning, pricing, or sunsetting. Low review velocity on NEW SKUs is normal; revisit at 30 days."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Apparel SKUs tracked</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{s.total_apparel_skus}</div>
          <div className="text-xs text-gr-muted mt-1">across all journey stages</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">New in last 7 days</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{s.new_skus_7d}</div>
          <div className="text-xs text-gr-muted mt-1 flex items-baseline gap-2">
            <span>fresh launches</span>
            {data.previous_snapshot_date && (
              <MetricDelta current={s.new_skus_7d} previous={null} compact hideWhenEmpty />
            )}
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">On sale today</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{s.on_sale_count}</div>
          <div className="text-xs text-gr-muted mt-1">SKUs with compare_at &gt; price</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Avg review velocity (7d)</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{fmtNum(s.avg_review_velocity_7d, 2)}</div>
          <div className="text-xs text-gr-muted mt-1">reviews/day per SKU</div>
        </div>
      </section>

      {/* Per-stage breakdown */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-7">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">By journey stage</h2>
          <div className="text-xs text-gr-subtle">Click a card to filter the table below.</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STAGE_ORDER.map((stg) => {
            const v = data.by_journey_stage[stg.key];
            const isActive = stageFilter === stg.key;
            return (
              <button
                key={stg.key}
                type="button"
                onClick={() => {
                  const next = isActive ? null : stg.key;
                  setStageFilter(next);
                  trackEvent('click', { label: 'gr_sku_stage_card', metadata: { stage: stg.key, on: !!next } });
                }}
                className={`text-left rounded-md border p-5 transition ${
                  isActive
                    ? 'border-gr-accent bg-gr-accent/5'
                    : 'border-gr-border bg-gr-bg/60 hover:border-gr-accent/60'
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
                  {stg.label}
                </div>
                <div className="text-2xl font-bold text-gr-text tabular-nums">
                  {v ? v.sku_count : 0}
                </div>
                <div className="text-xs text-gr-muted mt-1">
                  {v ? `${fmtNum(v.avg_review_velocity, 2)} reviews/day avg` : 'no SKUs'}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filter chips */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Filter</span>
        <button
          type="button"
          onClick={() => {
            setStageFilter(null);
            setOnSaleOnly(false);
            setNewOnly(false);
            trackEvent('click', { label: 'gr_sku_filter', metadata: { reset: true } });
          }}
          className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition bg-gr-bg text-gr-muted border border-gr-border hover:text-gr-text hover:bg-gr-raised"
        >
          Reset
        </button>
        {STAGE_ORDER.map((stg) => {
          const active = stageFilter === stg.key;
          return (
            <button
              key={stg.key}
              type="button"
              onClick={() => {
                const next = active ? null : stg.key;
                setStageFilter(next);
                trackEvent('click', { label: 'gr_sku_filter', metadata: { stage: stg.key, on: !!next } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                active
                  ? 'bg-gr-accent text-gr-text'
                  : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
              }`}
            >
              {stg.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            const next = !onSaleOnly;
            setOnSaleOnly(next);
            trackEvent('click', { label: 'gr_sku_filter', metadata: { on_sale: next } });
          }}
          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
            onSaleOnly
              ? 'bg-gr-accent text-gr-text'
              : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
          }`}
        >
          On sale only
        </button>
        <button
          type="button"
          onClick={() => {
            const next = !newOnly;
            setNewOnly(next);
            trackEvent('click', { label: 'gr_sku_filter', metadata: { new_30d: next } });
          }}
          className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
            newOnly
              ? 'bg-gr-accent text-gr-text'
              : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
          }`}
        >
          New (last 30d) only
        </button>
        <span className="ml-auto text-[11px] text-gr-subtle">
          {filtered.length} SKU{filtered.length !== 1 ? 's' : ''} &middot; {peerCovered} with peer match &middot; peer coverage{' '}
          {s.peer_benchmark_coverage}
        </span>
      </section>

      {/* Main table */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-5 overflow-x-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">Per-SKU performance</h2>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="uppercase tracking-wider text-gr-subtle">Sort</span>
            {(['velocity', 'reviews', 'days'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setSortKey(k);
                  trackEvent('click', { label: 'gr_sku_sort', metadata: { key: k } });
                }}
                className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider transition ${
                  sortKey === k
                    ? 'bg-gr-accent text-gr-text'
                    : 'bg-gr-bg text-gr-muted border border-gr-border hover:text-gr-text'
                }`}
              >
                {k === 'velocity' ? 'Velocity' : k === 'reviews' ? 'Reviews' : 'Days'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gr-muted py-6">No SKUs match the current filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">SKU</th>
                <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Stage</th>
                <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Days</th>
                <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Variants / colors</th>
                <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Price</th>
                <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Reviews</th>
                <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Velocity 7d</th>
                <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Peer benchmark</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const tint = rowTint(row);
                const stageLabel = STAGE_LABEL_BY_KEY[row.journey_stage] || row.journey_stage;
                const stripe = idx % 2 === 1 ? 'bg-gr-bg/20' : '';
                return (
                  <tr
                    key={row.sku_handle}
                    className={`border-b border-gr-border last:border-0 ${tint || stripe} hover:bg-gr-raised/40 cursor-pointer transition`}
                    onClick={() => {
                      const href = productUrl('gymreapers', row.sku_handle);
                      trackEvent('click', {
                        label: 'gr_sku_row',
                        metadata: { handle: row.sku_handle, category: row.category },
                      });
                      if (typeof window !== 'undefined') {
                        window.open(href, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    <td className="py-2.5 px-3">
                      <div className="text-gr-text font-medium leading-tight">{row.product_title}</div>
                      <div className="text-[10px] text-gr-subtle uppercase tracking-wider mt-0.5">
                        {row.category.replace(/_/g, ' ')}
                        {row.is_on_sale && row.discount_pct ? (
                          <span className="ml-2 text-gr-accent">{`-${fmtNum(row.discount_pct, 0)}% off`}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-raised text-gr-muted whitespace-nowrap">
                        {stageLabel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gr-muted">
                      {row.days_since_launch != null ? row.days_since_launch : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gr-muted">
                      {row.variant_count} / {row.color_count}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gr-muted whitespace-nowrap">
                      {row.price_min === row.price_max
                        ? fmtPrice(row.price_min)
                        : `${fmtPrice(row.price_min)} - ${fmtPrice(row.price_max)}`}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gr-muted whitespace-nowrap">
                      <span className="text-gr-text font-medium">{row.review_count}</span>
                      <span className="text-gr-subtle"> &middot; </span>
                      <span>{fmtRating(row.avg_rating)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-gr-text">
                      {fmtNum(row.review_velocity_7d, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-gr-muted">
                      {row.peer_benchmark ? (
                        <div className="leading-tight">
                          <div className="text-gr-text font-medium capitalize">
                            {row.peer_benchmark.brand.replace(/_/g, ' ')}
                          </div>
                          <div className="text-[10px] text-gr-subtle">
                            {row.peer_benchmark.review_count} reviews &middot;{' '}
                            {fmtRating(row.peer_benchmark.rating)} avg
                          </div>
                        </div>
                      ) : (
                        <span className="text-gr-subtle italic text-[11px]">no peer match</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <div className="text-xs text-gr-subtle">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.gr_apparel_sku_performance</code>.
        Snapshot date {data.snapshot_date}
        {data.previous_snapshot_date ? ` (previous: ${data.previous_snapshot_date})` : ''}. Reviews from Okendo
        (Gymreapers) + Yotpo/Bazaarvoice/Stamped (peers). Daily 6:00 AM ET via gr-sku-tracker. Peer set: Vuori, Alo,
        Gymshark, Lululemon, Rhone, Athleta, Outdoor Voices, Ten Thousand.
      </div>
    </div>
  );
}
