'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface CalendarCell {
  detected_date: string;
  brand_slug: string;
  skus_on_sale: number;
  avg_discount_pct: number | null;
  max_discount_pct: number | null;
  categories?: string[];
}

interface PromoEvent {
  brand_slug: string;
  source: string;
  entity_id: string;
  product_title: string;
  category: string | null;
  baseline_price: number | null;
  sale_price: number | null;
  discount_pct: number | null;
  baseline_method: string | null;
}

interface PromoResponse {
  available: boolean;
  snapshot_date: string;
  calendar_30d: CalendarCell[];
  today_events: PromoEvent[];
  brand_names: Record<string, string>;
}

const TODAY_ROW_LIMIT = 50;

function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '-';
  return `$${p.toFixed(2)}`;
}

function fmtPct(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '-';
  return `${p.toFixed(1)}%`;
}

// Build a list of YYYY-MM-DD strings for the 30 days ending on snapshot_date,
// oldest first. Working in UTC to avoid local-tz drift.
function buildDayList(snapshotISO: string): string[] {
  const days: string[] = [];
  const end = new Date(`${snapshotISO}T00:00:00Z`);
  if (isNaN(end.getTime())) return days;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function dayNumber(iso: string): number {
  return parseInt(iso.slice(8, 10), 10);
}

function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
}

function bucketBg(count: number): string {
  if (count <= 0) return 'bg-gr-bg';
  if (count <= 5) return 'bg-gr-accent/10';
  if (count <= 20) return 'bg-gr-accent/30';
  if (count <= 50) return 'bg-gr-accent/60';
  return 'bg-gr-accent';
}

function sourceBadge(source: string): { label: string; classes: string } {
  if (source === 'shopify') {
    return { label: 'Shopify', classes: 'bg-gr-success/15 text-gr-success' };
  }
  if (source === 'amazon') {
    return { label: 'Amazon', classes: 'bg-gr-accent-soft/40 text-gr-accent' };
  }
  return { label: source || 'unknown', classes: 'bg-gr-raised text-gr-muted' };
}

