'use client';

import { useEffect, useMemo, useState } from 'react';

type BrandAnalysis = {
  total_products: number;
  color_stats?: { avg_per_style: number };
  size_stats?: { extended_size_pct?: number };
  price_stats?: { min: number; max: number; avg: number; median: number };
};

type BrandMix = {
  analyses: Record<string, BrandAnalysis>;
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

// Plot dimensions
const PAD = { top: 40, right: 40, bottom: 60, left: 70 };
const W = 920;
const H = 580;
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

export default function LandscapePage() {
  const [bm, setBm] = useState<BrandMix | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/analysis/brand_mix.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d) => setBm(d))
      .catch((e) => setError(String(e)));
  }, []);

  const points = useMemo(() => {
    if (!bm) return [];
    return Object.entries(bm.analyses)
      .filter(([slug]) => BRAND_LABELS[slug])
      .map(([slug, a]) => ({
        slug,
        label: BRAND_LABELS[slug],
        x: a.color_stats?.avg_per_style || 0, // color depth
        y: a.price_stats?.median || a.price_stats?.avg || 0, // premium
        size: a.total_products || 0,
        isFocus: slug === FOCUS,
      }))
      .filter((p) => p.x > 0 && p.y > 0)
      .sort((a, b) => b.size - a.size);
  }, [bm]);

  const { xMin, xMax, yMin, yMax, xScale, yScale, sizeScale } = useMemo(() => {
    if (points.length === 0) {
      return { xMin: 0, xMax: 1, yMin: 0, yMax: 1, xScale: () => 0, yScale: () => 0, sizeScale: () => 0 };
    }
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const sizes = points.map((p) => p.size);
    const xMin = 0;
    const xMax = Math.max(...xs) * 1.15;
    const yMin = 0;
    const yMax = Math.max(...ys) * 1.15;
    const sMax = Math.max(...sizes);
    const sMin = Math.min(...sizes);
    const xScale = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin)) * INNER_W;
    const yScale = (v: number) => PAD.top + INNER_H - ((v - yMin) / (yMax - yMin)) * INNER_H;
    const sizeScale = (v: number) => {
      const min = 12;
      const max = 38;
      if (sMax === sMin) return (min + max) / 2;
      return min + ((v - sMin) / (sMax - sMin)) * (max - min);
    };
    return { xMin, xMax, yMin, yMax, xScale, yScale, sizeScale };
  }, [points]);

  const focusPoint = points.find((p) => p.isFocus);
  const xMid = (xMin + xMax) / 2;
  const yMid = (yMin + yMax) / 2;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load brand data</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!bm) {
    return <div className="text-center py-20 text-gr-subtle">Loading the strength market landscape...</div>;
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Strategic Landscape
        </p>
        <h1 className="text-4xl font-bold tracking-tight">The Strategy Fingerprint</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Every brand on a 2D plane: color depth (how many colorways per style) versus price
          (median sticker). Dot size = total catalog. Each quadrant is a different go-to-market
          strategy. Where you sit is your strategy whether you mean it or not.
        </p>
      </header>

      {focusPoint && points.length > 0 && (
        <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
          <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
          <p className="text-lg text-gr-text leading-relaxed">
            Gymreapers sits at <b className="text-gr-accent">{focusPoint.x.toFixed(1)} colors/style</b> and a{' '}
            <b className="text-gr-accent">${focusPoint.y.toFixed(0)} median price</b>{' '}
            with <b>{focusPoint.size.toLocaleString()}</b> products in catalog.
            {focusPoint.x < xMid && focusPoint.y > yMid && (
              <> That places us in the <b>premium minimalist</b> quadrant — alongside SBD-style positioning. Lean colorways, premium pricing, deliberate restraint.</>
            )}
            {focusPoint.x > xMid && focusPoint.y > yMid && (
              <> That places us in the <b>premium fashion</b> quadrant — premium pricing with broader color depth.</>
            )}
            {focusPoint.x < xMid && focusPoint.y < yMid && (
              <> That places us in the <b>value commodity</b> quadrant — leaner colors, value pricing.</>
            )}
            {focusPoint.x > xMid && focusPoint.y < yMid && (
              <> That places us in the <b>value variety</b> quadrant — many colors at value pricing.</>
            )}
          </p>
          <p className="text-gr-muted text-base mt-3 leading-relaxed">
            <span className="text-gr-text font-bold">Decision lens:</span> brands that succeed long-term lean
            into one strategy and own it. The risk for Gymreapers is sitting in the middle of the field —
            neither the cheapest nor the most premium, neither the leanest nor the deepest. Pick a corner
            and double down, or accept a "balanced" identity and commit to story-telling that justifies it.
          </p>
        </section>
      )}

      <section>
        <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Evidence</div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">
          Strength Market — Color Depth × Price
        </h2>

        <div className="bg-gr-surface border border-gr-border rounded-md p-4 overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 600 }}>
            {/* Quadrant backgrounds */}
            <rect x={PAD.left} y={PAD.top} width={INNER_W / 2} height={INNER_H / 2} fill="#1f1f1f" opacity={0.4} />
            <rect x={PAD.left + INNER_W / 2} y={PAD.top} width={INNER_W / 2} height={INNER_H / 2} fill="#1f1f1f" opacity={0.55} />
            <rect x={PAD.left} y={PAD.top + INNER_H / 2} width={INNER_W / 2} height={INNER_H / 2} fill="#141414" opacity={0.4} />
            <rect x={PAD.left + INNER_W / 2} y={PAD.top + INNER_H / 2} width={INNER_W / 2} height={INNER_H / 2} fill="#141414" opacity={0.55} />

            {/* Quadrant labels */}
            <text x={PAD.left + 12} y={PAD.top + 22} fill="#6b6b6b" fontSize={11} fontFamily="monospace" letterSpacing="2">
              PREMIUM · LEAN COLORS
            </text>
            <text x={W - PAD.right - 12} y={PAD.top + 22} fill="#6b6b6b" fontSize={11} fontFamily="monospace" textAnchor="end" letterSpacing="2">
              PREMIUM · DEEP COLORS
            </text>
            <text x={PAD.left + 12} y={H - PAD.bottom - 12} fill="#6b6b6b" fontSize={11} fontFamily="monospace" letterSpacing="2">
              VALUE · LEAN COLORS
            </text>
            <text x={W - PAD.right - 12} y={H - PAD.bottom - 12} fill="#6b6b6b" fontSize={11} fontFamily="monospace" textAnchor="end" letterSpacing="2">
              VALUE · DEEP COLORS
            </text>

            {/* Axis lines */}
            <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke="#3a3a3a" strokeWidth={1} />
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom} stroke="#3a3a3a" strokeWidth={1} />

            {/* Mid lines */}
            <line x1={PAD.left + INNER_W / 2} y1={PAD.top} x2={PAD.left + INNER_W / 2} y2={H - PAD.bottom} stroke="#2a2a2a" strokeWidth={1} strokeDasharray="3,3" />
            <line x1={PAD.left} y1={PAD.top + INNER_H / 2} x2={W - PAD.right} y2={PAD.top + INNER_H / 2} stroke="#2a2a2a" strokeWidth={1} strokeDasharray="3,3" />

            {/* X-axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const v = xMin + (xMax - xMin) * t;
              return (
                <g key={`x-${t}`}>
                  <line
                    x1={PAD.left + INNER_W * t}
                    y1={H - PAD.bottom}
                    x2={PAD.left + INNER_W * t}
                    y2={H - PAD.bottom + 5}
                    stroke="#3a3a3a"
                  />
                  <text
                    x={PAD.left + INNER_W * t}
                    y={H - PAD.bottom + 18}
                    fill="#a3a3a3"
                    fontSize={11}
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {v.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Y-axis ticks */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const v = yMin + (yMax - yMin) * (1 - t);
              return (
                <g key={`y-${t}`}>
                  <line
                    x1={PAD.left - 5}
                    y1={PAD.top + INNER_H * t}
                    x2={PAD.left}
                    y2={PAD.top + INNER_H * t}
                    stroke="#3a3a3a"
                  />
                  <text
                    x={PAD.left - 10}
                    y={PAD.top + INNER_H * t + 4}
                    fill="#a3a3a3"
                    fontSize={11}
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    ${v.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Axis labels */}
            <text
              x={PAD.left + INNER_W / 2}
              y={H - 14}
              fill="#f5f5f5"
              fontSize={12}
              fontFamily="monospace"
              textAnchor="middle"
              letterSpacing="2"
            >
              COLORS PER STYLE →
            </text>
            <text
              x={20}
              y={PAD.top + INNER_H / 2}
              fill="#f5f5f5"
              fontSize={12}
              fontFamily="monospace"
              textAnchor="middle"
              letterSpacing="2"
              transform={`rotate(-90 20 ${PAD.top + INNER_H / 2})`}
            >
              MEDIAN PRICE ($) →
            </text>

            {/* Points + labels — render focus last so it's on top */}
            {points
              .slice()
              .sort((a, b) => (a.isFocus ? 1 : 0) - (b.isFocus ? 1 : 0))
              .map((p) => {
                const cx = xScale(p.x);
                const cy = yScale(p.y);
                const r = sizeScale(p.size);
                const fill = p.isFocus ? '#dc2626' : '#f5f5f5';
                const stroke = p.isFocus ? '#ef4444' : '#0a0a0a';
                return (
                  <g key={p.slug}>
                    <circle cx={cx} cy={cy} r={r} fill={fill} fillOpacity={p.isFocus ? 0.85 : 0.65} stroke={stroke} strokeWidth={2} />
                    <text
                      x={cx}
                      y={cy + r + 14}
                      fill={p.isFocus ? '#dc2626' : '#f5f5f5'}
                      fontSize={12}
                      fontWeight={p.isFocus ? 700 : 600}
                      textAnchor="middle"
                    >
                      {p.label}
                    </text>
                    <text
                      x={cx}
                      y={cy + r + 28}
                      fill="#6b6b6b"
                      fontSize={10}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {p.x.toFixed(1)} · ${p.y.toFixed(0)}
                    </text>
                  </g>
                );
              })}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gr-muted font-mono">
          <span>
            <span className="inline-block w-3 h-3 rounded-full bg-gr-accent align-middle mr-1.5" />
            Gymreapers
          </span>
          <span>
            <span className="inline-block w-3 h-3 rounded-full bg-gr-text align-middle mr-1.5" />
            Strength market peers
          </span>
          <span className="text-gr-subtle">·</span>
          <span>Larger dot = larger catalog</span>
          <span className="text-gr-subtle">·</span>
          <span>Quadrants = strategic positioning</span>
        </div>
      </section>
    </div>
  );
}
