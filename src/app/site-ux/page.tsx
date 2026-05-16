'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const FOCUS_BRAND = 'gymreapers';

interface BrandRow {
  brand_slug: string;
  brand_name: string;
  url: string;
  performance: {
    score: number | null;
    lcp_ms: number | null;
    cls: number | null;
    tbt_ms: number | null;
  };
  accessibility: number | null;
  best_practices: number | null;
  seo: number | null;
  page_weight_kb: number | null;
  structure: {
    primary_nav_count: number;
    nav_labels: string[];
    hero_cta_count: number;
    hero_cta_labels: string[];
  };
  features: {
    has_email_signup: boolean;
    has_chat_widget: boolean;
    has_quiz: boolean;
    has_size_guide_promoted: boolean;
    has_loyalty_promoted: boolean;
    has_subscription_promoted: boolean;
  };
  pdp: {
    url: string | null;
    review_count: number | null;
    avg_rating: number | null;
    has_video: boolean;
    has_size_chart: boolean;
    has_fit_tool: boolean;
    image_count: number;
  };
  homepage_title: string | null;
  meta_description: string | null;
  notes: string | null;
  captured_at: string | null;
}

interface Payload {
  available: boolean;
  snapshot_date: string | null;
  brands: BrandRow[];
  brand_names: Record<string, string>;
}

type PdpSortKey = 'review_count' | 'avg_rating' | 'image_count' | 'brand';

function KpiTile({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gr-surface rounded-md border border-gr-border p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-1.5">{label}</div>
      <div className="text-2xl font-bold text-gr-text tabular-nums">{value}</div>
      {sub && <div className="text-xs text-gr-muted mt-1">{sub}</div>}
    </div>
  );
}

function PerfBar({ row, maxScore }: { row: BrandRow; maxScore: number }) {
  const score = row.performance.score;
  const isFocus = row.brand_slug === FOCUS_BRAND;
  const blocked = (row.notes || '').startsWith('blocked');
  const pct = score == null ? 0 : (score / Math.max(maxScore, 1)) * 100;
  const tone =
    score == null
      ? 'bg-gr-raised'
      : score >= 80
      ? 'bg-gr-success'
      : score >= 50
      ? 'bg-gr-accent'
      : 'bg-gr-danger';
  return (
    <div className={`flex items-center gap-3 ${isFocus ? 'ring-2 ring-gr-accent rounded p-2 -m-2' : ''}`}>
      <div className="w-40 text-sm text-gr-text font-semibold truncate" title={row.brand_name}>
        {row.brand_name}
      </div>
      <div className="flex-1 h-3 rounded bg-gr-raised overflow-hidden">
        <div className={`${tone} h-full`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-16 text-right text-sm font-bold tabular-nums text-gr-text">
        {score == null ? (blocked ? 'blocked' : 'n/a') : score}
      </div>
    </div>
  );
}

const FEATURE_COLS: Array<{ key: keyof BrandRow['features']; label: string }> = [
  { key: 'has_email_signup',         label: 'Email signup' },
  { key: 'has_chat_widget',          label: 'Chat widget' },
  { key: 'has_quiz',                 label: 'Quiz / fit finder' },
  { key: 'has_size_guide_promoted',  label: 'Size guide' },
  { key: 'has_loyalty_promoted',     label: 'Loyalty' },
  { key: 'has_subscription_promoted', label: 'Subscription' },
];

function YesNo({ on }: { on: boolean }) {
  return on ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gr-success/20 text-gr-success text-sm font-bold">y</span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gr-raised text-gr-subtle text-sm">-</span>
  );
}

