'use client';

/**
 * /today - daily landing page.
 *
 * Reordered 2026-05-16: the daily intel digest is now the lead. The page a
 * marketing or product team member opens first thing should answer "what
 * are the 3-5 things worth knowing today" before anything else. Anomalies
 * sit inline as a strip just under the digest. The 3-tile apparel direction
 * strip is preserved but demoted to the third section. Quick-jump rail
 * gives one-click entry to the most-used dashboards. The old activity
 * feed (where-we're-winning, vulnerable, recent drops, search interest,
 * biggest opportunity) is collapsed by default at the bottom as secondary
 * context.
 *
 * Data sources, all fetched in parallel:
 *   /pulse/daily-digest  - 5-story curated digest (lead)
 *   /pulse/anomalies     - today's anomalies (strip)
 *   /pulse/journey       - apparel direction tile 1
 *   /pulse/promo         - apparel direction tile 3
 *   /pulse/competitive   - via useGymreapersData (tile 2 + activity feed)
 *   /pulse/amazon        - activity feed (Amazon wins / vulns / opp)
 *   /pulse/qa            - data integrity banner
 *
 * Each fetch has its own loading state; a single failed source never
 * breaks the page.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useGymreapersData } from '../gymreapers/_lib/GymreapersProvider';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { trackEvent } from '@/lib/usage';

const PULSE_API =
  process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

// Apparel-tier peer slugs - mirrors GAP_TIER_BRANDS['apparel'] on the webhook
// server. Gymreapers is the focus brand and is excluded from peer tallies.
const APPAREL_TIER_PEERS = new Set<string>([
  'gymshark', 'vuori', 'alo', 'lululemon',
  'rhone', 'outdoor_voices', 'tenthousand', 'athleta',
]);

function prettySub(s: string): string {
  return s.replace(/_/g, ' ');
}

// === Daily digest types =====================================================

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
  nlp_model?: string;
  nlp_cost_usd?: number;
  history?: { digest_date: string; headline: string }[];
}

// === Anomalies types ========================================================

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface AnomalyRow {
  id: number;
  detected_date: string;
  brand_slug: string;
  metric_key: string;
  metric_label: string;
  current_value: number | null;
  baseline_value: number | null;
  delta_pct: number | null;
  direction: 'up' | 'down';
  severity: Severity;
}

interface AnomaliesPayload {
  available: boolean;
  detected_date: string | null;
  today_anomalies: AnomalyRow[];
  summary?: {
    today_count: number;
    by_severity: Record<Severity, number>;
  };
}

// === Amazon types (preserved from prior /today) =============================

interface AmazonCategory {
  slug: string;
  name: string;
  organic_count: number;
  gymreapers: { present: boolean; top_rank: number | null };
  top_5: Array<{
    rank: number | null;
    asin: string;
    title: string;
    price: number | null;
    is_gymreapers?: boolean;
    url: string;
  }>;
  diff?: {
    movers_up: Array<{ asin: string; title: string; delta: number; url: string }>;
  };
}

interface AmazonOpportunity {
  query: string;
  category_name: string;
  total_reviews_in_top_n: number;
  avg_price: number | null;
  concentration_hhi: number;
  top_brands: Array<{ brand: string }>;
  opportunity_score: number;
}

interface AmazonPayload {
  snapshot_date: string;
  last_updated: string;
  totals: {
    categories_tracked: number;
    categories_with_gymreapers: number;
    whitespace_gaps: number;
  };
  categories: AmazonCategory[];
  top_opportunities: AmazonOpportunity[];
}

// === QA types ===============================================================

interface QaPayload {
  available: boolean;
  status_color?: 'green' | 'yellow' | 'red';
  fail_count?: number;
  warn_count?: number;
  finished_at?: string;
  findings?: Array<{
    check_name: string;
    scope: string;
    severity: 'PASS' | 'WARN' | 'FAIL';
    message: string;
  }>;
}

// === Apparel-direction tile types ===========================================

interface JourneyEntryCandidate {
  subcategory: string;
  gymreapers_count: number;
  peer_max: number;
  peer_max_brand_name: string | null;
  delta_vs_avg: number;
  stage_label: string;
}

interface JourneyPayload {
  available: boolean;
  stages?: Array<{
    label: string;
    top_entry_candidates: Array<{
      subcategory: string;
      gymreapers_count: number;
      peer_max: number;
      peer_max_brand_name: string | null;
      delta_vs_avg: number;
    }>;
  }>;
}

interface PromoTodayEvent {
  brand_slug: string;
  product_title: string;
  category: string | null;
  discount_pct: number | null;
}

interface PromoPayload {
  available: boolean;
  today_events?: PromoTodayEvent[];
  brand_names?: Record<string, string>;
}

// === Formatting helpers =====================================================

function fmtDate(d: string | undefined | null): string {
  if (!d) return '-';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtShortDate(d: string | undefined | null): string {
  if (!d) return '-';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtTimeET(iso: string | undefined | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
    });
  } catch {
    return '-';
  }
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '-';
  return `$${p.toFixed(0)}`;
}

function brandLabel(slug: string): string {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function audiencePillClass(audience: string): string {
  const a = (audience || '').toLowerCase();
  if (a === 'marketing') return 'bg-gr-accent-soft/40 text-gr-accent';
  if (a === 'product') return 'bg-blue-500/15 text-blue-300';
  if (a === 'ceo') return 'bg-purple-500/15 text-purple-300';
  return 'bg-gr-border/50 text-gr-muted';
}

const SEVERITY_PILL: Record<Severity, string> = {
  critical: 'bg-gr-danger/25 text-gr-danger',
  high: 'bg-orange-500/25 text-orange-300',
  medium: 'bg-gr-accent-soft text-gr-accent',
  low: 'bg-gr-raised text-gr-muted',
};

// === Quick-jump rail config =================================================

const QUICK_JUMP_TILES: Array<{ href: string; name: string; desc: string }> = [
  { href: '/exec-brief',            name: 'Exec brief',          desc: 'CEO 1:1 single-screen synthesis' },
  { href: '/journey',               name: 'Apparel journey',     desc: 'Where peers are deep and we are thin' },
  { href: '/next-skus',             name: 'Next SKUs',           desc: 'Ranked next-product candidates' },
  { href: '/entry-opportunities',   name: 'Entry opportunities', desc: 'Whitespace gaps to enter' },
  { href: '/competitor-weakness',   name: 'Competitor weakness', desc: 'Where rivals are slipping' },
  { href: '/leak-radar',            name: 'Leak radar',          desc: 'Trademarks, patents, prelaunch' },
  { href: '/promo-calendar',        name: 'Promo calendar',      desc: 'Live discount activity' },
  { href: '/trends',                name: 'Trends',              desc: 'Google Trends WoW + category' },
];

// ===========================================================================

export default function TodayPage() {
  const { data: comp } = useGymreapersData();
  const [digest, setDigest] = useState<DailyDigestPayload | null>(null);
  const [digestLoading, setDigestLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<AnomaliesPayload | null>(null);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);
  const [amz, setAmz] = useState<AmazonPayload | null>(null);
  const [qa, setQa] = useState<QaPayload | null>(null);
  const [qaExpanded, setQaExpanded] = useState(false);
  const [journey, setJourney] = useState<JourneyPayload | null>(null);
  const [promo, setPromo] = useState<PromoPayload | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [amzError, setAmzError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setDigestLoading(false);
      setAnomaliesLoading(false);
      return;
    }

    // Parallel fetches. Each source is independently optional - a failure
    // just hides or empty-states that section.
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${PULSE_API}/pulse/daily-digest`, { headers })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((j: DailyDigestPayload) => setDigest(j))
      .catch(() => setDigest({ available: false }))
      .finally(() => setDigestLoading(false));

    fetch(`${PULSE_API}/pulse/anomalies`, { headers })
      .then((r) => (r.ok ? r.json() : { available: false, today_anomalies: [] }))
      .then((j: AnomaliesPayload) => setAnomalies(j))
      .catch(() => setAnomalies({ available: false, detected_date: null, today_anomalies: [] }))
      .finally(() => setAnomaliesLoading(false));

    fetch(`${PULSE_API}/pulse/amazon`, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: AmazonPayload) => setAmz(j))
      .catch((e) => setAmzError(String(e)));

    // QA banner. Short timeout so a slow QA endpoint never delays the page.
    const qaController = new AbortController();
    const qaTimeout = setTimeout(() => qaController.abort(), 1500);
    fetch(`${PULSE_API}/pulse/qa`, { headers, signal: qaController.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setQa(j))
      .catch(() => {})
      .finally(() => clearTimeout(qaTimeout));

    fetch(`${PULSE_API}/pulse/journey`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setJourney(j))
      .catch(() => {});

    fetch(`${PULSE_API}/pulse/promo`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setPromo(j))
      .catch(() => {});
  }, []);

  // === Digest derived state ===
  const hasDigest = !!(digest && digest.available && digest.stories && digest.stories.length > 0);
  // The digest may be from yesterday if today's hasn't generated yet.
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const digestIsToday = hasDigest && digest!.digest_date === todayIso;
  const totalSignalsCount = useMemo(() => {
    if (!digest?.stories) return 0;
    // Rough proxy: each story's evidence string is the signal recap. We
    // also surface anomaly count + recent launch count to give the "from
    // {N} signals" line some scale.
    const launches = (comp?.launchesSection?.recentDrops || []).length;
    const promos = (promo?.today_events || []).length;
    const anom = anomalies?.today_anomalies?.length || 0;
    return launches + promos + anom + (digest.stories.length || 0);
  }, [digest, comp, promo, anomalies]);

  // === Apparel-direction tile state ===
  let topEntryCandidate: JourneyEntryCandidate | null = null;
  if (journey?.available && journey.stages) {
    const all: JourneyEntryCandidate[] = [];
    for (const stage of journey.stages) {
      for (const c of stage.top_entry_candidates || []) {
        all.push({
          subcategory: c.subcategory,
          gymreapers_count: c.gymreapers_count,
          peer_max: c.peer_max,
          peer_max_brand_name: c.peer_max_brand_name,
          delta_vs_avg: c.delta_vs_avg,
          stage_label: stage.label,
        });
      }
    }
    all.sort((a, b) => a.delta_vs_avg - b.delta_vs_avg);
    topEntryCandidate = all[0] || null;
  }

  let topApparelLauncher: { slug: string; name: string; count: number } | null = null;
  if (comp?.launchesSection?.recentDrops?.length) {
    const counts: Record<string, number> = {};
    for (const drop of comp.launchesSection.recentDrops) {
      if (!APPAREL_TIER_PEERS.has(drop.brand)) continue;
      counts[drop.brand] = (counts[drop.brand] || 0) + 1;
    }
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (ranked.length > 0) {
      const [slug, count] = ranked[0];
      topApparelLauncher = {
        slug,
        name: comp.brand_names[slug] || slug,
        count,
      };
    }
  }

  let apparelPromoToday: { skus: number; topBrand: string | null; brands: number } | null = null;
  if (promo?.available && promo.today_events) {
    const apparelEvents = promo.today_events.filter((e) => APPAREL_TIER_PEERS.has(e.brand_slug));
    if (apparelEvents.length > 0) {
      const byBrand: Record<string, number> = {};
      for (const e of apparelEvents) {
        byBrand[e.brand_slug] = (byBrand[e.brand_slug] || 0) + 1;
      }
      const ranked = Object.entries(byBrand).sort((a, b) => b[1] - a[1]);
      const topSlug = ranked[0][0];
      apparelPromoToday = {
        skus: apparelEvents.length,
        topBrand: promo.brand_names?.[topSlug] || topSlug,
        brands: Object.keys(byBrand).length,
      };
    } else {
      apparelPromoToday = { skus: 0, topBrand: null, brands: 0 };
    }
  }

  const hasAnyApparelTile = topEntryCandidate || topApparelLauncher || apparelPromoToday;

  // === Activity feed (preserved from old /today, demoted) ===
  const wins = (amz?.categories || [])
    .filter((c) => c.gymreapers.present && (c.gymreapers.top_rank ?? 999) <= 5)
    .sort((a, b) => (a.gymreapers.top_rank || 999) - (b.gymreapers.top_rank || 999))
    .slice(0, 5);

  const vulnerabilities: Array<{ name: string; reason: string; href: string }> = [];
  for (const c of amz?.categories || []) {
    if (!c.gymreapers.present && c.organic_count >= 30) {
      vulnerabilities.push({
        name: c.name,
        reason: `Absent from top 100, ${c.organic_count} organic listings - competitor space`,
        href: '/gymreapers/amazon',
      });
    } else if (c.diff?.movers_up?.[0] && c.diff.movers_up[0].delta >= 10) {
      const mover = c.diff.movers_up[0];
      vulnerabilities.push({
        name: c.name,
        reason: `Competitor jumped ${mover.delta} spots: ${mover.title.slice(0, 50)}`,
        href: '/gymreapers/amazon',
      });
    }
  }
  const topVulns = vulnerabilities.slice(0, 4);

  const topOpp = (amz?.top_opportunities || []).find((o) => o.total_reviews_in_top_n > 0);

  const recentLaunches = (comp?.launchesSection?.recentDrops || [])
    .filter((d) => d.brand !== 'gymreapers')
    .slice(0, 5);

  const trendList = Object.entries(comp?.trends || {})
    .map(([slug, t]) => ({
      slug,
      name: comp?.brand_names[slug] || slug,
      ...t,
    }))
    .filter((t) => typeof t.wow_change === 'number');
  const topTrendUp = [...trendList].sort((a, b) => (b.wow_change || 0) - (a.wow_change || 0))[0];
  const topTrendDown = [...trendList].sort((a, b) => (a.wow_change || 0) - (b.wow_change || 0))[0];

  // === Story anchor helper ===
  const onStoryRankClick = (rank: number) => {
    trackEvent('click', {
      label: 'today_story_rank',
      metadata: { rank, digest_date: digest?.digest_date || null },
    });
    if (typeof window !== 'undefined') {
      const el = document.getElementById(`story-${rank}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ----------------------------------------------------------------- RENDER

  return (
    <div className="space-y-12">
      {/* DATA-QA STATUS BANNER - collapsed by default, hidden on green. */}
      {qa && qa.available && qa.status_color !== 'green' && (
        <section
          className={`rounded-md border ${
            qa.status_color === 'red'
              ? 'bg-gr-danger/10 border-gr-danger/60'
              : 'bg-gr-accent-soft/40 border-gr-accent/60'
          }`}
        >
          <button
            type="button"
            onClick={() => setQaExpanded((v) => !v)}
            className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-black/5 transition rounded-md"
            aria-expanded={qaExpanded}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${
              qa.status_color === 'red'
                ? 'bg-gr-danger/20 text-gr-danger animate-pulse'
                : 'bg-gr-accent/20 text-gr-accent'
            }`}>
              !
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold uppercase tracking-[0.15em] ${
                qa.status_color === 'red' ? 'text-gr-danger' : 'text-gr-accent'
              }`}>
                {qa.status_color === 'red'
                  ? `${qa.fail_count} data integrity FAIL`
                  : `${qa.warn_count} data warning${(qa.warn_count || 0) > 1 ? 's' : ''}`}
              </div>
              <div className="text-xs text-gr-muted mt-1">
                {qaExpanded ? 'Click to collapse' : "Click to see what's affected"}
              </div>
            </div>
            <svg
              className={`w-4 h-4 flex-shrink-0 text-gr-muted transition-transform ${qaExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {qaExpanded && (
            <div className="px-5 pb-5 pt-1 border-t border-gr-border/30">
              <div className="text-sm leading-relaxed text-gr-muted pt-3 mb-3">
                The dashboard is still showing the latest data we have, but some of it may be stale
                or incomplete. Verify any number before acting on it.
              </div>
              <div className="space-y-1.5">
                {(qa.findings || []).slice(0, 5).map((f, i) => (
                  <div key={i} className="text-xs font-mono">
                    <span className={`font-bold ${f.severity === 'FAIL' ? 'text-gr-danger' : 'text-gr-accent'}`}>
                      [{f.severity}]
                    </span>{' '}
                    <code className="text-gr-muted">{f.scope}</code>{' '}
                    <span className="text-gr-muted">- {f.message}</span>
                  </div>
                ))}
              </div>
              {(qa.findings || []).length > 5 && (
                <div className="text-xs mt-3 text-gr-muted">
                  +{qa.findings!.length - 5} more &middot; see{' '}
                  <a href="/data-quality" className="underline font-semibold">Data Quality</a> for the full breakdown
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ================================================================== *
       * 1. PAGE HEADER - digest is the lead. Eyebrow names the date and    *
       *    brand focus. H1 is today's digest headline (the Claude-curated  *
       *    one-line for the day). Body line cites generation time and      *
       *    signal count, with a yesterday-fallback note when applicable.   *
       * ================================================================== */}
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Daily landing &middot; {fmtDate(todayIso)} &middot;{' '}
            {digest?.brand_focus
              ? brandLabel(digest.brand_focus)
              : 'Gymreapers apparel thesis'}
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text leading-tight">
          {digestLoading
            ? "Loading today's digest..."
            : hasDigest
            ? digest!.headline
            : "Today's digest generates at 7 AM ET"}
        </h1>
        {hasDigest && (
          <p className="text-gr-muted mt-4 max-w-3xl leading-relaxed">
            As of {fmtTimeET(digest!.generated_at)} ET &middot; generated by Claude from{' '}
            <span className="font-semibold text-gr-text tabular-nums">{totalSignalsCount}</span>{' '}
            signals across launches, promos, anomalies, trademarks and social.
            {!digestIsToday && (
              <>
                {' '}
                <span className="text-gr-accent font-semibold">
                  Yesterday&apos;s fallback shown - today&apos;s brief still pending.
                </span>
              </>
            )}
            {digest!.apparel_thesis_flag && (
              <>
                {' '}
                <span className="text-[10px] uppercase tracking-wider font-bold text-gr-accent ml-1">
                  Apparel thesis in play
                </span>
              </>
            )}
          </p>
        )}
        {!hasDigest && !digestLoading && (
          <p className="text-gr-muted mt-4 max-w-3xl leading-relaxed">
            The daily intel digest is generated each morning at 7 AM ET. While we wait, the
            anomaly strip and apparel-direction tiles below carry the freshest signals. Use the
            quick-jump rail to drill into any dashboard.
          </p>
        )}
      </header>

      {/* ================================================================== *
       * 2. TODAY'S 5 STORIES - the primary content of the page.            *
       * ================================================================== */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Today&apos;s 5 stories
            </p>
            <h2 className="text-2xl font-bold text-gr-text mt-1">
              The brief, ranked by significance
            </h2>
          </div>
          {hasDigest && (
            <Link
              href="/exec-brief"
              onClick={() => trackEvent('click', { label: 'today_exec_brief_link' })}
              className="text-[11px] uppercase tracking-wider font-semibold text-gr-accent hover:text-gr-accent-hover"
            >
              CEO brief &rarr;
            </Link>
          )}
        </div>

        <SectionExplainer
          collapsed
          what="The 5 most-important signals across the Gymreapers competitive set, ranked by significance. Curated each morning by Claude from promos, launches, anomalies, trademarks and social."
          howToRead="Rank badge sorts highest-significance first. Audience pill tells you who should care (marketing, product, both). Tags describe the type of move (quick win, strategic, operational, monitor)."
          whatToDo="Read the so-what line on each story. If your audience pill matches your role, the action is owed by you. Click any rank badge to deep-link to that story."
        />

        {digestLoading ? (
          <div className="rounded-md border border-gr-border bg-gr-surface p-8 text-center text-gr-subtle">
            Loading digest...
          </div>
        ) : hasDigest ? (
          <div className="space-y-4">
            {digest!.stories!.map((s) => (
              <article
                key={s.rank}
                id={`story-${s.rank}`}
                className="rounded-md border border-gr-border bg-gr-surface p-6 flex gap-5 scroll-mt-20"
              >
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onStoryRankClick(s.rank)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gr-accent-soft/40 text-gr-accent font-bold text-base tabular-nums hover:bg-gr-accent-soft/70 transition"
                    aria-label={`Jump to story ${s.rank}`}
                  >
                    {s.rank}
                  </button>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <h3 className="text-lg font-bold text-gr-text leading-snug">{s.title}</h3>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${audiencePillClass(s.audience)}`}
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
          <div className="rounded-md border border-gr-border bg-gr-surface p-8">
            <p className="text-sm text-gr-subtle leading-relaxed">
              The daily intel digest will appear here once it generates at 7 AM ET. It pulls
              the top signals from promos, launches, trademarks, complaints, social, and FB
              ads, then ranks the 5 most-important stories for the day with marketing and
              product action items.
            </p>
          </div>
        )}
      </section>

      {/* ================================================================== *
       * 3. ANOMALIES STRIP - inline between digest and apparel tiles.      *
       * ================================================================== */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
            Anomalies today
          </p>
          <Link
            href="/anomalies"
            onClick={() => trackEvent('click', { label: 'today_anomalies_link' })}
            className="text-[11px] uppercase tracking-wider font-semibold text-gr-accent hover:text-gr-accent-hover"
          >
            Open Anomaly Watch &rarr;
          </Link>
        </div>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gr-text">
            {anomaliesLoading
              ? '...'
              : (anomalies?.today_anomalies?.length || 0).toString()}
            {' '}
            <span className="text-gr-muted text-lg font-normal">
              flagged on{' '}
              {fmtShortDate(anomalies?.detected_date)}
            </span>
          </h2>
          <ConfidenceBadge source="composite" />
        </div>

        {anomaliesLoading ? (
          <div className="text-sm text-gr-subtle">Loading anomaly feed...</div>
        ) : !anomalies?.today_anomalies?.length ? (
          <div className="rounded-md border border-gr-border bg-gr-surface px-5 py-4 text-sm text-gr-muted">
            No anomalies today. Baseline data deepens as snapshots accumulate.
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {anomalies.today_anomalies.slice(0, 8).map((a) => {
              const dp = a.delta_pct;
              const deltaStr =
                dp == null ? '-' : `${dp > 0 ? '+' : ''}${dp.toFixed(0)}%`;
              return (
                <li
                  key={a.id}
                  className="rounded-md border border-gr-border bg-gr-surface px-4 py-3 flex items-center gap-3"
                >
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${SEVERITY_PILL[a.severity]}`}
                  >
                    {a.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gr-text truncate">
                      {brandLabel(a.brand_slug)} &middot; {a.metric_label || a.metric_key}
                    </div>
                    <div className="text-[11px] text-gr-muted">
                      {a.direction === 'up' ? 'up' : 'down'} vs trailing baseline
                    </div>
                  </div>
                  <div
                    className={`text-base font-bold tabular-nums ${
                      a.direction === 'up' ? 'text-gr-success' : 'text-gr-danger'
                    }`}
                  >
                    {deltaStr}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ================================================================== *
       * 4. APPAREL DIRECTION TILES - preserved from prior /today. Demoted  *
       *    below the digest and anomalies. Still 3 tiles, still independent *
       *    fetches, still degrades gracefully.                              *
       * ================================================================== */}
      {hasAnyApparelTile && (
        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Apparel direction
            </p>
            <ConfidenceBadge source="brand_mix" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="text-xl font-bold text-gr-text">Gymreapers apparel thesis</h3>
            <div className="flex gap-3 text-[11px] uppercase tracking-wider font-semibold">
              <Link
                href="/journey"
                onClick={() => trackEvent('click', { label: 'apparel_direction_link', metadata: { dest: 'journey' } })}
                className="text-gr-accent hover:text-gr-accent-hover"
              >
                Journey &rarr;
              </Link>
              <Link
                href="/apparel-entry-candidates"
                onClick={() => trackEvent('click', { label: 'apparel_direction_link', metadata: { dest: 'apparel_entry_candidates' } })}
                className="text-gr-accent hover:text-gr-accent-hover"
              >
                Entry candidates &rarr;
              </Link>
            </div>
          </div>
          <div className="mb-5">
            <SectionExplainer
              collapsed
              what="Today's read on Gymreapers' steer into apparel. Top entry candidate is the subcategory where peer apparel majors are deepest and Gymreapers is thinnest. Most active launcher = where the apparel-tier set is shipping right now. Promo activity = how many of those peers have SKUs on sale today."
              howToRead="Tile 1 is a product sequencing signal - what to enter first. Tile 2 is a market-direction signal - what peers are betting on. Tile 3 is a timing signal - when peer demand is being pulled into promos vs. holding full price."
              whatToDo="Use the entry candidate as a starting brief for the next apparel scoping conversation, cross-checked against the use-case story (training, between-sets, recovery, identity, meet-day). Skip subcategories that don't map to the strength-athlete frame even if peers are deep there."
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {topEntryCandidate && (
              <div className="bg-gr-bg rounded p-4 border border-gr-border/60">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                  Top entry candidate
                </div>
                <div className="text-lg font-bold text-gr-text capitalize leading-tight">
                  {prettySub(topEntryCandidate.subcategory)}
                </div>
                <div className="text-xs text-gr-muted mt-1">
                  Stage &middot; <span className="text-gr-text">{topEntryCandidate.stage_label}</span>
                </div>
                <div className="text-xs text-gr-muted mt-2 leading-snug">
                  Gymreapers has{' '}
                  <span className="font-bold text-gr-text tabular-nums">{topEntryCandidate.gymreapers_count}</span>
                  {' '}SKUs vs{' '}
                  <span className="font-bold text-gr-text tabular-nums">{topEntryCandidate.peer_max}</span>
                  {' '}at{' '}
                  <span className="text-gr-text">{topEntryCandidate.peer_max_brand_name || 'top peer'}</span>.
                </div>
                <div className="text-[11px] text-gr-subtle mt-2 italic leading-snug">
                  Biggest peer-vs-Gymreapers gap in the apparel set today.
                </div>
              </div>
            )}

            {topApparelLauncher && (
              <div className="bg-gr-bg rounded p-4 border border-gr-border/60">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                  Most active apparel launcher
                </div>
                <div className="text-lg font-bold text-gr-text leading-tight">
                  {topApparelLauncher.name}
                </div>
                <div className="text-xs text-gr-muted mt-1">
                  <span className="font-bold text-gr-text tabular-nums">{topApparelLauncher.count}</span>
                  {' '}recent drops in the apparel set
                </div>
                <div className="text-[11px] text-gr-subtle mt-2 italic leading-snug">
                  Who is shipping into apparel hardest right now &middot; market-direction signal.
                </div>
              </div>
            )}

            {apparelPromoToday && (
              <div className="bg-gr-bg rounded p-4 border border-gr-border/60">
                <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                  Apparel promo activity
                </div>
                <div className="text-lg font-bold text-gr-text leading-tight">
                  {apparelPromoToday.skus > 0
                    ? `${apparelPromoToday.skus} SKUs on sale`
                    : 'No apparel-tier promos today'}
                </div>
                {apparelPromoToday.skus > 0 && (
                  <div className="text-xs text-gr-muted mt-1">
                    across <span className="font-bold text-gr-text tabular-nums">{apparelPromoToday.brands}</span> brands
                    {apparelPromoToday.topBrand && (
                      <> &middot; led by <span className="text-gr-text">{apparelPromoToday.topBrand}</span></>
                    )}
                  </div>
                )}
                <div className="text-[11px] text-gr-subtle mt-2 italic leading-snug">
                  How much of the apparel set is pulling demand with discount today.
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================================================================== *
       * 5. QUICK-JUMP RAIL - 1-click access to the most-used dashboards.   *
       * ================================================================== */}
      <section>
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
            Quick jump
          </p>
        </div>
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h2 className="text-xl font-bold text-gr-text">Go straight to a dashboard</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {QUICK_JUMP_TILES.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              onClick={() =>
                trackEvent('click', {
                  label: 'today_quick_jump',
                  metadata: { dest: tile.href },
                })
              }
              className="block rounded-md border border-gr-border bg-gr-surface p-4 hover:border-gr-accent transition"
            >
              <div className="text-sm font-bold text-gr-text">{tile.name}</div>
              <div className="text-[11px] text-gr-muted mt-1 leading-snug">{tile.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================== *
       * 6. ACTIVITY FEED - the prior /today content. Now secondary.        *
       *    Collapsed by default; expand for full grid (wins, vulns,        *
       *    recent drops, search interest, biggest opportunity).            *
       * ================================================================== */}
      <section className="rounded-md border border-gr-border bg-gr-surface">
        <button
          type="button"
          onClick={() => {
            setActivityOpen((v) => !v);
            trackEvent('click', {
              label: 'today_activity_toggle',
              metadata: { opened: !activityOpen },
            });
          }}
          className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-gr-bg/50 transition rounded-md"
          aria-expanded={activityOpen}
        >
          <div>
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Secondary &middot; activity feed
            </p>
            <h2 className="text-xl font-bold text-gr-text mt-1">
              Amazon positions, recent drops, search interest
            </h2>
            <p className="text-xs text-gr-muted mt-1 leading-relaxed max-w-2xl">
              The old /today snapshot - kept here as supporting context once you have
              read the digest above.
            </p>
          </div>
          <svg
            className={`w-5 h-5 flex-shrink-0 text-gr-muted transition-transform ${activityOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {activityOpen && (
          <div className="px-6 pb-6 pt-1 border-t border-gr-border/40 space-y-8">
            {amzError && (
              <div className="bg-gr-bg border border-gr-danger/60 rounded-md p-4 text-sm text-gr-danger">
                Amazon data unavailable: {amzError}
              </div>
            )}

            {/* Biggest opportunity (was the prior page focal). */}
            {topOpp && (
              <div className="bg-gr-bg rounded-md border border-gr-border border-l-2 border-l-gr-accent p-6">
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <p className="text-gr-accent text-xs font-bold uppercase tracking-[0.25em]">
                    Biggest opportunity
                  </p>
                  <ConfidenceBadge source="amazon_bsr" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-gr-text tracking-tight font-mono leading-tight mb-5">
                  &ldquo;{topOpp.query}&rdquo;
                </h3>
                <div className="grid sm:grid-cols-3 gap-6 mb-5 pb-5 border-b border-gr-border">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Demand</div>
                    <div className="text-xl font-bold text-gr-text mt-1">{topOpp.total_reviews_in_top_n.toLocaleString()}</div>
                    <div className="text-xs text-gr-muted mt-0.5">reviews in top 20</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Avg price</div>
                    <div className="text-xl font-bold text-gr-text mt-1">{fmtPrice(topOpp.avg_price)}</div>
                    <div className="text-xs text-gr-muted mt-0.5">across leaders</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Top brand</div>
                    <div className="text-xl font-bold text-gr-text mt-1 truncate">{topOpp.top_brands[0]?.brand || '?'}</div>
                    <div className="text-xs text-gr-muted mt-0.5">
                      {topOpp.concentration_hhi < 0.25 ? 'fragmented field' : topOpp.concentration_hhi < 0.4 ? 'mid concentration' : 'entrenched leader'}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gr-muted leading-relaxed">
                  In <span className="font-semibold text-gr-text">{topOpp.category_name}</span>.
                  {topOpp.concentration_hhi < 0.25 && ' Fragmented competition - room to enter.'}
                </p>
                <Link href="/gymreapers/amazon" className="inline-block mt-4 text-sm text-gr-accent hover:text-gr-accent-hover font-semibold">
                  See all whitespace opportunities &rarr;
                </Link>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-5">
              {/* Where we're winning */}
              <div className="bg-gr-bg rounded-md border border-gr-border p-6">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
                    Where we&apos;re winning
                  </p>
                  <ConfidenceBadge source="amazon_bsr" />
                </div>
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h3 className="text-lg font-bold text-gr-text">
                    {wins.length} <span className="text-gr-success">top-5</span> positions
                  </h3>
                </div>
                {wins.length === 0 ? (
                  <p className="text-sm text-gr-muted">No top-5 positions in today&apos;s Amazon snapshot.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {wins.map((w) => (
                      <li key={w.slug} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-gr-text">{w.name}</span>
                        <span className="text-gr-accent font-bold font-mono tabular-nums">#{w.gymreapers.top_rank}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/gymreapers/amazon" className="block mt-5 text-xs text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider">
                  See all positions &rarr;
                </Link>
              </div>

              {/* Where we're vulnerable */}
              <div className="bg-gr-bg rounded-md border border-gr-border p-6">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
                    Where we&apos;re vulnerable
                  </p>
                  <ConfidenceBadge source="amazon_bsr" />
                </div>
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h3 className="text-lg font-bold text-gr-text">
                    {topVulns.length} <span className="text-gr-danger">flagged</span>
                  </h3>
                </div>
                {topVulns.length === 0 ? (
                  <p className="text-sm text-gr-muted">No critical vulnerabilities flagged today.</p>
                ) : (
                  <ul className="space-y-2 -mx-2">
                    {topVulns.map((v, i) => (
                      <li key={i}>
                        <Link href={v.href} className="block hover:bg-gr-surface rounded px-2 py-1.5">
                          <div className="text-sm font-semibold text-gr-text">{v.name}</div>
                          <div className="text-xs text-gr-muted mt-0.5 leading-relaxed">{v.reason}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Competitor moves */}
              <div className="bg-gr-bg rounded-md border border-gr-border p-6">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
                    Competitor moves
                  </p>
                  <ConfidenceBadge source="launches" />
                </div>
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h3 className="text-lg font-bold text-gr-text">Recent drops</h3>
                  <Link href="/gymreapers/launches" className="text-[11px] text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider">All &rarr;</Link>
                </div>
                {recentLaunches.length === 0 ? (
                  <p className="text-sm text-gr-muted">No recent competitor launches detected.</p>
                ) : (
                  <ul className="space-y-1 -mx-2">
                    {recentLaunches.map((l, i) => (
                      <li key={i} className="text-sm">
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: (l.url || '').slice(0, 200) } })}
                          className="block hover:bg-gr-surface rounded px-2 py-1.5"
                        >
                          <div className="flex items-baseline gap-2 text-[11px]">
                            <span className="text-gr-accent font-bold uppercase tracking-wider">{l.brandName}</span>
                            <span className="text-gr-subtle">{l.date}</span>
                          </div>
                          <div className="text-gr-text mt-0.5 leading-snug">{l.product_name || l.url.slice(0, 60)}</div>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Search interest */}
              <div className="bg-gr-bg rounded-md border border-gr-border p-6">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
                    Search interest
                  </p>
                  <ConfidenceBadge source="google_trends_brand" />
                </div>
                <div className="flex items-baseline justify-between gap-3 mb-5">
                  <h3 className="text-lg font-bold text-gr-text">Brand <GlossaryTerm id="wow">WoW</GlossaryTerm></h3>
                  <Link href="/for-marketing/trending" className="text-[11px] text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider">Category &rarr;</Link>
                </div>
                <div className="space-y-4">
                  {topTrendUp && topTrendUp.wow_change !== undefined && topTrendUp.wow_change !== null && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Biggest riser</div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="font-semibold text-gr-text">{topTrendUp.name}</span>
                        <span className="text-gr-success font-bold tabular-nums">+{topTrendUp.wow_change.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                  {topTrendDown && topTrendDown.wow_change !== undefined && topTrendDown.wow_change !== null && topTrendDown.slug !== topTrendUp?.slug && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Biggest faller</div>
                      <div className="flex items-baseline justify-between mt-0.5">
                        <span className="font-semibold text-gr-text">{topTrendDown.name}</span>
                        <span className="text-gr-danger font-bold tabular-nums">{topTrendDown.wow_change.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle text-center pt-6 border-t border-gr-border">
        Snapshot {fmtDate(amz?.snapshot_date)} &middot; Updated{' '}
        {amz?.last_updated ? new Date(amz.last_updated).toLocaleString() : '-'}
      </div>
    </div>
  );
}
