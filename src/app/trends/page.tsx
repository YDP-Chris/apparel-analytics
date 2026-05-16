'use client';

/**
 * Trends Explorer — multi-brand, multi-metric time series chart.
 *
 * Pulls /pulse/timeseries for each (metric, brand_slug, days) combination in
 * parallel and renders a hand-rolled SVG multi-line chart. No chart library.
 *
 * Designed to render gracefully with as little as 2 data points (current
 * production state) and to show a clear empty-state when a series has 0-1
 * points.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const SAVED_VIEWS_KEY = 'ydp_trends_saved_views';
const MAX_BRANDS = 6;
const MAX_SAVED_VIEWS = 8;

interface MetricOption {
  key: string;
  label: string;
  unit: string;
}

const METRICS: MetricOption[] = [
  { key: 'launch_velocity_7d',  label: 'Launch velocity (7d)',     unit: 'products/wk' },
  { key: 'launch_velocity_30d', label: 'Launch velocity (30d)',    unit: 'products/mo' },
  { key: 'social_mentions_7d',  label: 'Social mentions (7d)',     unit: 'mentions' },
  { key: 'social_positive_pct', label: 'Positive sentiment %',     unit: '%' },
  { key: 'fb_ads_active',       label: 'Active FB ads',            unit: 'ads' },
  { key: 'creator_posts_7d',    label: 'Creator posts (7d)',       unit: 'posts' },
  { key: 'brand_search',        label: 'Brand search interest',    unit: 'index' },
  { key: 'jobs_total',          label: 'Open jobs',                unit: 'jobs' },
  { key: 'product_count',       label: 'Product count',            unit: 'products' },
  { key: 'price_avg',           label: 'Average price',            unit: 'USD' },
];

const TIME_WINDOWS = [14, 30, 60, 90];
const DEFAULT_DAYS = 30;
const DEFAULT_METRIC = 'launch_velocity_7d';
const DEFAULT_BRANDS = ['gymreapers', 'sbd', 'rogue_fitness', 'gymshark'];

// Six distinct hex colors for chart lines. Resolved from the gr-* palette
// where possible; the remaining two are tasteful additions that read well
// on the gr-bg near-black surface.
const LINE_COLORS = [
  '#22d3ee', // cyan (gr-accent stand-in for charts)
  '#22c55e', // green (gr-success)
  '#ef4444', // red (gr-danger)
  '#f59e0b', // amber (gr-warning)
  '#60a5fa', // blue (gr-info stand-in)
  '#a3a3a3', // gray (gr-muted)
];

interface SeriesPoint { date: string; value: number | null; }
interface BrandSeries {
  brand_slug: string;
  brand_name: string;
  color: string;
  points: SeriesPoint[];
  unit: string;
}

interface SavedView {
  metric: string;
  brand_slugs: string[];
  days: number;
}

function loadSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_VIEWS) : [];
  } catch {
    return [];
  }
}

function persistSavedViews(views: SavedView[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views.slice(0, MAX_SAVED_VIEWS)));
  } catch {
    // Quota exceeded or disabled storage; silently swallow.
  }
}

function metricMeta(key: string): MetricOption {
  return METRICS.find((m) => m.key === key) || METRICS[0];
}

function formatValue(v: number | null, unit: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '-';
  const abs = Math.abs(v);
  if (unit === '%') return `${v.toFixed(1)}%`;
  if (unit === 'USD') return `$${v.toFixed(0)}`;
  if (abs >= 1000) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function shortDate(iso: string): string {
  // 2026-05-15 -> May 15
  if (!iso || iso.length < 10) return iso;
  const [, mm, dd] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const idx = parseInt(mm, 10) - 1;
  if (idx < 0 || idx > 11) return iso;
  return `${months[idx]} ${parseInt(dd, 10)}`;
}

export default function TrendsPage() {
  const [brandNames, setBrandNames] = useState<Record<string, string>>({});
  const [metric, setMetric] = useState<string>(DEFAULT_METRIC);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(DEFAULT_BRANDS);
  const [days, setDays] = useState<number>(DEFAULT_DAYS);
  const [series, setSeries] = useState<BrandSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [seriesLoading, setSeriesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // 1) Bootstrap: fetch brand_names map.
  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/competitive`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setBrandNames(j.brand_names || {}))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    setSavedViews(loadSavedViews());
  }, []);

  // 2) Fetch series in parallel whenever (metric, brands, days) changes.
  useEffect(() => {
    if (loading || error) return;
    if (selectedBrands.length === 0) { setSeries([]); return; }
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setSeriesLoading(true);
    const m = metricMeta(metric);
    Promise.all(
      selectedBrands.map((slug, i) =>
        fetch(
          `${PULSE_API}/pulse/timeseries?metric=${encodeURIComponent(metric)}&brand_slug=${encodeURIComponent(slug)}&days=${days}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
          .then((r) => (r.ok ? r.json() : { metric, brand_slug: slug, unit: m.unit, days, points: [] }))
          .then((j) => ({
            brand_slug: slug,
            brand_name: brandNames[slug] || slug,
            color: LINE_COLORS[i % LINE_COLORS.length],
            points: Array.isArray(j.points) ? j.points : [],
            unit: j.unit || m.unit,
          } as BrandSeries))
          .catch(() => ({
            brand_slug: slug,
            brand_name: brandNames[slug] || slug,
            color: LINE_COLORS[i % LINE_COLORS.length],
            points: [],
            unit: m.unit,
          } as BrandSeries)),
      ),
    )
      .then((out) => setSeries(out))
      .finally(() => setSeriesLoading(false));
  }, [metric, selectedBrands, days, brandNames, loading, error]);

  const onMetricChange = useCallback((v: string) => {
    setMetric(v);
    trackEvent('change', { label: 'metric', metadata: { metric: v } });
  }, []);

  const toggleBrand = useCallback((slug: string) => {
    setSelectedBrands((prev) => {
      const has = prev.includes(slug);
      if (has) return prev.filter((s) => s !== slug);
      if (prev.length >= MAX_BRANDS) return prev;
      return [...prev, slug];
    });
    trackEvent('change', { label: 'brand_select', metadata: { brand_slug: slug } });
  }, []);

  const onDaysChange = useCallback((d: number) => {
    setDays(d);
    trackEvent('change', { label: 'time_window', metadata: { days: d } });
  }, []);

  const onReset = useCallback(() => {
    setMetric(DEFAULT_METRIC);
    setSelectedBrands(DEFAULT_BRANDS);
    setDays(DEFAULT_DAYS);
    trackEvent('click', { label: 'trends_reset' });
  }, []);

  const onSaveView = useCallback(() => {
    const view: SavedView = { metric, brand_slugs: selectedBrands, days };
    setSavedViews((prev) => {
      // Dedupe by stringified identity.
      const key = JSON.stringify(view);
      const filtered = prev.filter((v) => JSON.stringify(v) !== key);
      const next = [view, ...filtered].slice(0, MAX_SAVED_VIEWS);
      persistSavedViews(next);
      return next;
    });
    trackEvent('click', { label: 'trends_save_view' });
  }, [metric, selectedBrands, days]);

  const onLoadView = useCallback((v: SavedView) => {
    setMetric(v.metric);
    setSelectedBrands(v.brand_slugs.slice(0, MAX_BRANDS));
    setDays(TIME_WINDOWS.includes(v.days) ? v.days : DEFAULT_DAYS);
    trackEvent('click', { label: 'saved_view' });
  }, []);

  const onDeleteView = useCallback((idx: number) => {
    setSavedViews((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persistSavedViews(next);
      return next;
    });
  }, []);

  // Build a unified date axis from the union of dates across all series.
  const unifiedDates = useMemo(() => {
    const set = new Set<string>();
    for (const s of series) for (const p of s.points) set.add(p.date);
    return Array.from(set).sort();
  }, [series]);

  // Index point lookup per series.
  const byBrandDate = useMemo(() => {
    const map = new Map<string, Map<string, number | null>>();
    for (const s of series) {
      const m = new Map<string, number | null>();
      for (const p of s.points) m.set(p.date, typeof p.value === 'number' ? p.value : null);
      map.set(s.brand_slug, m);
    }
    return map;
  }, [series]);

  const m = metricMeta(metric);

  // Compute insights.
  const insights = useMemo(() => {
    const out: string[] = [];
    if (unifiedDates.length < 2) return out;
    // Biggest WoW change (last 7 days vs prior 7 days).
    const last7 = unifiedDates.slice(-7);
    const prev7 = unifiedDates.slice(-14, -7);
    if (last7.length >= 1 && prev7.length >= 1) {
      let best: { name: string; pct: number; absLast: number; absPrev: number } | null = null;
      for (const s of series) {
        const map = byBrandDate.get(s.brand_slug);
        if (!map) continue;
        const lastVals = last7.map((d) => map.get(d)).filter((v): v is number => typeof v === 'number');
        const prevVals = prev7.map((d) => map.get(d)).filter((v): v is number => typeof v === 'number');
        if (lastVals.length === 0 || prevVals.length === 0) continue;
        const avgL = lastVals.reduce((a, b) => a + b, 0) / lastVals.length;
        const avgP = prevVals.reduce((a, b) => a + b, 0) / prevVals.length;
        if (avgP === 0) continue;
        const pct = ((avgL - avgP) / Math.abs(avgP)) * 100;
        if (!best || Math.abs(pct) > Math.abs(best.pct)) best = { name: s.brand_name, pct, absLast: avgL, absPrev: avgP };
      }
      if (best && Math.abs(best.pct) >= 1) {
        const dir = best.pct >= 0 ? '+' : '';
        out.push(`Biggest WoW change: ${best.name} ${m.label} ${dir}${best.pct.toFixed(1)}% over the last 7 days.`);
      }
    }
    // Most stable: lowest coefficient of variation.
    let stable: { name: string; cv: number } | null = null;
    for (const s of series) {
      const vals = s.points.map((p) => p.value).filter((v): v is number => typeof v === 'number');
      if (vals.length < 2) continue;
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg === 0) continue;
      const variance = vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length;
      const cv = Math.sqrt(variance) / Math.abs(avg);
      if (!stable || cv < stable.cv) stable = { name: s.brand_name, cv };
    }
    if (stable) {
      out.push(`Most stable: ${stable.name} (coefficient of variation ${(stable.cv * 100).toFixed(0)}%).`);
    }
    // Inversions: brand A surpassed brand B at some date.
    if (series.length >= 2 && unifiedDates.length >= 2) {
      const flips: string[] = [];
      for (let i = 0; i < series.length && flips.length < 1; i++) {
        for (let j = i + 1; j < series.length && flips.length < 1; j++) {
          const a = series[i];
          const b = series[j];
          const ma = byBrandDate.get(a.brand_slug);
          const mb = byBrandDate.get(b.brand_slug);
          if (!ma || !mb) continue;
          let prevSign = 0;
          let flipDate: string | null = null;
          let aWon = false;
          for (const d of unifiedDates) {
            const va = ma.get(d);
            const vb = mb.get(d);
            if (typeof va !== 'number' || typeof vb !== 'number') continue;
            const sign = va === vb ? 0 : va > vb ? 1 : -1;
            if (sign !== 0 && prevSign !== 0 && sign !== prevSign) {
              flipDate = d;
              aWon = sign === 1;
            }
            if (sign !== 0) prevSign = sign;
          }
          if (flipDate) {
            const winner = aWon ? a.brand_name : b.brand_name;
            const loser = aWon ? b.brand_name : a.brand_name;
            flips.push(`${winner} surpassed ${loser} on ${shortDate(flipDate)}.`);
          }
        }
      }
      out.push(...flips);
    }
    return out.slice(0, 4);
  }, [series, byBrandDate, unifiedDates, m.label]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading trends...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;

  const brandEntries = Object.entries(brandNames).sort(([, a], [, b]) => a.localeCompare(b));

  return (
    <div className="space-y-8">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Data Explorer · Trends
          </p>
          <ConfidenceBadge source="trends_explorer" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Chart any metric, any brands, any window
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Pick a metric, up to {MAX_BRANDS} brands, and a time window. Useful for spotting which
          brands are accelerating or decelerating on the same dimension.
        </p>
      </header>

      {savedViews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Saved views</span>
          {savedViews.map((v, i) => {
            const meta = METRICS.find((mm) => mm.key === v.metric);
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-gr-raised border border-gr-border rounded px-2 py-1 text-xs"
              >
                <button
                  type="button"
                  onClick={() => onLoadView(v)}
                  className="text-gr-text hover:text-gr-accent transition"
                  title={`${v.brand_slugs.join(', ')} · ${v.days}d`}
                >
                  {meta?.label || v.metric} · {v.brand_slugs.length}b · {v.days}d
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteView(i)}
                  className="text-gr-subtle hover:text-gr-danger"
                  aria-label="Delete saved view"
                >
                  x
                </button>
              </span>
            );
          })}
        </div>
      )}

      <section className="bg-gr-surface border border-gr-border rounded-md p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Metric</label>
            <select
              value={metric}
              onChange={(e) => onMetricChange(e.target.value)}
              className="w-full bg-gr-bg border border-gr-border rounded px-3 py-2 text-sm text-gr-text focus:outline-none focus:border-gr-accent"
            >
              {METRICS.map((mm) => (
                <option key={mm.key} value={mm.key}>{mm.label}</option>
              ))}
            </select>
            <div className="text-[11px] text-gr-subtle mt-1">Unit: {m.unit}</div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
              Time window
            </label>
            <div className="flex gap-1">
              {TIME_WINDOWS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onDaysChange(d)}
                  className={`flex-1 px-3 py-2 text-xs font-bold rounded border transition ${
                    days === d
                      ? 'bg-gr-accent/15 border-gr-accent text-gr-accent'
                      : 'bg-gr-bg border-gr-border text-gr-muted hover:text-gr-text'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={onSaveView}
              className="flex-1 px-3 py-2 text-xs font-bold rounded border border-gr-border bg-gr-bg text-gr-text hover:border-gr-accent hover:text-gr-accent transition"
            >
              Save view
            </button>
            <button
              type="button"
              onClick={onReset}
              className="flex-1 px-3 py-2 text-xs font-bold rounded border border-gr-border bg-gr-bg text-gr-muted hover:text-gr-text transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">
              Brands ({selectedBrands.length}/{MAX_BRANDS})
            </label>
            {selectedBrands.length >= MAX_BRANDS && (
              <span className="text-[10px] text-gr-warning">Max {MAX_BRANDS} brands</span>
            )}
          </div>

          {selectedBrands.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedBrands.map((slug, i) => (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1.5 bg-gr-raised border border-gr-border rounded px-2 py-1 text-xs"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
                  />
                  <span className="text-gr-text">{brandNames[slug] || slug}</span>
                  <button
                    type="button"
                    onClick={() => toggleBrand(slug)}
                    className="text-gr-subtle hover:text-gr-danger ml-0.5"
                    aria-label={`Remove ${slug}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-44 overflow-y-auto pr-1">
            {brandEntries.map(([slug, name]) => {
              const checked = selectedBrands.includes(slug);
              const disabled = !checked && selectedBrands.length >= MAX_BRANDS;
              return (
                <label
                  key={slug}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs transition ${
                    checked
                      ? 'bg-gr-accent/10 border-gr-accent/40 text-gr-text'
                      : disabled
                      ? 'bg-gr-bg border-gr-border text-gr-subtle opacity-50 cursor-not-allowed'
                      : 'bg-gr-bg border-gr-border text-gr-muted hover:text-gr-text cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleBrand(slug)}
                    className="accent-gr-accent"
                  />
                  <span className="truncate">{name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-gr-text tracking-tight">{m.label}</h2>
          <div className="text-xs text-gr-subtle">
            {seriesLoading ? 'Loading trends...' : `${unifiedDates.length} day${unifiedDates.length === 1 ? '' : 's'} of data`}
          </div>
        </div>

        <TrendChart
          series={series}
          unifiedDates={unifiedDates}
          unit={m.unit}
          hoverIdx={hoverIdx}
          onHover={setHoverIdx}
        />

        {series.length > 0 && unifiedDates.length >= 1 && (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {series.map((s) => {
              const lastPt = [...s.points].reverse().find((p) => typeof p.value === 'number');
              return (
                <div key={s.brand_slug} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="min-w-0">
                    <div className="text-gr-text truncate">{s.brand_name}</div>
                    <div className="text-gr-subtle tabular-nums">
                      {lastPt ? formatValue(lastPt.value, m.unit) : '-'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {insights.length > 0 && (
        <section className="bg-gr-surface border border-gr-border rounded-md p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-3">Insights</div>
          <ul className="space-y-2 text-sm text-gr-text">
            {insights.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gr-accent mt-0.5">·</span>
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="text-xs text-gr-subtle">
        Series pulled from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.*</code>{' '}
        velocity and snapshot tables. Per-metric source listed in{' '}
        <a href="/methodology" className="text-gr-accent hover:underline">/methodology</a>.
      </div>
    </div>
  );
}

interface TrendChartProps {
  series: BrandSeries[];
  unifiedDates: string[];
  unit: string;
  hoverIdx: number | null;
  onHover: (i: number | null) => void;
}

function TrendChart({ series, unifiedDates, unit, hoverIdx, onHover }: TrendChartProps) {
  // Chart geometry.
  const W = 800;
  const H = 320;
  const PAD_L = 56;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 36;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // Empty / thin state.
  if (series.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gr-bg/50 border border-dashed border-gr-border rounded text-gr-subtle text-sm"
        style={{ height: H }}
      >
        Select at least one brand to chart.
      </div>
    );
  }
  if (unifiedDates.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gr-bg/50 border border-dashed border-gr-border rounded text-gr-subtle text-sm"
        style={{ height: H }}
      >
        Not enough history yet. Need at least 2 days of data per metric to render a trend line.
      </div>
    );
  }

  // Collect all numeric values across series to compute y-domain.
  const allVals: number[] = [];
  for (const s of series) for (const p of s.points) if (typeof p.value === 'number') allVals.push(p.value);
  if (allVals.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-gr-bg/50 border border-dashed border-gr-border rounded text-gr-subtle text-sm"
        style={{ height: H }}
      >
        No values returned for the selected brands. Try a different metric or window.
      </div>
    );
  }
  let yMin = Math.min(...allVals);
  let yMax = Math.max(...allVals);
  if (yMin === yMax) {
    // Pad a flat series so the line shows mid-chart.
    const pad = yMin === 0 ? 1 : Math.abs(yMin) * 0.1;
    yMin -= pad;
    yMax += pad;
  }
  // Always include 0 if all values are non-negative and yMin > 0 by less than 50% of range.
  if (yMin > 0 && yMin < (yMax - yMin)) yMin = 0;

  const n = unifiedDates.length;
  const xAt = (i: number) => PAD_L + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const yAt = (v: number) => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  // Y ticks (4 evenly spaced).
  const Y_TICKS = 4;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / Y_TICKS);

  // X ticks: choose ~5 evenly spaced indices.
  const X_TICKS = Math.min(5, n);
  const xTickIdx: number[] = [];
  if (X_TICKS === 1) xTickIdx.push(0);
  else {
    for (let i = 0; i < X_TICKS; i++) {
      xTickIdx.push(Math.round((i * (n - 1)) / (X_TICKS - 1)));
    }
  }

  // Build paths per series. Break the path when a value is null/missing so the
  // line doesn't bridge across gaps.
  const paths = series.map((s) => {
    const valByDate = new Map<string, number | null>();
    for (const p of s.points) valByDate.set(p.date, typeof p.value === 'number' ? p.value : null);
    const segments: string[] = [];
    let cur = '';
    unifiedDates.forEach((d, i) => {
      const v = valByDate.get(d);
      if (typeof v !== 'number') {
        if (cur) { segments.push(cur); cur = ''; }
        return;
      }
      const cmd = cur === '' ? 'M' : 'L';
      cur += `${cmd}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)} `;
    });
    if (cur) segments.push(cur);
    return { ...s, path: segments.join(''), valByDate };
  });

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPx = ((e.clientX - rect.left) / rect.width) * W;
    if (xPx < PAD_L || xPx > W - PAD_R) { onHover(null); return; }
    const rel = (xPx - PAD_L) / plotW;
    let idx = Math.round(rel * (n - 1));
    if (idx < 0) idx = 0;
    if (idx > n - 1) idx = n - 1;
    onHover(idx);
  };

  const hoverX = hoverIdx !== null ? xAt(hoverIdx) : null;
  const hoverDate = hoverIdx !== null ? unifiedDates[hoverIdx] : null;
  const tooltipRight = hoverX !== null && hoverX > W - 180;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="block"
        onMouseMove={handleMove}
        onMouseLeave={() => onHover(null)}
      >
        {/* Grid + Y-axis ticks */}
        {yTicks.map((tv, i) => {
          const y = yAt(tv);
          return (
            <g key={i}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke="#2a2a2a"
                strokeWidth={1}
                strokeDasharray={i === 0 || i === Y_TICKS ? '0' : '2 3'}
              />
              <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b6b6b" className="tabular-nums">
                {formatValue(tv, unit)}
              </text>
            </g>
          );
        })}

        {/* X-axis ticks */}
        {xTickIdx.map((idx) => {
          const x = xAt(idx);
          return (
            <g key={idx}>
              <line x1={x} x2={x} y1={H - PAD_B} y2={H - PAD_B + 4} stroke="#3a3a3a" strokeWidth={1} />
              <text x={x} y={H - PAD_B + 16} textAnchor="middle" fontSize="10" fill="#a3a3a3">
                {shortDate(unifiedDates[idx])}
              </text>
            </g>
          );
        })}

        {/* Series lines */}
        {paths.map((s) => (
          <path
            key={s.brand_slug}
            d={s.path}
            stroke={s.color}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Series points (small dots) — helpful when there are only 2 points */}
        {paths.map((s) =>
          unifiedDates.map((d, i) => {
            const v = s.valByDate.get(d);
            if (typeof v !== 'number') return null;
            return (
              <circle
                key={`${s.brand_slug}-${i}`}
                cx={xAt(i)}
                cy={yAt(v)}
                r={n <= 4 ? 3.5 : 2.5}
                fill={s.color}
              />
            );
          }),
        )}

        {/* Hover crosshair */}
        {hoverX !== null && (
          <line x1={hoverX} x2={hoverX} y1={PAD_T} y2={H - PAD_B} stroke="#f5f5f5" strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
        )}
      </svg>

      {/* Tooltip */}
      {hoverIdx !== null && hoverDate && (
        <div
          className="absolute pointer-events-none bg-gr-bg border border-gr-border rounded shadow-lg p-3 text-xs"
          style={{
            top: 8,
            left: tooltipRight ? undefined : `min(${((hoverX || 0) / W) * 100}%, calc(100% - 180px))`,
            right: tooltipRight ? 8 : undefined,
            minWidth: 160,
          }}
        >
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1.5">
            {shortDate(hoverDate)}
          </div>
          <div className="space-y-1">
            {paths.map((s) => {
              const v = s.valByDate.get(hoverDate);
              return (
                <div key={s.brand_slug} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gr-muted truncate">{s.brand_name}</span>
                  </div>
                  <span className="text-gr-text tabular-nums">{typeof v === 'number' ? formatValue(v, unit) : '-'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