export default function PromoCalendarPage() {
  const [data, setData] = useState<PromoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/promo`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: PromoResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const days = useMemo(
    () => (data ? buildDayList(data.snapshot_date) : []),
    [data],
  );

  // Aggregations: per-brand 30d totals, plus a lookup keyed by brand|date.
  const { brandOrder, cellLookup, todayKpis } = useMemo(() => {
    if (!data) {
      return {
        brandOrder: [] as string[],
        cellLookup: new Map<string, CalendarCell>(),
        todayKpis: { totalSkus: 0, activeBrands: 0, deepest: 0, topBrand: '' },
      };
    }
    const totals: Record<string, number> = {};
    const lookup = new Map<string, CalendarCell>();
    for (const c of data.calendar_30d || []) {
      const key = `${c.brand_slug}|${c.detected_date}`;
      lookup.set(key, c);
      totals[c.brand_slug] = (totals[c.brand_slug] || 0) + (c.skus_on_sale || 0);
    }
    const order = Object.keys(totals).sort((a, b) => totals[b] - totals[a]);

    // Today KPIs from today_events (more granular than calendar_30d).
    const today = data.snapshot_date;
    const todaysCells = (data.calendar_30d || []).filter((c) => c.detected_date === today);
    const totalSkus = todaysCells.reduce((s, c) => s + (c.skus_on_sale || 0), 0);
    const activeBrands = todaysCells.filter((c) => (c.skus_on_sale || 0) > 0).length;
    const deepest = todaysCells.reduce(
      (m, c) => Math.max(m, c.max_discount_pct || 0),
      0,
    );
    const topBrand = order[0] || '';
    return {
      brandOrder: order,
      cellLookup: lookup,
      todayKpis: { totalSkus, activeBrands, deepest, topBrand },
    };
  }, [data]);

  // Filtered today_events list (by brand chip + optional cell click).
  const filteredEvents = useMemo(() => {
    if (!data) return [];
    let list = [...(data.today_events || [])];
    if (activeBrand) list = list.filter((e) => e.brand_slug === activeBrand);
    // activeDate filter only narrows when a non-today cell was clicked;
    // today_events are already today's events.
    if (activeDate && data.snapshot_date && activeDate !== data.snapshot_date) {
      // Backend doesn't return historical event detail; show nothing for
      // past-date drill-in but keep brand context.
      list = [];
    }
    list.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0));
    return list;
  }, [data, activeBrand, activeDate]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading promo calendar...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing &middot; Promo Calendar
            </p>
            <ConfidenceBadge source="promo_tracker" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            When competitors discount, how deep, and what categories
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Promo tracker is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The promo-events pipeline needs at least one snapshot cycle before this page renders.
            Daily run lands 5:30 AM ET.
          </p>
        </section>
      </div>
    );
  }

  const distinctTodayBrands = new Set(filteredEvents.map((e) => e.brand_slug)).size;
  const visibleEvents = showAll ? filteredEvents : filteredEvents.slice(0, TODAY_ROW_LIMIT);

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing &middot; Promo Calendar
          </p>
          <ConfidenceBadge source="promo_tracker" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          When competitors discount, how deep, and what categories
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Built from compare_at_price (Shopify, direct brand callout) and a 28-day trailing median
          baseline (Amazon, statistical). Both teams use it: marketing for promo timing, product for
          &quot;don&apos;t launch joggers the week SBD discounts theirs 30%.&quot;
        </p>
      </header>

      <SectionExplainer
        what="Calendar shows the last 30 days. Each cell is one brand on one day. Color intensity = number of SKUs on sale. Click any cell to see what was on sale that day."
        howToRead="Brand rows down the side, days across the top. Hover any cell for SKU count and average discount depth. Today's column is on the right."
        whatToDo="Spot patterns. Brands that discount every Friday are running auto-promotions. A sudden depth spike means clearance. Use this to time Gymreapers promo against vs avoid their windows."
      />

      {/* Headline KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Today&apos;s promos</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{todayKpis.totalSkus}</div>
          <div className="text-xs text-gr-muted mt-1">SKUs on sale across the set</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Brands active today</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{todayKpis.activeBrands}</div>
          <div className="text-xs text-gr-muted mt-1">running at least one promo</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Deepest discount today</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{fmtPct(todayKpis.deepest)}</div>
          <div className="text-xs text-gr-muted mt-1">max single-SKU markdown</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Most active brand (30d)</div>
          <div className="text-xl font-bold text-gr-text leading-tight">{data.brand_names[todayKpis.topBrand] || todayKpis.topBrand || '-'}</div>
          <div className="text-xs text-gr-muted mt-1">highest sum of SKUs on sale</div>
        </div>
      </section>

      {/* Calendar grid */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-5 overflow-x-auto">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">30-day promo calendar</h2>
          <div className="text-xs text-gr-subtle">
            Click any cell to filter today&apos;s discounts below.
          </div>
        </div>
        {brandOrder.length === 0 ? (
          <p className="text-sm text-gr-muted py-6">No promo activity captured in the last 30 days.</p>
        ) : (
          <div className="inline-block min-w-full">
            {/* Day header row */}
            <div className="flex pl-32">
              {days.map((iso, i) => {
                const isFirst = iso.endsWith('-01') || i === 0;
                const isToday = iso === data.snapshot_date;
                return (
                  <div
                    key={iso}
                    className={`w-6 text-center text-[10px] tabular-nums ${isToday ? 'text-gr-accent font-bold' : 'text-gr-subtle'}`}
                    title={iso}
                  >
                    {isFirst ? (
                      <div className="font-bold text-gr-muted whitespace-nowrap">{monthLabel(iso)} {dayNumber(iso)}</div>
                    ) : (
                      <div>{dayNumber(iso)}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Brand rows */}
            <div className="mt-2 space-y-1">
              {brandOrder.map((slug) => {
                const brandName = data.brand_names[slug] || slug;
                return (
                  <div key={slug} className="flex items-center">
                    <div className="w-32 pr-3 text-xs text-gr-text font-medium truncate" title={brandName}>
                      {brandName}
                    </div>
                    <div className="flex">
                      {days.map((iso) => {
                        const cell = cellLookup.get(`${slug}|${iso}`);
                        const count = cell?.skus_on_sale || 0;
                        const avg = cell?.avg_discount_pct;
                        const cats = cell?.categories || [];
                        const isToday = iso === data.snapshot_date;
                        const isActive = activeBrand === slug && activeDate === iso;
                        const title = count > 0
                          ? `${brandName} on ${iso}: ${count} SKU${count !== 1 ? 's' : ''} on sale, avg ${fmtPct(avg)}${cats.length ? `, categories: ${cats.join(', ')}` : ''}`
                          : `${brandName} on ${iso}: no promos detected`;
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => {
                              const next = isActive ? null : slug;
                              setActiveBrand(next);
                              setActiveDate(isActive ? null : iso);
                              trackEvent('click', {
                                label: 'promo_calendar_cell',
                                metadata: { brand: slug, date: iso, skus: count },
                              });
                            }}
                            title={title}
                            aria-label={title}
                            className={`w-6 h-6 mr-px ${bucketBg(count)} ${isToday ? 'ring-1 ring-gr-accent/60' : ''} ${isActive ? 'outline outline-2 outline-gr-text' : 'hover:outline hover:outline-1 hover:outline-gr-muted'} transition`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-5 flex items-center gap-4 text-[10px] uppercase tracking-wider text-gr-subtle pl-32">
              <span>SKUs on sale:</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gr-bg border border-gr-border" />0</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gr-accent/10" />1-5</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gr-accent/30" />6-20</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gr-accent/60" />21-50</span>
              <span className="flex items-center gap-1"><span className="w-4 h-4 bg-gr-accent" />50+</span>
            </div>
          </div>
        )}
      </section>

      {/* Today's discounts drill-in */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-7">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Discounts active TODAY ({filteredEvents.length} SKU{filteredEvents.length !== 1 ? 's' : ''}
            {' '}across {distinctTodayBrands} brand{distinctTodayBrands !== 1 ? 's' : ''})
          </h2>
          {activeDate && activeDate !== data.snapshot_date && (
            <span className="text-xs text-gr-subtle">
              Past-date drill-ins show brand context only; per-SKU detail is today-only.
            </span>
          )}
        </div>

        {/* Filter chip strip */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveBrand(null);
              setActiveDate(null);
              trackEvent('click', { label: 'promo_chip', metadata: { brand: 'all' } });
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
              activeBrand === null
                ? 'bg-gr-accent text-gr-text'
                : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
            }`}
          >
            All brands
          </button>
          {brandOrder.map((slug) => {
            const name = data.brand_names[slug] || slug;
            const isActive = activeBrand === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  const next = isActive ? null : slug;
                  setActiveBrand(next);
                  if (!next) setActiveDate(null);
                  trackEvent('click', { label: 'promo_chip', metadata: { brand: slug } });
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                  isActive
                    ? 'bg-gr-accent text-gr-text'
                    : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {visibleEvents.length === 0 ? (
          <p className="text-sm text-gr-muted">No discounts match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Brand</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Product</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Category</th>
                  <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Was -&gt; Now</th>
                  <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Discount</th>
                  <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Source</th>
                </tr>
              </thead>
              <tbody>
                {visibleEvents.map((e, i) => {
                  const sb = sourceBadge(e.source);
                  return (
                    <tr key={`${e.brand_slug}-${e.entity_id}-${i}`} className={`border-b border-gr-border last:border-0 ${i % 2 === 1 ? 'bg-gr-bg/20' : ''}`}>
                      <td className="py-2.5 px-3 text-gr-text font-medium whitespace-nowrap">{data.brand_names[e.brand_slug] || e.brand_slug}</td>
                      <td className="py-2.5 px-3 text-gr-muted">{e.product_title}</td>
                      <td className="py-2.5 px-3 text-gr-subtle capitalize">{e.category ? e.category.replace(/_/g, ' ') : '-'}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gr-muted whitespace-nowrap">
                        <span className="line-through text-gr-subtle">{fmtPrice(e.baseline_price)}</span>
                        <span className="mx-1 text-gr-subtle">-&gt;</span>
                        <span className="text-gr-text font-medium">{fmtPrice(e.sale_price)}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-bold text-gr-accent">{fmtPct(e.discount_pct)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sb.classes}`}>
                          {sb.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredEvents.length > TODAY_ROW_LIMIT && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                const next = !showAll;
                setShowAll(next);
                trackEvent('expand', {
                  label: 'promo_show_all',
                  metadata: { open: next, total: filteredEvents.length },
                });
              }}
              className="text-xs text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider"
            >
              {showAll ? `Show top ${TODAY_ROW_LIMIT}` : `Show all ${filteredEvents.length} SKUs`}
            </button>
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.promo_events</code>.
        Shopify uses compare_at_price (direct brand callout). Amazon uses 28-day trailing median; threshold 8% to filter
        algorithmic price wiggle. Daily 5:30 AM ET via promo-tracker.
      </div>
    </div>
  );
}
