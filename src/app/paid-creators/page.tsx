'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

// Signal labels match the writer in paid-creator-detector/classifier.py.
type PaidSignal = 'paid_ad' | 'partnership' | 'gifted' | 'affiliate' | 'organic' | 'unknown';
type Confidence = 'high' | 'medium' | 'low';

interface VelocityRow {
  brand_slug: string;
  paid_signal: PaidSignal | null;
  paid_signal_confidence: Confidence | null;
  posts_30d: number | null;
  posts_per_week: number | null;
  avg_views: number | null;
  avg_engagement_rate: number | null;
  last_seen_at: string | null;
}

interface RecentPost {
  brand_slug: string;
  platform: string;
  creator_handle: string | null;
  title: string | null;
  post_url: string;
  view_count: number | null;
  like_count: number | null;
  engagement_rate: number | null;
  paid_signal: PaidSignal | null;
  paid_signal_confidence: Confidence | null;
  paid_signal_source: string | null;
  posted_at: string | null;
}

interface ApiResponse {
  available: boolean;
  velocity_30d: VelocityRow[];
  recent_posts: RecentPost[];
  brand_names: Record<string, string>;
  error?: string;
}

// Paid signal display config. Order = display order in stacked bars.
// Colors: paid types use accent tones, organic uses muted, unknown is subtle.
const SIGNAL_META: Record<PaidSignal, {
  label: string;
  short: string;
  bar: string;
  pill: string;
  isPaid: boolean;
}> = {
  paid_ad:     { label: 'Paid ad',     short: 'AD',  bar: 'bg-gr-accent',         pill: 'bg-gr-accent/20 text-gr-accent',          isPaid: true },
  partnership: { label: 'Partnership', short: 'PT',  bar: 'bg-gr-accent/70',      pill: 'bg-gr-accent/15 text-gr-accent',          isPaid: true },
  gifted:      { label: 'Gifted',      short: 'GF',  bar: 'bg-gr-accent-soft',    pill: 'bg-gr-accent-soft/40 text-gr-accent',     isPaid: true },
  affiliate:   { label: 'Affiliate',   short: 'AF',  bar: 'bg-gr-accent/40',      pill: 'bg-gr-accent/10 text-gr-accent',          isPaid: true },
  organic:     { label: 'Organic',     short: 'OR',  bar: 'bg-gr-muted/40',       pill: 'bg-gr-raised text-gr-muted',              isPaid: false },
  unknown:     { label: 'Unknown',     short: 'UK',  bar: 'bg-gr-border',         pill: 'bg-gr-bg text-gr-subtle',                 isPaid: false },
};

const SIGNAL_ORDER: PaidSignal[] = ['paid_ad', 'partnership', 'gifted', 'affiliate', 'organic', 'unknown'];

const CONFIDENCE_DOT: Record<Confidence, string> = {
  high: 'bg-gr-success',
  medium: 'bg-gr-accent',
  low: 'bg-gr-subtle',
};

function fmtInt(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '-';
  return Math.round(n as number).toLocaleString();
}

function fmtPctEng(n: number | null | undefined): string {
  if (n == null || isNaN(n as number)) return '-';
  return `${((n as number) * 100).toFixed(2)}%`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(s: string | null, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n - 1) + '...';
}

