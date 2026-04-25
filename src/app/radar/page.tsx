'use client';

import { useEffect, useMemo, useState } from 'react';

type BrandAnalysis = {
  total_products: number;
  color_stats?: { avg_per_style: number };
  size_stats?: { extended_size_pct?: number };
  price_stats?: { median: number };
};

type BrandMix = {
  analyses: Record<string, BrandAnalysis>;
};

type Palette = {
  by_brand: Record<string, { pct: Record<string, number> }>;
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

// Brand color when overlaid on the radar
const BRAND_COLOR: Record<string, string> = {
  gymreapers: '#dc2626', // red — focus
  sbd: '#3b82f6',
  gymshark: '#a855f7',
  bear_grips: '#f59e0b',
  schiek: '#22c55e',
  harbinger: '#06b6d4',
  slingshot: '#ef4444',
  inzer: '#94a3b8',
  twopood: '#14b8a6',
};

// Five axes: catalog size, color depth, size inclusivity, premium, palette diversity
const AXES = [
  { key: 'catalog', label: 'Catalog Size', max: 1, fmt: (v: number) => `${Math.round(v).toLocaleString()}` },
  { key: 'color', label: 'Color Depth', max: 1, fmt: (v: number) => `${v.toFixed(1)}/style` },
  { key: 'sizes', label: 'Size Inclusivity', max: 1, fmt: (v: number) => `${v.toFixed(0)}% 2XL+` },
  { key: 'premium', label: 'Premium Pricing', max: 1, fmt: (v: number) => `$${v.toFixed(0)}` },
  { key: 'palette', label: 'Palette Diversity', max: 1, fmt: (v: number) => `${v}/5 families` },
] as const;

type AxisKey = typeof AXES[number]['key'];

// SVG dims
const SIZE = 540;
const CENTER = SIZE / 2;
const R = 200;

function angleAt(i: number, total: number) {
  // 0° = top, going clockwise
  return (i / total) * 2 * Math.PI - Math.PI / 2;
}

function pointAt(i: number, total: number, r: number) {
  const a = angleAt(i, total);
  return [CENTER + Math.cos(a) * r, CENTER + Math.sin(a) * r];
}

function brandValues(slug: string, bm: BrandMix, palette: Palette | null) {
  const a = bm.analyses[slug];
  if (!a) return null;
  const paletteCount = palette?.by_brand[slug]
    ? Object.values(palette.by_brand[slug].pct).filter((v) => v >= 5).length
    : 0;
  return {
    catalog: a.total_products || 0,
    color: a.color_stats?.avg_per_style || 0,
    sizes: a.size_stats?.extended_size_pct || 0,
    premium: a.price_stats?.median || 0,
    palette: paletteCount,
  } as Record<AxisKey, number>;
}

export default function RadarPage() {
  const [bm, setBm] = useState<BrandMix | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([FOCUS, 'sbd', 'bear_grips']);

  useEffect(() => {
    Promise.all([
      fetch('/analysis/brand_mix.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/analysis/palette.json').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([m, p]) => {
      setBm(m);
      setPalette(p);
      if (!m) setError('brand_mix.json not loaded yet');
    });
  }, []);

  // Compute max values across ALL brands for normalization
  const maxes = useMemo(() => {
    if (!bm) return null;
    const result: Record<AxisKey, number> = { catalog: 1, color: 1, sizes: 1, premium: 1, palette: 1 };
    for (const slug of ALL_BRANDS) {
      const v = brandValues(slug, bm, palette);
      if (!v) continue;
      (Object.keys(result) as AxisKey[]).forEach((k) => {
        if (v[k] > result[k]) result[k] = v[k];
      });
    }
    // Use log scale for catalog so a 50x range doesn't crush small brands
    return result;
  }, [bm, palette]);

  function normalize(v: number, max: number, key: AxisKey): number {
    if (max === 0) return 0;
    if (key === 'catalog') {
      // Log scale: log(v+1) / log(max+1)
      return Math.log10(v + 1) / Math.log10(max + 1);
    }
    return Math.min(1, v / max);
  }

  const polygons = useMemo(() => {
    if (!bm || !maxes) return [];
    return selected
      .map((slug) => {
        const v = brandValues(slug, bm, palette);
        if (!v) return null;
        const points = AXES.map((axis, i) => {
          const norm = normalize(v[axis.key], maxes[axis.key], axis.key);
          return pointAt(i, AXES.length, norm * R);
        });
        const valuesByAxis: Record<AxisKey, number> = { ...v };
        return { slug, label: BRAND_LABELS[slug] || slug, points, valuesByAxis };
      })
      .filter(Boolean) as Array<{ slug: string; label: string; points: number[][]; valuesByAxis: Record<AxisKey, number> }>;
  }, [selected, bm, maxes, palette]);

  function toggle(slug: string) {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : prev.length < 4 ? [...prev, slug] : prev,
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load brand data</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!bm || !maxes) {
    return <div className="text-center py-20 text-gr-subtle">Loading the radar...</div>;
  }

  const focusVals = brandValues(FOCUS, bm, palette);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Strategy Radar
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Five Dimensions Of A Strength Brand</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Each brand reduced to five axes. Catalog size, color depth, size inclusivity, premium pricing,
          palette diversity. Polygons overlaid show where each brand spends and where each saves. Pick up
          to four brands to compare.
        </p>
      </header>

      <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
        <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
        <p className="text-lg text-gr-text leading-relaxed">
          {focusVals && (
            <>
              Gymreapers reads as: <b className="text-gr-accent">{focusVals.catalog.toLocaleString()}</b>{' '}
              products, <b className="text-gr-accent">{focusVals.color.toFixed(1)}</b> colors per style,{' '}
              <b className="text-gr-accent">{focusVals.sizes.toFixed(0)}%</b> extended-size coverage,{' '}
              <b className="text-gr-accent">${focusVals.premium.toFixed(0)}</b> median price,{' '}
              <b className="text-gr-accent">{focusVals.palette}</b> active palette families.{' '}
            </>
          )}
          The shape that emerges is your strategic identity. Brands with similar shapes compete for the
          same customer; brands with different shapes target different customers entirely.
        </p>
        <p className="text-gr-muted text-base mt-3 leading-relaxed">
          <span className="text-gr-text font-bold">Decision lens:</span> if our polygon is balanced (round)
          we&apos;re generalist; if it spikes on one axis, we&apos;re differentiated. A strong polygon is one
          you can hand to a customer and they say &quot;yeah, that&apos;s why I buy them.&quot;
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Compare</div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold">
              Pick up to 4 brands
            </h2>
          </div>
          <div className="text-xs text-gr-subtle font-mono">{selected.length} of 4</div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {ALL_BRANDS.map((slug) => {
            const on = selected.includes(slug);
            const color = BRAND_COLOR[slug] || '#a3a3a3';
            return (
              <button
                key={slug}
                onClick={() => toggle(slug)}
                className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] border transition flex items-center gap-2 ${
                  on
                    ? 'bg-gr-raised border-gr-text text-gr-text'
                    : 'bg-gr-surface border-gr-border text-gr-muted hover:text-gr-text hover:border-gr-border-strong'
                }`}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ background: on ? color : '#3a3a3a' }}
                />
                {BRAND_LABELS[slug]}
              </button>
            );
          })}
        </div>

        <div className="bg-gr-surface border border-gr-border rounded-md p-6">
          <div className="grid lg:grid-cols-[auto_1fr] gap-6">
            <div className="flex justify-center">
              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="max-w-full">
                {/* Concentric grid rings */}
                {[0.25, 0.5, 0.75, 1].map((scale) => {
                  const ring = AXES.map((_, i) => pointAt(i, AXES.length, R * scale));
                  return (
                    <polygon
                      key={scale}
                      points={ring.map((p) => p.join(',')).join(' ')}
                      fill="none"
                      stroke="#2a2a2a"
                      strokeWidth={1}
                      strokeDasharray={scale === 1 ? '' : '2,3'}
                    />
                  );
                })}

                {/* Axis lines from center */}
                {AXES.map((_, i) => {
                  const [x, y] = pointAt(i, AXES.length, R);
                  return (
                    <line
                      key={i}
                      x1={CENTER}
                      y1={CENTER}
                      x2={x}
                      y2={y}
                      stroke="#2a2a2a"
                      strokeWidth={1}
                    />
                  );
                })}

                {/* Axis labels */}
                {AXES.map((axis, i) => {
                  const [x, y] = pointAt(i, AXES.length, R + 30);
                  return (
                    <text
                      key={axis.key}
                      x={x}
                      y={y}
                      fill="#f5f5f5"
                      fontSize={11}
                      fontFamily="monospace"
                      letterSpacing="1.5"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {axis.label.toUpperCase()}
                    </text>
                  );
                })}

                {/* Brand polygons */}
                {polygons.map((p) => {
                  const color = BRAND_COLOR[p.slug] || '#a3a3a3';
                  const isFocus = p.slug === FOCUS;
                  return (
                    <g key={p.slug}>
                      <polygon
                        points={p.points.map((pt) => pt.join(',')).join(' ')}
                        fill={color}
                        fillOpacity={isFocus ? 0.25 : 0.15}
                        stroke={color}
                        strokeWidth={isFocus ? 2.5 : 2}
                      />
                      {p.points.map((pt, i) => (
                        <circle key={i} cx={pt[0]} cy={pt[1]} r={isFocus ? 4 : 3} fill={color} />
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Comparison table next to the radar */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gr-border">
                    <th className="text-left p-2 text-xs uppercase tracking-wider text-gr-muted font-mono">
                      Axis
                    </th>
                    {polygons.map((p) => (
                      <th
                        key={p.slug}
                        className="text-right p-2 text-xs uppercase tracking-wider font-mono"
                        style={{ color: BRAND_COLOR[p.slug] }}
                      >
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gr-border">
                  {AXES.map((axis) => (
                    <tr key={axis.key}>
                      <td className="p-2 text-gr-text font-bold">{axis.label}</td>
                      {polygons.map((p) => (
                        <td
                          key={p.slug}
                          className="p-2 text-right text-gr-text font-mono text-xs"
                        >
                          {axis.fmt(p.valuesByAxis[axis.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {polygons.length === 0 && (
                <div className="text-center text-gr-muted py-8">
                  Select at least one brand above.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
