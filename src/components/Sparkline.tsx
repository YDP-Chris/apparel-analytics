'use client';

/**
 * Sparkline - tiny inline SVG trendline for a single metric/brand series.
 *
 * Fetches from the YDP Pulse webhook server's /pulse/timeseries endpoint and
 * renders a no-frills line + final dot. Falls back to a quiet "no data" label
 * when fewer than 2 points exist (the system is young; some metrics have only
 * a day or two of history). All failures are swallowed so a sparkline can
 * never break the page that hosts it.
 *
 * Usage:
 *   <Sparkline metric="product_count" brandSlug="gymreapers" />
 *   <Sparkline metric="price_avg" brandSlug="vuori" days={30} width={60} height={18} label="avg" />
 */

import { useEffect, useState } from 'react';

const PULSE_API =
  process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Point {
  date: string;
  value: number;
}

interface TimeseriesPayload {
  metric: string;
  brand_slug: string;
  unit?: string;
  days: number;
  points: Point[];
}

// Module-scope cache keyed by metric|brand|days so multiple sparklines on a
// page (e.g. one row of brands) share the same fetch.
const cache = new Map<string, Promise<TimeseriesPayload | null>>();

function fetchSeries(
  metric: string,
  brandSlug: string,
  days: number,
): Promise<TimeseriesPayload | null> {
  const key = `${metric}|${brandSlug}|${days}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const promise = (async () => {
    if (typeof window === 'undefined') return null;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
      const url = `${PULSE_API}/pulse/timeseries?metric=${encodeURIComponent(metric)}&brand_slug=${encodeURIComponent(brandSlug)}&days=${days}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return null;
      const j = (await r.json()) as TimeseriesPayload;
      return j;
    } catch {
      return null;
    }
  })();
  cache.set(key, promise);
  return promise;
}

interface SparklineProps {
  metric: string;
  brandSlug: string;
  days?: number;
  width?: number;
  height?: number;
  label?: string;
}

export function Sparkline({
  metric,
  brandSlug,
  days = 30,
  width = 80,
  height = 24,
  label,
}: SparklineProps) {
  const [payload, setPayload] = useState<TimeseriesPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchSeries(metric, brandSlug, days).then((p) => {
      if (cancelled) return;
      setPayload(p);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [metric, brandSlug, days]);

  // Pre-fetch placeholder: render an empty box of the requested size so
  // surrounding layout doesn't reflow when data arrives.
  if (!loaded) {
    return (
      <span
        className="inline-block align-middle bg-gr-bg rounded"
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  const points = payload?.points ?? [];

  if (points.length < 2) {
    return (
      <span className="inline-flex items-center text-[10px] text-gr-subtle align-middle">
        no data
      </span>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const current = values[values.length - 1];
  const range = max - min || 1;

  // Padding so the stroke doesn't clip at the edges.
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * innerW;
    const y = pad + (1 - (p.value - min) / range) * innerH;
    return [x, y] as const;
  });

  const d = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');

  const [lastX, lastY] = coords[coords.length - 1];

  const unit = payload?.unit || '';
  const fmt = (n: number) =>
    Number.isFinite(n) ? (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1)) : '?';
  const title = `${label ? label + ': ' : ''}min ${fmt(min)} / max ${fmt(max)} / current ${fmt(current)}${unit ? ' ' + unit : ''}`;

  return (
    <span
      className="inline-flex items-center gap-1 align-middle bg-gr-bg rounded ring-1 ring-transparent hover:ring-gr-border transition"
      title={title}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-label={title}
        role="img"
      >
        <path
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gr-accent"
        />
        <circle cx={lastX} cy={lastY} r={1.6} className="fill-gr-accent" />
      </svg>
      {label ? (
        <span className="text-[10px] text-gr-subtle whitespace-nowrap pr-1">{label}</span>
      ) : null}
    </span>
  );
}

export default Sparkline;
