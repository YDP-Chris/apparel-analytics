'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGymreapersData } from '../gymreapers/_lib/GymreapersProvider';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';

const PULSE_API =
  process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

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
    reviews: number | null;
    bought_past_month_label?: string | null;
    bought_past_month_est?: number | null;
    is_gymreapers?: boolean;
    url: string;
  }>;
  diff?: {
    movers_up: Array<{ asin: string; title: string; rank_prev: number; rank_curr: number; delta: number; url: string }>;
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

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  return `$${p.toFixed(0)}`;
}

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

export default function TodayPage() {
  const { data: comp } = useGymreapersData();
  const [amz, setAmz] = useState<AmazonPayload | null>(null);
  const [qa, setQa] = useState<QaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qaExpanded, setQaExpanded] = useState(false);   // collapsed by default

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    fetch(`${PULSE_API}/pulse/amazon`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setAmz(j))
      .catch((e) => setError(String(e)));
    // Fetch QA status with a 1s timeout so a slow QA endpoint never degrades
    // the page it's protecting (per the Plan agent's last guardrail).
    const qaController = new AbortController();
    const qaTimeout = setTimeout(() => qaController.abort(), 1500);
    fetch(`${PULSE_API}/pulse/qa`, { headers: { Authorization: `Bearer ${token}` }, signal: qaController.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setQa(j))
      .catch(() => {})
      .finally(() => clearTimeout(qaTimeout));
  }, []);

  if (!comp && !amz) {
    return <div className="text-center py-20 text-gr-subtle">Loading today&apos;s brief…</div>;
  }

  // === Compute the curated insights ===

  // 1. Where we're WINNING — Amazon categories where Gymreapers/Victory Grips
  //    ranks in the top 5
  const wins = (amz?.categories || [])
    .filter((c) => c.gymreapers.present && (c.gymreapers.top_rank ?? 999) <= 5)
    .sort((a, b) => (a.gymreapers.top_rank || 999) - (b.gymreapers.top_rank || 999))
    .slice(0, 5);

  // 2. Where we're VULNERABLE — categories where competitors have rising
  //    rank movers (gainers) and Gymreapers is also present (real competitive
  //    threat), or categories where we're absent
  const vulnerabilities: Array<{ name: string; reason: string; href: string }> = [];
  for (const c of amz?.categories || []) {
    if (!c.gymreapers.present && c.organic_count >= 30) {
      vulnerabilities.push({
        name: c.name,
        reason: `Absent from top 100, ${c.organic_count} organic listings — competitor space`,
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

  // 3. Biggest opportunity — top whitespace gap (if data exists)
  const topOpp = (amz?.top_opportunities || []).find(
    (o) => o.total_reviews_in_top_n > 0,
  );

  // 4. Competitor moves — recent launches across non-Gymreapers brands
  const recentLaunches = (comp?.launchesSection?.recentDrops || [])
    .filter((d) => d.brand !== 'gymreapers')
    .slice(0, 5);

  // 5. Trends — top brand by WoW change
  const trendList = Object.entries(comp?.trends || {})
    .map(([slug, t]) => ({
      slug,
      name: comp?.brand_names[slug] || slug,
      ...t,
    }))
    .filter((t) => typeof t.wow_change === 'number');
  const topTrendUp = trendList.sort((a, b) => (b.wow_change || 0) - (a.wow_change || 0))[0];
  const topTrendDown = trendList.sort((a, b) => (a.wow_change || 0) - (b.wow_change || 0))[0];

  return (
    /* ------------------------------------------------------------------ *
     * GYMREAPERS DASHBOARD — VISUAL DESIGN SYSTEM (established 2026-05-15)
     *
     * Cross-page rhythm rules — apply consistently to every in-scope page:
     *
     * 1. PAGE HEADER. Eyebrow (xs accent uppercase tracking-[0.25em]) +
     *    H1 (text-4xl font-bold tracking-tight) + optional lede
     *    (text-base text-gr-muted max-w-2xl mt-3). H1 and eyebrow tight;
     *    lede gets breathing room.
     * 2. SECTION HEADER. Eyebrow (xs uppercase tracking-wider subtle) +
     *    H2 (text-2xl font-bold) + optional descriptor. Confidence badge
     *    sits inline on the same row as the eyebrow, RIGHT-aligned. Never
     *    on its own line below the title (was costing a visual row + felt
     *    junky).
     * 3. PAGE GAP. Tier-1/2 pages use space-y-12 between major sections;
     *    Tier-3 reference pages use space-y-10. Within a section, content
     *    starts mt-5.
     * 4. TYPE SCALE. Eyebrow 11px / body 14px / lg-body 16px / sub-h 18px
     *    (text-lg) / section-h 24px (text-2xl) / page-h 36-40 (text-4xl)
     *    / hero metric 36-48px.
     * 5. CARD CHROME. One border weight (`border border-gr-border`),
     *    rounded-md, p-6 (compact) or p-8 (data-dense). Avoid nested
     *    borders. Hero/focal cards get an accent left-border (border-l-2
     *    border-l-gr-accent) instead of full red gradient.
     * 6. FOCAL POINT. On /today the Biggest Opportunity is the page
     *    focal — large query in font-mono, large metric, top of page
     *    under the date. Other 4 cards recede.
     * 7. LANDING CARDS. /for-marketing + /for-product use uniform card
     *    sizing with the "primary" card distinguished by accent border
     *    + slightly larger H2, NOT by spanning two columns (was a Gestalt
     *    grouping bug — separated it from the rest of the grid).
     * 8. DECORATIVE EMOJIS REMOVED on professional pages — they cheapen
     *    a powerlifting/analytics product. Placeholders show typographic
     *    "Coming soon" treatment instead.
     * ------------------------------------------------------------------ */
    <div className="space-y-10">
      {/* DATA-QA STATUS BANNER — collapsed by default. Hidden on green. */}
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
                {qaExpanded ? 'Click to collapse' : 'Click to see what\'s affected'}
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
                    <span className="text-gr-muted">— {f.message}</span>
                  </div>
                ))}
              </div>
              {(qa.findings || []).length > 5 && (
                <div className="text-xs mt-3 text-gr-muted">
                  +{qa.findings!.length - 5} more · see{' '}
                  <a href="/data-quality" className="underline font-semibold">Data Quality</a> for the full breakdown
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* PAGE HEADER — eyebrow + date as H1, lede with breathing room.
          No gradient chrome; whitespace + type does the work. */}
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Today&apos;s brief
          </p>
          {qa && qa.available && qa.status_color === 'green' && (
            <span className="text-[11px] text-gr-success font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gr-success" /> All data fresh
            </span>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          {fmtDate(amz?.snapshot_date || comp?.generated_at?.slice(0, 10))}
        </h1>
        <p className="text-gr-muted mt-3 max-w-2xl leading-relaxed">
          The 3-5 things to know across the Gymreapers competitive set. Built for marketing and
          product to scan in under a minute — drill into the audience tabs above for depth. Every
          card carries a <GlossaryTerm id="confidence-rating">confidence rating</GlossaryTerm> so
          you know how much weight to put on the number before acting.
        </p>
      </header>

      {error && (
        <div className="bg-gr-surface border border-gr-danger/60 rounded-md p-4 text-sm text-gr-danger">
          Amazon data unavailable: {error}
        </div>
      )}

      {/* BIGGEST OPPORTUNITY — page focal point. Pulled to the top so it
          owns the F-pattern entry. Visual weight via accent left rail,
          larger query type, hero metric, and generous padding. */}
      {topOpp && (
        <section className="bg-gr-surface rounded-md border border-gr-border border-l-2 border-l-gr-accent p-8">
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <p className="text-gr-accent text-xs font-bold uppercase tracking-[0.25em]">
              Biggest opportunity
            </p>
            <ConfidenceBadge source="amazon_bsr" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gr-text tracking-tight font-mono leading-tight mb-6">
            &ldquo;{topOpp.query}&rdquo;
          </h2>
          <div className="mb-6">
            <SectionExplainer
              collapsed
              what="The single highest-leverage Amazon search where Gymreapers has no presence and the field is fragmented enough to enter."
              howToRead="Demand = total reviews across the top 20 (sales proxy). Avg price = where the leaders price. Top brand + HHI tells you whether one player owns the search or it's wide open."
              whatToDo="If demand is high and HHI is below 0.25, this is a category to build into or run ads against. If HHI is above 0.4, you'd be fighting an entrenched leader."
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mb-6 pb-6 border-b border-gr-border">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Demand</div>
              <div className="text-2xl font-bold text-gr-text mt-1">{topOpp.total_reviews_in_top_n.toLocaleString()}</div>
              <div className="text-xs text-gr-muted mt-0.5">reviews in top 20</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Avg price</div>
              <div className="text-2xl font-bold text-gr-text mt-1">{fmtPrice(topOpp.avg_price)}</div>
              <div className="text-xs text-gr-muted mt-0.5">across leaders</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold">Top brand</div>
              <div className="text-2xl font-bold text-gr-text mt-1 truncate">{topOpp.top_brands[0]?.brand || '?'}</div>
              <div className="text-xs text-gr-muted mt-0.5">
                {topOpp.concentration_hhi < 0.25 ? 'fragmented field' : topOpp.concentration_hhi < 0.4 ? 'mid concentration' : 'entrenched leader'}
              </div>
            </div>
          </div>
          <p className="text-sm text-gr-muted leading-relaxed">
            In <span className="font-semibold text-gr-text">{topOpp.category_name}</span>.
            {topOpp.concentration_hhi < 0.25 && ' Fragmented competition — room to enter.'}
          </p>
          <Link href="/gymreapers/amazon" className="inline-block mt-5 text-sm text-gr-accent hover:text-gr-accent-hover font-semibold">
            See all whitespace opportunities →
          </Link>
        </section>
      )}

      {/* Supporting grid — 2x2 of recessed cards. Lighter padding, no
          internal borders, badge inline with eyebrow. */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Where we're winning */}
        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Where we&apos;re winning
            </p>
            <ConfidenceBadge source="amazon_bsr" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h3 className="text-xl font-bold text-gr-text">
              {wins.length} <span className="text-gr-success">top-5</span> positions
            </h3>
          </div>
          <div className="mb-4">
            <SectionExplainer
              collapsed
              what="Amazon categories where a Gymreapers or Victory Grips product ranks in the top 5 by popularity right now."
              howToRead="The number after each category is our best product's rank in that Amazon search. #1 = Amazon's top result."
              whatToDo="These are the spots to defend — keep the listing healthy, sustain ad spend, watch for movers eating into our position."
            />
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
            See all positions →
          </Link>
        </section>

        {/* Where we're vulnerable */}
        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Where we&apos;re vulnerable
            </p>
            <ConfidenceBadge source="amazon_bsr" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h3 className="text-xl font-bold text-gr-text">
              {topVulns.length} <span className="text-gr-danger">flagged</span>
            </h3>
          </div>
          <div className="mb-4">
            <SectionExplainer
              collapsed
              what="Categories where we're either absent from the top 100 or a competitor just jumped 10+ ranks overnight."
              howToRead="An absence means we're invisible to that Amazon search. A big rank jump from a peer means somebody is gaining traction fast."
              whatToDo="Decide per row: enter the category, defend with ads, or document why we're choosing not to play there."
            />
          </div>
          {topVulns.length === 0 ? (
            <p className="text-sm text-gr-muted">No critical vulnerabilities flagged today.</p>
          ) : (
            <ul className="space-y-2 -mx-2">
              {topVulns.map((v, i) => (
                <li key={i}>
                  <Link href={v.href} className="block hover:bg-gr-bg rounded px-2 py-1.5">
                    <div className="text-sm font-semibold text-gr-text">{v.name}</div>
                    <div className="text-xs text-gr-muted mt-0.5 leading-relaxed">{v.reason}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Competitor moves */}
        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Competitor moves
            </p>
            <ConfidenceBadge source="launches" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h3 className="text-xl font-bold text-gr-text">Recent drops</h3>
            <Link href="/gymreapers/launches" className="text-[11px] text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider">All →</Link>
          </div>
          <div className="mb-4">
            <SectionExplainer
              collapsed
              what="New products from competitor brands detected via their sitemaps in the last few days."
              howToRead="Brand · date · product. Click through to see the live PDP."
              whatToDo="Scan for products in categories we play in — those are candidates for a counter-launch, ride-along content, or a competitive ad pivot."
            />
          </div>
          {recentLaunches.length === 0 ? (
            <p className="text-sm text-gr-muted">No recent competitor launches detected.</p>
          ) : (
            <ul className="space-y-1 -mx-2">
              {recentLaunches.map((l, i) => (
                <li key={i} className="text-sm">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-gr-bg rounded px-2 py-1.5">
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
        </section>

        {/* Search interest */}
        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">
              Search interest
            </p>
            <ConfidenceBadge source="google_trends_brand" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h3 className="text-xl font-bold text-gr-text">Brand <GlossaryTerm id="wow">WoW</GlossaryTerm></h3>
            <Link href="/for-marketing/trending" className="text-[11px] text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider">Category →</Link>
          </div>
          <div className="mb-4">
            <SectionExplainer
              collapsed
              what="The brand whose Google search interest rose or fell the most versus the same day last week."
              howToRead="Google Trends is a normalized 0-100 score, not raw volume. A big WoW swing on a low-volume brand can be noise — read as direction, not magnitude."
              whatToDo="A rising peer means their audience is heating up. A falling peer is a window to take share of voice."
            />
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
        </section>
      </div>

      <div className="text-xs text-gr-subtle text-center pt-6 border-t border-gr-border">
        Snapshot {fmtDate(amz?.snapshot_date)} · Updated {amz?.last_updated ? new Date(amz.last_updated).toLocaleString() : '—'}
      </div>
    </div>
  );
}