export default function SiteUxPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdpSortKey, setPdpSortKey] = useState<PdpSortKey>('review_count');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/site-ux`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const brands = data?.brands ?? [];

  // For each visualization we want different sort orders, kept in useMemo.
  const perfSorted = useMemo(() => {
    return [...brands]
      .filter((b) => !(b.notes || '').startsWith('blocked'))
      .sort((a, b) => (b.performance.score ?? -1) - (a.performance.score ?? -1));
  }, [brands]);

  const kpis = useMemo(() => {
    const withScore = brands.filter((b) => b.performance.score != null);
    const avg =
      withScore.length === 0
        ? 0
        : Math.round(
            withScore.reduce((s, b) => s + (b.performance.score || 0), 0) / withScore.length,
          );
    const chatCount = brands.filter((b) => b.features.has_chat_widget).length;
    const quizCount = brands.filter((b) => b.features.has_quiz).length;
    const subCount = brands.filter((b) => b.features.has_subscription_promoted).length;

    let grRank: string = 'n/a';
    if (perfSorted.length) {
      const idx = perfSorted.findIndex((b) => b.brand_slug === FOCUS_BRAND);
      if (idx >= 0) grRank = `${idx + 1} of ${perfSorted.length}`;
    }
    return { avg, chatCount, quizCount, subCount, grRank };
  }, [brands, perfSorted]);

  const pdpSorted = useMemo(() => {
    const arr = [...brands];
    arr.sort((a, b) => {
      if (pdpSortKey === 'brand') return a.brand_name.localeCompare(b.brand_name);
      const av = pdpSortKey === 'review_count' ? a.pdp.review_count ?? -1
        : pdpSortKey === 'avg_rating' ? a.pdp.avg_rating ?? -1
        : a.pdp.image_count ?? -1;
      const bv = pdpSortKey === 'review_count' ? b.pdp.review_count ?? -1
        : pdpSortKey === 'avg_rating' ? b.pdp.avg_rating ?? -1
        : b.pdp.image_count ?? -1;
      return bv - av;
    });
    return arr;
  }, [brands, pdpSortKey]);

  const maxScore = useMemo(
    () => Math.max(100, ...brands.map((b) => b.performance.score || 0)),
    [brands],
  );

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading site UX...</div>;
  if (error)   return <div className="text-center py-20 text-gr-danger">{error}</div>;

  if (!data?.available || !brands.length) {
    return (
      <div className="space-y-8">
        <header className="pb-2">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product + Marketing &middot; Site UX
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text mt-3">
            How each store performs and what it emphasizes
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No snapshots yet
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            Run the site-ux-monitor agent to capture a snapshot. From the Pi:{' '}
            <code className="bg-gr-bg px-1.5 py-0.5 rounded">
              cd /mnt/data/agents/site-ux-monitor &amp;&amp; python3 main.py
            </code>
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product + Marketing &middot; Site UX
          </p>
          <ConfidenceBadge source="shopify_catalog" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          How each store performs and what it emphasizes
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Weekly PageSpeed Insights plus structural signals from each brand&apos;s homepage and a
          sample PDP. Tells you who loads fast, who has the cleanest nav, who pushes loyalty,
          subscription, or quiz CTAs, and what they emphasize on product pages. Useful for
          Gymreapers&apos; own site decisions: copy what works, avoid what doesn&apos;t.
        </p>
      </header>

      <SectionExplainer
        what="Every brand in the competitive set, captured weekly. Performance scores are Lighthouse mobile (0-100). The feature matrix and PDP table read straight from the brand's HTML."
        howToRead="Performance score is one shot in time; Lighthouse moves 5-10 points run to run, so trust trends over single values. A row marked 'blocked' means the Pi cannot fetch the homepage from this datacenter IP (Lululemon, sometimes Athleta). The PDP table samples one popular product per brand - it is illustrative, not exhaustive."
        whatToDo="Use this as a checklist for our own site. If 8 of 14 peers run a quiz and we do not, that is a roadmap item. If we are bottom-quartile on performance, that is engineering. If our PDP image count is half the average, that is creative."
      />

      {/* KPI strip */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiTile
            label="Avg performance"
            value={kpis.avg}
            sub={`across ${brands.filter((b) => b.performance.score != null).length} brands`}
          />
          <KpiTile label="Chat widgets" value={`${kpis.chatCount}/${brands.length}`} sub="live chat on homepage" />
          <KpiTile label="Quiz / fit finders" value={`${kpis.quizCount}/${brands.length}`} sub="onsite quiz CTA" />
          <KpiTile label="Subscription pushes" value={`${kpis.subCount}/${brands.length}`} sub="subscribe / auto-deliver" />
          <KpiTile label="Gymreapers rank" value={kpis.grRank} sub="performance score" />
        </div>
      </section>

      {/* Performance bar chart */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">
              Mobile performance
            </p>
            <h2 className="text-xl font-bold text-gr-text tracking-tight mt-0.5">
              Lighthouse score, sorted
            </h2>
          </div>
          {data.snapshot_date && (
            <span className="text-xs text-gr-subtle tabular-nums">snapshot {data.snapshot_date}</span>
          )}
        </div>
        <div className="space-y-2.5">
          {perfSorted.map((b) => (
            <PerfBar key={b.brand_slug} row={b} maxScore={maxScore} />
          ))}
          {brands
            .filter((b) => (b.notes || '').startsWith('blocked'))
            .map((b) => (
              <PerfBar key={b.brand_slug} row={b} maxScore={maxScore} />
            ))}
        </div>
      </section>

      {/* Feature matrix */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-6 overflow-x-auto">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">
            Homepage features
          </p>
          <h2 className="text-xl font-bold text-gr-text tracking-tight mt-0.5">
            What each store leads with
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-gr-subtle">
              <th className="text-left font-bold pb-3 pr-4">Brand</th>
              {FEATURE_COLS.map((c) => (
                <th key={c.key} className="text-center font-bold pb-3 px-3">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => {
              const isFocus = b.brand_slug === FOCUS_BRAND;
              return (
                <tr
                  key={b.brand_slug}
                  className={`border-t border-gr-border ${isFocus ? 'bg-gr-accent-soft/30' : ''}`}
                >
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold text-gr-text">{b.brand_name}</div>
                    {(b.notes || '').startsWith('blocked') && (
                      <div className="text-[10px] uppercase tracking-wider text-gr-danger mt-0.5">blocked</div>
                    )}
                  </td>
                  {FEATURE_COLS.map((c) => (
                    <td key={c.key} className="text-center py-2.5 px-3">
                      <YesNo on={!!b.features[c.key]} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* PDP comparison */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-6 overflow-x-auto">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">
              PDP signal
            </p>
            <h2 className="text-xl font-bold text-gr-text tracking-tight mt-0.5">
              Sample product page comparison
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gr-subtle uppercase tracking-wider">sort</span>
            {(['review_count', 'avg_rating', 'image_count', 'brand'] as PdpSortKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setPdpSortKey(k);
                  trackEvent('click', { label: 'site_ux_pdp_sort', metadata: { sort: k } });
                }}
                className={`px-2 py-1 rounded font-bold uppercase tracking-wider ${
                  pdpSortKey === k
                    ? 'bg-gr-accent-soft text-gr-accent'
                    : 'bg-gr-bg border border-gr-border text-gr-muted hover:text-gr-text'
                }`}
              >
                {k.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.18em] text-gr-subtle">
              <th className="text-left font-bold pb-3 pr-4">Brand</th>
              <th className="text-right font-bold pb-3 px-3">Reviews</th>
              <th className="text-right font-bold pb-3 px-3">Avg rating</th>
              <th className="text-right font-bold pb-3 px-3">Images</th>
              <th className="text-center font-bold pb-3 px-3">Video</th>
              <th className="text-center font-bold pb-3 px-3">Size chart</th>
              <th className="text-center font-bold pb-3 px-3">Fit tool</th>
            </tr>
          </thead>
          <tbody>
            {pdpSorted.map((b) => {
              const isFocus = b.brand_slug === FOCUS_BRAND;
              return (
                <tr
                  key={b.brand_slug}
                  className={`border-t border-gr-border ${isFocus ? 'bg-gr-accent-soft/30' : ''}`}
                >
                  <td className="py-2.5 pr-4">
                    <div className="font-semibold text-gr-text">{b.brand_name}</div>
                    {b.pdp.url && (
                      <a
                        href={b.pdp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-gr-subtle hover:text-gr-accent block truncate max-w-[260px]"
                      >
                        {b.pdp.url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </td>
                  <td className="text-right tabular-nums text-gr-text py-2.5 px-3">
                    {b.pdp.review_count == null ? '-' : b.pdp.review_count.toLocaleString()}
                  </td>
                  <td className="text-right tabular-nums text-gr-text py-2.5 px-3">
                    {b.pdp.avg_rating == null ? '-' : b.pdp.avg_rating.toFixed(1)}
                  </td>
                  <td className="text-right tabular-nums text-gr-text py-2.5 px-3">
                    {b.pdp.image_count || '-'}
                  </td>
                  <td className="text-center py-2.5 px-3"><YesNo on={b.pdp.has_video} /></td>
                  <td className="text-center py-2.5 px-3"><YesNo on={b.pdp.has_size_chart} /></td>
                  <td className="text-center py-2.5 px-3"><YesNo on={b.pdp.has_fit_tool} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Nav label chips */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">
            Nav structure
          </p>
          <h2 className="text-xl font-bold text-gr-text tracking-tight mt-0.5">
            What each brand emphasizes first
          </h2>
          <p className="text-xs text-gr-muted mt-1">
            Top-level nav labels in the order they appear. Blanks mean the parser could not anchor a nav element.
          </p>
        </div>
        <div className="space-y-4">
          {brands.map((b) => {
            const isFocus = b.brand_slug === FOCUS_BRAND;
            const labels = (b.structure.nav_labels || []).slice(0, 8);
            return (
              <div
                key={b.brand_slug}
                className={`flex items-start gap-4 ${
                  isFocus ? 'ring-2 ring-gr-accent rounded p-2 -m-2' : ''
                }`}
              >
                <div className="w-40 shrink-0">
                  <div className="text-sm font-semibold text-gr-text">{b.brand_name}</div>
                  <div className="text-[10px] text-gr-subtle tabular-nums mt-0.5">
                    {b.structure.primary_nav_count} item{b.structure.primary_nav_count === 1 ? '' : 's'}
                  </div>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {labels.length === 0 ? (
                    <span className="text-xs text-gr-subtle italic">no nav captured</span>
                  ) : (
                    labels.map((l) => (
                      <span
                        key={l}
                        className="px-2 py-1 rounded text-xs bg-gr-bg border border-gr-border text-gr-text"
                      >
                        {l}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="text-xs text-gr-subtle">
        Source:{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">
          gymreapers_competitive.site_ux_snapshots
        </code>
        {data.snapshot_date && (
          <>
            <span className="mx-2">&middot;</span>
            <span>snapshot {data.snapshot_date}</span>
          </>
        )}
      </div>
    </div>
  );
}