export default function PaidCreatorsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [signalFilter, setSignalFilter] = useState<PaidSignal | 'all' | 'paid'>('all');
  const [brandFilter, setBrandFilter] = useState<string | null>(null);
  const [highOnly, setHighOnly] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/paid-creators`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ApiResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Roll the velocity rows up by brand, then by signal. The API returns one
  // row per (brand, signal, confidence) so the same brand+signal can appear
  // twice if both confidence tiers have data.
  const brandRollup = useMemo(() => {
    if (!data) return [] as Array<{
      brand_slug: string;
      total_posts: number;
      paid_posts: number;
      organic_posts: number;
      bySignal: Record<PaidSignal, number>;
      bestAvgViews: number;
      lastSeen: string | null;
    }>;

    const byBrand = new Map<string, {
      brand_slug: string;
      total_posts: number;
      paid_posts: number;
      organic_posts: number;
      bySignal: Record<PaidSignal, number>;
      bestAvgViews: number;
      lastSeen: string | null;
    }>();

    for (const v of data.velocity_30d || []) {
      const slug = v.brand_slug;
      const signal = (v.paid_signal || 'unknown') as PaidSignal;
      const posts = v.posts_30d || 0;
      const meta = SIGNAL_META[signal] || SIGNAL_META.unknown;

      const cur = byBrand.get(slug) || {
        brand_slug: slug,
        total_posts: 0,
        paid_posts: 0,
        organic_posts: 0,
        bySignal: { paid_ad: 0, partnership: 0, gifted: 0, affiliate: 0, organic: 0, unknown: 0 },
        bestAvgViews: 0,
        lastSeen: null as string | null,
      };
      cur.total_posts += posts;
      if (meta.isPaid) cur.paid_posts += posts;
      else cur.organic_posts += posts;
      cur.bySignal[signal] = (cur.bySignal[signal] || 0) + posts;
      if ((v.avg_views || 0) > cur.bestAvgViews) cur.bestAvgViews = v.avg_views || 0;
      if (v.last_seen_at && (!cur.lastSeen || v.last_seen_at > cur.lastSeen)) {
        cur.lastSeen = v.last_seen_at;
      }
      byBrand.set(slug, cur);
    }

    const list = Array.from(byBrand.values());
    list.sort((a, b) => b.paid_posts - a.paid_posts || b.total_posts - a.total_posts);
    return list;
  }, [data]);

  // KPI strip data.
  const kpis = useMemo(() => {
    const totalClassified = brandRollup.reduce((s, b) => s + b.total_posts, 0);
    const totalPaid = brandRollup.reduce((s, b) => s + b.paid_posts, 0);
    const brandsWithPaid = brandRollup.filter((b) => b.paid_posts > 0).length;
    const topBrand = brandRollup[0]?.brand_slug || '';
    return { totalClassified, totalPaid, brandsWithPaid, topBrand };
  }, [brandRollup]);

  // Top-3 creator handles per brand, from recent_posts.
  const creatorsByBrand = useMemo(() => {
    if (!data) return new Map<string, string[]>();
    const counts = new Map<string, Map<string, number>>();
    for (const p of data.recent_posts || []) {
      if (!p.creator_handle) continue;
      if (!counts.has(p.brand_slug)) counts.set(p.brand_slug, new Map());
      const m = counts.get(p.brand_slug)!;
      m.set(p.creator_handle, (m.get(p.creator_handle) || 0) + 1);
    }
    const out = new Map<string, string[]>();
    for (const [slug, m] of counts) {
      const top = Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([h]) => h);
      out.set(slug, top);
    }
    return out;
  }, [data]);

  // Filtered recent posts table.
  const filteredPosts = useMemo(() => {
    if (!data) return [] as RecentPost[];
    let list = [...(data.recent_posts || [])];
    if (brandFilter) list = list.filter((p) => p.brand_slug === brandFilter);
    if (signalFilter === 'paid') {
      list = list.filter((p) => {
        const m = SIGNAL_META[(p.paid_signal || 'unknown') as PaidSignal];
        return m?.isPaid;
      });
    } else if (signalFilter !== 'all') {
      list = list.filter((p) => p.paid_signal === signalFilter);
    }
    if (highOnly) list = list.filter((p) => p.paid_signal_confidence === 'high');
    return list;
  }, [data, brandFilter, signalFilter, highOnly]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading paid creators...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing &middot; Paid Creators
            </p>
            <ConfidenceBadge source="paid_classifier" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Sponsored vs organic UGC velocity per brand
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Paid classifier still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The paid-creator-detector needs at least one run before this page renders. Daily
            6:45 AM ET; check back tomorrow or trigger a run manually.
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
            For Marketing &middot; Paid Creators
          </p>
          <ConfidenceBadge source="paid_classifier" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Sponsored vs organic UGC velocity per brand
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          What is the paid amplification spend signal behind each brand&apos;s creator
          presence? Classified by hashtag rules first (high confidence) with an LLM fallback
          for ambiguous text (medium / low). High-confidence rows are explicit FTC disclosures;
          low-confidence rows are inferred from context.
        </p>
      </header>

      <SectionExplainer
        what="Each brand card shows the last 30 days of creator posts broken down by paid signal type. Stacked bar lengths are proportional to post counts; the row at the bottom is the dominant signal."
        howToRead="High confidence = an explicit marker in the post text (#ad, #partner, amzn.to/, etc.). Medium / low = inferred by the LLM fallback. Filter chips below the cards narrow the post table to a single signal or brand."
        whatToDo="Brands with high paid_ad or partnership volume are spending on creator amplification. Brands skewing affiliate are recruiting commission-paid creators rather than upfront sponsoring. Use this to calibrate Gymreapers' own creator pipeline against the competitive set."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Posts classified</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{fmtInt(kpis.totalClassified)}</div>
          <div className="text-xs text-gr-muted mt-1">over the last 30 days</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Paid posts (30d)</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{fmtInt(kpis.totalPaid)}</div>
          <div className="text-xs text-gr-muted mt-1">ad + partner + gifted + affiliate</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Brands with paid signal</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.brandsWithPaid}</div>
          <div className="text-xs text-gr-muted mt-1">at least one paid post detected</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Top paid spender</div>
          <div className="text-xl font-bold text-gr-text leading-tight">
            {data.brand_names[kpis.topBrand] || kpis.topBrand || '-'}
          </div>
          <div className="text-xs text-gr-muted mt-1">most paid posts in 30d</div>
        </div>
      </section>

      {/* Per-brand cards */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">Brand-by-brand mix</h2>
          <div className="text-xs text-gr-subtle">Click a brand to filter the table below.</div>
        </div>
        {brandRollup.length === 0 ? (
          <p className="text-sm text-gr-muted py-6">No classified posts in the last 30 days.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {brandRollup.map((b) => {
              const name = data.brand_names[b.brand_slug] || b.brand_slug;
              const isActive = brandFilter === b.brand_slug;
              const creators = creatorsByBrand.get(b.brand_slug) || [];
              const paidPct = b.total_posts > 0 ? (b.paid_posts / b.total_posts) * 100 : 0;
              return (
                <button
                  key={b.brand_slug}
                  type="button"
                  onClick={() => {
                    const next = isActive ? null : b.brand_slug;
                    setBrandFilter(next);
                    trackEvent('click', {
                      label: 'paid_creator_brand_card',
                      metadata: { brand: b.brand_slug },
                    });
                  }}
                  className={`text-left bg-gr-surface rounded-md border p-5 transition ${
                    isActive
                      ? 'border-gr-accent ring-1 ring-gr-accent'
                      : 'border-gr-border hover:border-gr-muted'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-3">
                    <div className="font-bold text-gr-text text-base truncate" title={name}>{name}</div>
                    <div className="text-xs text-gr-subtle tabular-nums">{b.total_posts} posts</div>
                  </div>

                  {/* Stacked bar */}
                  <div className="flex h-2.5 rounded overflow-hidden bg-gr-bg mb-3">
                    {SIGNAL_ORDER.map((sig) => {
                      const n = b.bySignal[sig] || 0;
                      if (n === 0 || b.total_posts === 0) return null;
                      const w = (n / b.total_posts) * 100;
                      const meta = SIGNAL_META[sig];
                      return (
                        <div
                          key={sig}
                          className={meta.bar}
                          style={{ width: `${w}%` }}
                          title={`${meta.label}: ${n} post${n !== 1 ? 's' : ''}`}
                        />
                      );
                    })}
                  </div>

                  {/* Stat strip */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gr-muted mb-3">
                    <span className="text-gr-accent font-bold tabular-nums">{paidPct.toFixed(0)}% paid</span>
                    <span className="text-gr-subtle">&middot;</span>
                    <span>{b.paid_posts} paid</span>
                    <span className="text-gr-subtle">&middot;</span>
                    <span>{b.organic_posts} organic</span>
                  </div>

                  {/* Signal pill row (only non-zero) */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {SIGNAL_ORDER.map((sig) => {
                      const n = b.bySignal[sig] || 0;
                      if (n === 0) return null;
                      const meta = SIGNAL_META[sig];
                      return (
                        <span
                          key={sig}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${meta.pill}`}
                          title={`${meta.label}: ${n}`}
                        >
                          {meta.short} {n}
                        </span>
                      );
                    })}
                  </div>

                  {creators.length > 0 && (
                    <div className="text-[11px] text-gr-subtle">
                      <span className="text-gr-muted">Top creators: </span>
                      {creators.map((h, i) => (
                        <span key={h}>
                          {i > 0 && <span className="text-gr-border">, </span>}
                          <span className="text-gr-muted">{h}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent posts table */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-7">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Recent classified posts ({filteredPosts.length})
          </h2>
        </div>

        {/* Filter chips */}
        <div className="space-y-3 mb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Signal:</span>
            {(['all', 'paid'] as const).concat(SIGNAL_ORDER).map((sig) => {
              const isActive = signalFilter === sig;
              const label = sig === 'all' ? 'All' : sig === 'paid' ? 'Any paid' : SIGNAL_META[sig as PaidSignal].label;
              return (
                <button
                  key={sig}
                  type="button"
                  onClick={() => {
                    setSignalFilter(sig);
                    trackEvent('click', {
                      label: 'paid_creator_signal_chip',
                      metadata: { signal: sig },
                    });
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-gr-accent text-gr-text'
                      : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Brand:</span>
            <button
              type="button"
              onClick={() => {
                setBrandFilter(null);
                trackEvent('click', { label: 'paid_creator_brand_chip', metadata: { brand: 'all' } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                brandFilter === null
                  ? 'bg-gr-accent text-gr-text'
                  : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
              }`}
            >
              All
            </button>
            {brandRollup.map((b) => {
              const name = data.brand_names[b.brand_slug] || b.brand_slug;
              const isActive = brandFilter === b.brand_slug;
              return (
                <button
                  key={b.brand_slug}
                  type="button"
                  onClick={() => {
                    const next = isActive ? null : b.brand_slug;
                    setBrandFilter(next);
                    trackEvent('click', {
                      label: 'paid_creator_brand_chip',
                      metadata: { brand: b.brand_slug },
                    });
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

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Confidence:</span>
            <button
              type="button"
              onClick={() => {
                const next = !highOnly;
                setHighOnly(next);
                trackEvent('click', { label: 'paid_creator_high_only', metadata: { on: next } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                highOnly
                  ? 'bg-gr-accent text-gr-text'
                  : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
              }`}
            >
              High only
            </button>
          </div>
        </div>

        {filteredPosts.length === 0 ? (
          <p className="text-sm text-gr-muted">No posts match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Brand</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Creator</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Signal</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Title</th>
                  <th className="py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Views</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Platform</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Posted</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Conf</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((p, i) => {
                  const sig = (p.paid_signal || 'unknown') as PaidSignal;
                  const meta = SIGNAL_META[sig] || SIGNAL_META.unknown;
                  const conf = (p.paid_signal_confidence || 'low') as Confidence;
                  const dotCls = CONFIDENCE_DOT[conf] || 'bg-gr-border';
                  const brandName = data.brand_names[p.brand_slug] || p.brand_slug;
                  return (
                    <tr key={`${p.brand_slug}-${p.post_url}-${i}`} className={`border-b border-gr-border last:border-0 ${i % 2 === 1 ? 'bg-gr-bg/20' : ''}`}>
                      <td className="py-2.5 px-3 text-gr-text font-medium whitespace-nowrap">{brandName}</td>
                      <td className="py-2.5 px-3 text-gr-muted whitespace-nowrap">{p.creator_handle || '-'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${meta.pill}`}
                          title={p.paid_signal_source || ''}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gr-muted max-w-[420px]">
                        <a
                          href={p.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('click', {
                            label: 'paid_creator_post_link',
                            metadata: { brand: p.brand_slug, signal: sig, platform: p.platform },
                          })}
                          className="hover:text-gr-text underline decoration-gr-border hover:decoration-gr-accent"
                          title={p.title || ''}
                        >
                          {truncate(p.title || '(no title)', 90)}
                        </a>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gr-muted">{fmtInt(p.view_count)}</td>
                      <td className="py-2.5 px-3 text-gr-subtle capitalize">{p.platform}</td>
                      <td className="py-2.5 px-3 text-gr-subtle tabular-nums whitespace-nowrap">{fmtDate(p.posted_at)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${dotCls}`}
                          title={`${conf} confidence - ${p.paid_signal_source || 'no source'}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 text-[11px] text-gr-subtle flex items-center gap-4">
          <span>Confidence dot:</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gr-success" />high (explicit marker)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gr-accent" />medium (LLM inferred)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gr-subtle" />low (weak cue)</span>
        </div>
      </section>

      <div className="text-xs text-gr-subtle">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.creator_posts</code> via
        the <code className="bg-gr-bg px-1.5 py-0.5 rounded">v_paid_creator_velocity_30d</code> view. Classified by
        the paid-creator-detector agent (regex tier-1 + Claude Sonnet 4.6 fallback, $0.20/day budget). Daily 6:45 AM ET.
      </div>
    </div>
  );
}
