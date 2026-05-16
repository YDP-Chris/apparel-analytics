'use client';

/**
 * /exec-brief - CEO-level executive brief.
 *
 * 1-screen synthesis of the most important signal across every dashboard.
 * What Chris walks into a weekly CEO 1:1 with. NOT a daily activity feed
 * (that lives at /today). Apparel-thesis framed; internal-only.
 *
 * Four panels (2x2 on desktop, 1-col on mobile):
 *   1. Apparel thesis update   - top entry candidate + GR apparel SKU count
 *   2. Competitive pressure    - recent launches + promo activity
 *   3. Brand health            - DTC review sentiment + Reddit mentions
 *   4. Leak radar              - TM filings + Gymreapers own filings
 *
 * Bottom strip: decisions-in-flight link + per-source data freshness.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { MetricDelta } from '@/components/MetricDelta';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface TopCandidate {
  subcategory: string;
  stage: string;
  stage_label: string;
  total_score: number;
  gymreapers_count: number;
  peer_max: number;
  peer_max_brand: string | null;
}

interface LaunchItem {
  brand_slug: string;
  brand_name: string | null;
  product_name: string | null;
  url: string | null;
  category: string | null;
  subcategory: string | null;
  first_seen: string | null;
}

interface NoteworthyFiling {
  serial_number: string | null;
  brand_slug: string | null;
  brand_name: string | null;
  mark_text: string | null;
  filing_date: string | null;
  goods_services: string | null;
  source_url: string | null;
  highlighted: boolean;
}

interface DigestStory {
  rank: number;
  title: string;
  summary: string;
  evidence: string;
  so_what: string;
  audience: string;
  tags: string[];
}

interface DailyDigestPayload {
  available: boolean;
  digest_date?: string;
  generated_at?: string;
  headline?: string;
  stories?: DigestStory[];
  brand_focus?: string;
  apparel_thesis_flag?: boolean;
  history?: { digest_date: string; headline: string }[];
}

interface ExecBriefPayload {
  available: boolean;
  generated_at: string;
  week_ending: string;
  snapshot_date: string | null;
  previous_snapshot_date: string | null;
  apparel: {
    top_candidate: TopCandidate | null;
    gr_apparel_skus: number;
    gr_apparel_skus_lw: number | null;
    top_candidate_peer_name: string | null;
  };
  threats: {
    top_launches: LaunchItem[];
    promo_skus_today: number;
    promo_skus_lw: number;
  };
  brand: {
    gr_avg_rating_7d: number | null;
    gr_avg_rating_prior_7d: number | null;
    gr_mentions_7d: number | null;
  };
  leaks: {
    tm_filings_7d: number;
    noteworthy_filings: NoteworthyFiling[];
  };
  decisions_in_flight: number;
  data_freshness: {
    brand_subcategories: string | null;
    price_snapshots: string | null;
    trademarks: string | null;
    dtc_reviews_latest: string | null;
    launches_latest: string | null;
    social_velocity: string | null;
  };
}

function prettySub(s: string | null | undefined): string {
  if (!s) return '-';
  return s.replace(/_/g, ' ');
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '-';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return d;
  }
}

function PanelCard({
  eyebrow,
  title,
  href,
  children,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-gr-border bg-gr-card p-5 space-y-3 flex flex-col">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gr-subtle">{eyebrow}</p>
          <h2 className="text-lg font-bold text-gr-text leading-tight">{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            onClick={() => trackEvent('click', { label: 'exec_brief_panel_link', metadata: { href } })}
            className="text-[11px] font-semibold uppercase tracking-wider text-gr-accent hover:text-gr-accent-hover transition shrink-0"
          >
            Open {'->'}
          </Link>
        )}
      </header>
      <div className="flex-1">{children}</div>
    </section>
  );
}

function audiencePillClass(audience: string): string {
  const a = (audience || '').toLowerCase();
  if (a === 'marketing') return 'bg-gr-accent-soft/40 text-gr-accent';
  if (a === 'product') return 'bg-blue-500/15 text-blue-300';
  if (a === 'ceo') return 'bg-purple-500/15 text-purple-300';
  return 'bg-gr-border/50 text-gr-muted';
}

function DailyDigestPanel({ digest }: { digest: DailyDigestPayload | null }) {
  const hasStories = !!(digest && digest.available && digest.stories && digest.stories.length > 0);
  return (
    <section className="rounded-lg border border-gr-border bg-gr-card p-6 space-y-4">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gr-subtle">
            Today&apos;s 5 stories
          </p>
          <h2 className="text-2xl font-extrabold tracking-tight text-gr-text mt-1">
            {hasStories ? digest!.headline : 'Today’s digest generates at 7 AM ET'}
          </h2>
          {hasStories && (
            <p className="text-[11px] text-gr-subtle mt-2">
              Digest date <span className="font-semibold text-gr-text">{fmtDate(digest!.digest_date)}</span>
              {digest!.apparel_thesis_flag && (
                <span className="ml-3 text-[10px] uppercase tracking-wider font-bold text-gr-accent">
                  Apparel thesis in play
                </span>
              )}
              {digest!.brand_focus && (
                <span className="ml-3 text-[10px] uppercase tracking-wider text-gr-muted">
                  brand focus: <span className="text-gr-text font-semibold">{digest!.brand_focus}</span>
                </span>
              )}
            </p>
          )}
        </div>
      </header>

      {hasStories ? (
        <div className="space-y-3">
          {digest!.stories!.map((s) => (
            <article
              key={s.rank}
              className="rounded-md border border-gr-border/60 bg-gr-bg/40 p-4 flex gap-4"
            >
              <div className="shrink-0">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gr-accent-soft/40 text-gr-accent font-bold text-sm tabular-nums">
                  {s.rank}
                </span>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-gr-text leading-snug">{s.title}</h3>
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${audiencePillClass(
                      s.audience,
                    )}`}
                  >
                    {s.audience || 'both'}
                  </span>
                </div>
                <p className="text-sm text-gr-text leading-relaxed">{s.summary}</p>
                {s.evidence && (
                  <p className="text-[12px] text-gr-muted leading-relaxed">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-gr-subtle mr-1">
                      Evidence
                    </span>
                    {s.evidence}
                  </p>
                )}
                {s.so_what && (
                  <p className="text-[12px] text-gr-text leading-relaxed">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-gr-accent mr-1">
                      So what
                    </span>
                    {s.so_what}
                  </p>
                )}
                {s.tags && s.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {s.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] uppercase tracking-wider font-semibold text-gr-subtle bg-gr-border/30 px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gr-subtle leading-relaxed">
          The daily intel digest will appear here once it generates at 7 AM ET. It pulls the top
          signals from promos, launches, trademarks, complaints, social, and FB ads, then ranks the
          5 most-important stories for the day with marketing/product action items.
        </p>
      )}
    </section>
  );
}

export default function ExecBriefPage() {
  const [data, setData] = useState<ExecBriefPayload | null>(null);
  const [digest, setDigest] = useState<DailyDigestPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    Promise.all([
      fetch(`${PULSE_API}/pulse/exec-brief`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))),
      fetch(`${PULSE_API}/pulse/daily-digest`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : { available: false })),
    ])
      .then(([brief, dig]) => {
        setData(brief as ExecBriefPayload);
        setDigest(dig as DailyDigestPayload);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Promo brand fanout for the threats panel subline.
  const promoBrandsActive = useMemo(() => {
    if (!data) return 0;
    const slugs = new Set<string>();
    for (const l of data.threats.top_launches) {
      if (l.brand_slug) slugs.add(l.brand_slug);
    }
    return slugs.size;
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading exec brief...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data || !data.available) {
    return <div className="text-center py-20 text-gr-subtle">Exec brief unavailable.</div>;
  }

  const { apparel, threats, brand, leaks, decisions_in_flight: decisionsInFlight, data_freshness: freshness } = data;
  const topCand = apparel.top_candidate;
  const ratingDelta =
    brand.gr_avg_rating_7d != null && brand.gr_avg_rating_prior_7d != null
      ? brand.gr_avg_rating_7d - brand.gr_avg_rating_prior_7d
      : null;

  return (
    <div className="space-y-10">
      {/* Header */}
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Internal &middot; CEO Brief
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gr-text mb-2">
          This week at a glance
        </h1>
        <p className="text-gr-muted leading-relaxed max-w-3xl">
          1-screen synthesis of every dashboard&apos;s top signal. What you would tell the CEO this Monday.
          Internal-only Gymreapers apparel thesis framing.
        </p>
        <p className="mt-3 text-xs text-gr-subtle">
          Week ending <span className="font-semibold text-gr-text">{fmtDate(data.week_ending)}</span>
        </p>
      </header>

      {/* Today's 5 stories - daily intel digest */}
      <DailyDigestPanel digest={digest} />

      <SectionExplainer
        what="Four panels: apparel thesis, competitive pressure, brand health, leak radar. Each panel is the single most-important signal from a major dashboard rolled up for a CEO 1:1."
        howToRead="Each number annotated with vs-LW delta where comparable. Green = the metric is moving in the direction the apparel thesis wants. Red = pressure / regression."
        whatToDo="Pick one panel to lead with. Use the Open link on each to drill into the dashboard backing it before the meeting."
      />

      {/* 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Panel 1: Apparel thesis */}
        <PanelCard
          eyebrow="Panel 1 &middot; Apparel thesis"
          title="Where to enter next"
          href="/apparel-entry-candidates"
        >
          {topCand ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
                  Top entry candidate
                </p>
                <p className="text-2xl font-bold text-gr-text capitalize">{prettySub(topCand.subcategory)}</p>
                <p className="text-xs text-gr-muted mt-1">
                  <span className="text-gr-accent font-semibold">{topCand.stage_label}</span>
                  {' '}&middot;{' '}
                  score <span className="font-bold text-gr-text tabular-nums">{topCand.total_score.toFixed(1)}</span>
                  {' / 100'}
                </p>
              </div>
              <div className="text-sm text-gr-text leading-relaxed">
                Gymreapers carries{' '}
                <span className="font-bold tabular-nums">{topCand.gymreapers_count}</span> SKU
                {topCand.gymreapers_count === 1 ? '' : 's'}{' '}
                here vs{' '}
                <span className="font-bold tabular-nums">{topCand.peer_max}</span> at{' '}
                <span className="font-semibold">
                  {apparel.top_candidate_peer_name || topCand.peer_max_brand || 'top peer'}
                </span>{' '}
                (deepest in the bucket).
              </div>
            </div>
          ) : (
            <p className="text-gr-subtle text-sm">No candidate ranking available yet.</p>
          )}
          <div className="mt-4 pt-3 border-t border-gr-border/60">
            <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
              Gymreapers apparel SKU count
            </p>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-2xl font-bold text-gr-text tabular-nums">{apparel.gr_apparel_skus}</span>
              <MetricDelta
                current={apparel.gr_apparel_skus}
                previous={apparel.gr_apparel_skus_lw}
                unit="SKUs"
                compact
              />
            </div>
            <p className="text-[11px] text-gr-subtle mt-1">
              Across all journey stages (training, between-sets, recovery, identity, meet day).
            </p>
          </div>
        </PanelCard>

        {/* Panel 2: Competitive pressure */}
        <PanelCard
          eyebrow="Panel 2 &middot; Competitive pressure"
          title="What peers shipped this week"
          href="/gymreapers/launches"
        >
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-2">
                Top launches, last 7 days
              </p>
              {threats.top_launches.length ? (
                <ul className="space-y-1.5">
                  {threats.top_launches.slice(0, 3).map((l, idx) => (
                    <li key={`${l.brand_slug}-${idx}`} className="text-sm leading-snug">
                      <span className="font-semibold text-gr-text">{l.brand_name || l.brand_slug}</span>
                      <span className="text-gr-subtle"> &middot; </span>
                      {l.url ? (
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => trackEvent('click', { label: 'exec_brief_launch', metadata: { brand: l.brand_slug } })}
                          className="text-gr-text hover:text-gr-accent transition"
                        >
                          {l.product_name || prettySub(l.subcategory) || 'New drop'}
                        </a>
                      ) : (
                        <span className="text-gr-text">{l.product_name || prettySub(l.subcategory) || 'New drop'}</span>
                      )}
                      {l.first_seen && (
                        <span className="text-[10px] text-gr-subtle ml-2">{fmtDateShort(l.first_seen.slice(0, 10))}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gr-subtle text-sm">No new launches captured for apparel peers this week.</p>
              )}
            </div>
            <div className="pt-3 border-t border-gr-border/60">
              <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
                Promo activity right now
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-gr-text tabular-nums">{threats.promo_skus_today}</span>
                <span className="text-xs text-gr-muted">SKUs on sale across {promoBrandsActive || 'apparel'} peer brands</span>
                <MetricDelta
                  current={threats.promo_skus_today}
                  previous={threats.promo_skus_lw}
                  unit="SKUs"
                  compact
                  invertColors
                />
              </div>
              <p className="text-[11px] text-gr-subtle mt-1">
                Higher peer promo intensity = pricing pressure on our DTC.
                {' '}
                <Link href="/promo-calendar" className="text-gr-accent hover:text-gr-accent-hover">Open promo calendar {'->'}</Link>
              </p>
            </div>
          </div>
        </PanelCard>

        {/* Panel 3: Brand health */}
        <PanelCard
          eyebrow="Panel 3 &middot; Brand health"
          title="How customers are talking"
          href="/brands"
        >
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
                DTC review rating, last 7d
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-gr-text tabular-nums">
                  {brand.gr_avg_rating_7d != null ? brand.gr_avg_rating_7d.toFixed(2) : '-'}
                </span>
                <span className="text-xs text-gr-muted">
                  / 5.0
                </span>
                <MetricDelta
                  current={brand.gr_avg_rating_7d}
                  previous={brand.gr_avg_rating_prior_7d}
                  compact
                />
              </div>
              {ratingDelta != null && (
                <p className="text-[11px] text-gr-subtle mt-1">
                  Prior 7d: <span className="tabular-nums">{(brand.gr_avg_rating_prior_7d ?? 0).toFixed(2)}</span>.
                  {' '}
                  {Math.abs(ratingDelta) < 0.05
                    ? 'Flat sentiment.'
                    : ratingDelta > 0
                      ? 'Sentiment improving.'
                      : 'Sentiment dipping - dig in before the CEO does.'}
                </p>
              )}
            </div>
            <div className="pt-3 border-t border-gr-border/60">
              <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
                Reddit mentions, last 7d
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-gr-text tabular-nums">
                  {brand.gr_mentions_7d ?? '-'}
                </span>
                <span className="text-xs text-gr-muted">posts</span>
              </div>
              <p className="text-[11px] text-gr-subtle mt-1">
                <Link href="/for-marketing" className="text-gr-accent hover:text-gr-accent-hover">Open themes {'->'}</Link>
              </p>
            </div>
          </div>
        </PanelCard>

        {/* Panel 4: Leak radar */}
        <PanelCard
          eyebrow="Panel 4 &middot; Leak radar"
          title="What TM filings are telegraphing"
          href="/trademarks"
        >
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1">
                Filings across the set, last 7d
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl font-bold text-gr-text tabular-nums">{leaks.tm_filings_7d}</span>
                <span className="text-xs text-gr-muted">trademark filings</span>
              </div>
            </div>
            {leaks.noteworthy_filings.length ? (
              <div className="pt-3 border-t border-gr-border/60">
                <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-2">
                  Gymreapers own / noteworthy
                </p>
                <ul className="space-y-1.5">
                  {leaks.noteworthy_filings.slice(0, 4).map((f) => (
                    <li key={f.serial_number || `${f.mark_text}-${f.filing_date}`} className="text-sm leading-snug">
                      <span
                        className={`font-semibold ${f.highlighted ? 'text-gr-accent' : 'text-gr-text'}`}
                      >
                        {f.mark_text || 'Unnamed mark'}
                      </span>
                      {f.brand_name && (
                        <span className="text-gr-subtle"> &middot; {f.brand_name}</span>
                      )}
                      {f.filing_date && (
                        <span className="text-[10px] text-gr-subtle ml-2">{fmtDateShort(f.filing_date)}</span>
                      )}
                      {f.highlighted && (
                        <span className="ml-2 text-[9px] uppercase tracking-wider font-bold text-gr-accent bg-gr-accent-soft/50 px-1.5 py-0.5 rounded">
                          Flagged
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gr-subtle text-sm pt-3 border-t border-gr-border/60">
                No Gymreapers filings in the recent window. Watch CARBON X and ENFUSED as the named leaks to keep monitoring.
              </p>
            )}
          </div>
        </PanelCard>
      </div>

      {/* Bottom strip */}
      <footer className="rounded-lg border border-gr-border/60 bg-gr-bg/50 p-5 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <Link
              href="/log"
              onClick={() => trackEvent('click', { label: 'exec_brief_decisions_link' })}
              className="font-bold text-gr-text hover:text-gr-accent transition"
            >
              Decisions in flight: <span className="tabular-nums">{decisionsInFlight}</span> {'->'}
            </Link>
            <span className="text-xs text-gr-subtle ml-2">
              (entries marked pursuing or exploring)
            </span>
          </div>
        </div>
        <div className="text-[11px] text-gr-subtle leading-relaxed">
          Data fresh as of:
          {' '}
          brand mix <span className="font-semibold text-gr-muted">{fmtDate(freshness.brand_subcategories)}</span>
          {' '}&middot;{' '}
          prices <span className="font-semibold text-gr-muted">{fmtDate(freshness.price_snapshots)}</span>
          {' '}&middot;{' '}
          launches <span className="font-semibold text-gr-muted">{fmtDate(freshness.launches_latest)}</span>
          {' '}&middot;{' '}
          DTC reviews <span className="font-semibold text-gr-muted">{fmtDate(freshness.dtc_reviews_latest)}</span>
          {' '}&middot;{' '}
          trademarks <span className="font-semibold text-gr-muted">{fmtDate(freshness.trademarks)}</span>
          {' '}&middot;{' '}
          social <span className="font-semibold text-gr-muted">{fmtDate(freshness.social_velocity)}</span>
        </div>
      </footer>
    </div>
  );
}
