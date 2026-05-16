'use client';

import { useEffect, useState } from 'react';
import { useGymreapersData } from '../_lib/GymreapersProvider';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { Annotations } from '@/components/Annotations';
import { InterestSignal } from '@/components/InterestSignal';
import { useInterestSignals } from '@/components/useInterestSignals';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { trackEvent } from '@/lib/usage';

// Endpoint backed by Supabase (gymreapers_bsr schema). Always reflects the
// latest snapshot — no JSON rebuild required.
const PULSE_API =
  process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';

const TOKEN_KEY = 'ydp_pulse_token';
const AMZ_CACHE_KEY = 'ydp_amazon_data';
const AMZ_CACHE_AT_KEY = 'ydp_amazon_data_at';
const AMZ_TTL_MS = 5 * 60 * 1000;

interface AmazonProduct {
  rank: number | null;
  asin: string;
  title: string;
  price: number | null;
  reviews: number | null;
  rating: number | null;
  bought_past_month_label?: string | null;
  bought_past_month_est?: number | null;
  badge?: string | null;
  url: string;
}

interface AmazonCategory {
  slug: string;
  name: string;
  keyword?: string;
  organic_count: number;
  snapshot_date?: string;
  gymreapers: {
    present: boolean;
    top_rank: number | null;
    asin?: string;
  };
  top_5: AmazonProduct[];
  diff?: {
    movers_up: Array<{
      asin: string;
      title: string;
      rank_prev: number;
      rank_curr: number;
      delta: number;
      url: string;
    }>;
  };
}

interface AmazonOpportunity {
  query: string;
  category_slug: string;
  category_name: string;
  top_n_size: number;
  gymreapers_present: boolean;
  total_reviews_in_top_n: number;
  avg_price: number | null;
  price_range: { min: number | null; max: number | null };
  top_brands: Array<{ brand: string; count: number }>;
  concentration_hhi: number;
  opportunity_score: number;
  leaders: AmazonProduct[];
}

interface AmazonPayload {
  last_updated: string;
  snapshot_date: string;
  totals: {
    categories_tracked: number;
    categories_with_gymreapers: number;
    whitespace_queries_run: number;
    whitespace_queries_with_data: number;
    whitespace_gaps: number;
  };
  categories: AmazonCategory[];
  top_opportunities: AmazonOpportunity[];
  available?: boolean;
  reason?: string;
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  return `$${p.toFixed(0)}`;
}

function fmtReviews(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

function getCached(): AmazonPayload | null {
  if (typeof window === 'undefined') return null;
  const at = sessionStorage.getItem(AMZ_CACHE_AT_KEY);
  const blob = sessionStorage.getItem(AMZ_CACHE_KEY);
  if (!at || !blob) return null;
  if (Date.now() - parseInt(at, 10) > AMZ_TTL_MS) return null;
  try {
    return JSON.parse(blob);
  } catch {
    return null;
  }
}

export default function GymreapersAmazonPage() {
  // We still rely on the GymreapersProvider for the auth flow (token + login
  // form). Once authed, this page fetches its own data from /pulse/amazon
  // live, so it shows the freshest Supabase snapshot.
  useGymreapersData();
  const [data, setData] = useState<AmazonPayload | null>(getCached());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError('Please sign in via the Scorecard tab.');
      return;
    }
    if (data) return;
    setLoading(true);
    fetch(`${PULSE_API}/pulse/amazon`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: AmazonPayload) => {
        setData(json);
        try {
          sessionStorage.setItem(AMZ_CACHE_KEY, JSON.stringify(json));
          sessionStorage.setItem(AMZ_CACHE_AT_KEY, Date.now().toString());
        } catch {
          // ignore quota
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [data]);

  function refresh() {
    sessionStorage.removeItem(AMZ_CACHE_KEY);
    sessionStorage.removeItem(AMZ_CACHE_AT_KEY);
    setData(null);
  }

  if (loading && !data) {
    return <div className="text-center py-20 text-gr-subtle">Loading Amazon data from Supabase…</div>;
  }
  if (error && !data) {
    return <div className="text-center py-20 text-gr-danger">{error}</div>;
  }
  if (!data || data.available === false || !data.categories) {
    return (
      <div className="bg-gr-surface rounded-md p-8 border border-gr-border max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-2">Amazon BSR</h1>
        <p className="text-gr-muted">
          {data?.reason || 'No snapshots in Supabase yet. The first daily run lands at 5 AM ET.'}
        </p>
      </div>
    );
  }

  const totals = data.totals;
  const allOpps = (data.top_opportunities || []).filter(
    (o) => (o.top_n_size || 0) > 0 && (o.total_reviews_in_top_n || 0) > 0,
  );
  const pendingCount = totals.whitespace_queries_run - totals.whitespace_queries_with_data;

  // Apply team interest signals — default-hide anything the team has marked
  // 'passing'. The toggle inside <PassingFilter/> below lets them bring
  // passed items back into view when reviewing.
  const wsSignals = useInterestSignals('whitespace_query');
  const opps = allOpps.filter((o) => !wsSignals.filterOut(`${o.category_slug}|${o.query}`));
  const hiddenOppsCount = allOpps.length - opps.length;

  const catSignals = useInterestSignals('amazon_category');
  const visibleCategories = data.categories.filter((c) => !catSignals.filterOut(c.slug));
  const hiddenCatsCount = data.categories.length - visibleCategories.length;

  const snapshotDateLabel = (() => {
    try {
      const d = new Date(data.snapshot_date + 'T12:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return data.snapshot_date;
    }
  })();
  const lastUpdatedLabel = (() => {
    try {
      return new Date(data.last_updated).toLocaleString('en-US', {
        month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      });
    } catch {
      return data.last_updated;
    }
  })();

  return (
    <div className="space-y-12">
      {/* PAGE HEADER — eyebrow + h1 + lede. Confidence badge inline with
          eyebrow per cross-page rhythm. */}
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Whitespace
          </p>
          <ConfidenceBadge source="amazon_bsr" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Where the buyers are
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Daily <GlossaryTerm id="bsr">popularity-rank</GlossaryTerm> snapshots across{' '}
          <span className="font-semibold text-gr-text">{totals.categories_tracked}</span> Amazon
          categories aligned to the Gymreapers + Victory Grips assortment. We rank in the top 100 of{' '}
          <span className="font-semibold text-gr-accent">
            {totals.categories_with_gymreapers}/{totals.categories_tracked}
          </span>{' '}
          categories. <GlossaryTerm id="whitespace">Whitespace</GlossaryTerm> opportunities are
          ranked by <GlossaryTerm id="opportunity-score">opportunity score</GlossaryTerm>.
        </p>
      </header>

      {/* Snapshot anchor — quieter chrome. Date typography is the focal
          point, refresh recedes to a secondary button. */}
      <section className="bg-gr-surface border border-gr-border rounded-md px-6 py-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] text-gr-subtle uppercase tracking-[0.2em] font-bold">Snapshot date</div>
          <div className="text-xl font-bold text-gr-text mt-1 font-mono">{snapshotDateLabel}</div>
          <div className="text-xs text-gr-muted mt-1">Last captured {lastUpdatedLabel}</div>
        </div>
        <button
          onClick={() => { trackEvent('click', { label: 'refresh', metadata: { source: 'amazon' } }); refresh(); }}
          className="px-3.5 py-2 rounded-md border border-gr-border bg-gr-bg text-gr-muted font-semibold text-xs uppercase tracking-[0.15em] hover:bg-gr-raised hover:text-gr-text hover:border-gr-accent/60 transition"
        >
          Refresh
        </button>
      </section>

      {/* How-to-read explainer — collapsed by default. Removed the emoji
          for a tighter, more professional look. */}
      <details className="bg-gr-surface rounded-md border border-gr-border group">
        <summary className="cursor-pointer text-gr-text text-sm flex items-center justify-between gap-3 px-6 py-4 list-none">
          <span className="font-semibold uppercase tracking-[0.15em] text-xs text-gr-muted group-hover:text-gr-text transition">
            How to read this page
          </span>
          <svg className="w-4 h-4 text-gr-subtle transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-6 pb-6 pt-1 space-y-3 text-sm text-gr-muted leading-relaxed border-t border-gr-border/50">
          <div className="h-1" />

          <p>
            <span className="font-semibold text-gr-text">What this is.</span> Every day at 5 AM ET
            we scrape Amazon&apos;s popularity rankings for product categories that match
            Gymreapers&apos; assortment (belts, wraps, grips, etc.). Each row below is one Amazon
            search Amazon sorts by what&apos;s selling, and we capture the top ~50 products with
            their price, rating, review count, and Amazon&apos;s &ldquo;X bought in past
            month&rdquo; volume label.
          </p>
          <p>
            <span className="font-semibold text-gr-text">What Gymreapers rank means.</span> &ldquo;#1&rdquo;
            means a Gymreapers (or Victory Grips) product is Amazon&apos;s top result for that
            keyword. &ldquo;Not in top 100&rdquo; means we&apos;re absent from that category — that&apos;s
            either a gap to close, an entry to make, or a category we deliberately don&apos;t
            play in.
          </p>
          <p>
            <span className="font-semibold text-gr-text">What Whitespace Opportunities are.</span>{' '}
            Sub-queries we run (e.g. &ldquo;13mm lever lifting belt&rdquo;) where Gymreapers is
            absent from the top 20 BUT real demand exists (high review counts). Score = total
            reviews × (1 − HHI). HHI measures how concentrated the top brands are — low HHI
            (fragmented) means room to enter; high HHI (entrenched) means you&apos;d be fighting
            a dominant incumbent.
          </p>
          <p>
            <span className="font-semibold text-gr-text">Why the dates matter.</span> Amazon rankings
            move daily based on actual sales. Comparing today vs yesterday surfaces &ldquo;biggest
            movers&rdquo; — products gaining or losing rank fast. Over time we&apos;ll see price
            tests, launch velocity, and bought-band shifts (e.g. a product jumping from &ldquo;1K+
            bought/month&rdquo; to &ldquo;3K+&rdquo; is a real demand signal).
          </p>
        </div>
      </details>

      {opps.length === 0 && pendingCount > 0 && (
        <section className="bg-gr-surface rounded-md p-7 border border-gr-border border-l-2 border-l-gr-accent/60">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">Status</p>
          <h2 className="text-xl font-bold text-gr-text mb-2">Whitespace data still being collected</h2>
          <p className="text-sm text-gr-muted leading-relaxed max-w-3xl">
            {pendingCount} whitespace sub-queries are still pending — Amazon rate-limited today&apos;s
            requests. Tonight&apos;s batched run + tomorrow&apos;s 5 AM cron will produce a full
            report. Per-category Gymreapers position below is accurate.
          </p>
        </section>
      )}

      {opps.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <div className="mb-6">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle">Focal insight</p>
              {hiddenOppsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    trackEvent('click', { label: 'show_passed_toggle', metadata: { kind: 'whitespace' } });
                    wsSignals.setShowPassing(!wsSignals.showPassing);
                  }}
                  className="text-xs text-gr-accent hover:text-gr-accent-hover font-semibold transition"
                >
                  {wsSignals.showPassing
                    ? `Hide passed (${wsSignals.passingCount})`
                    : `${hiddenOppsCount} hidden — show passed`}
                </button>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gr-text mb-2 tracking-tight">Top Whitespace Opportunities</h2>
            <p className="text-sm text-gr-muted leading-relaxed max-w-3xl">
              Sub-queries with real demand where Gymreapers has no presence. Score = total reviews
              in top 20 × (1 − brand concentration). Items the team has marked &ldquo;Passing&rdquo;
              are hidden by default.
              {pendingCount > 0 && (
                <span className="block mt-1 italic">
                  {pendingCount} additional queries still pending Amazon cooldown.
                </span>
              )}
            </p>
          </div>
          <div className="mb-5">
            <SectionExplainer
              what="Each row is one Amazon search where Gymreapers is absent from the top 20 but the top 20 collectively have a lot of reviews — meaning real demand exists."
              howToRead="Demand is total reviews across the top 20 (a sales proxy). Avg $ is what the leaders charge. HHI 0 to 1 measures concentration — fragmented (<0.2) means many brands split the share, entrenched (>0.4) means one player dominates."
              whatToDo="Low HHI + high demand = build a product or run ads here. High HHI = study the leader's playbook before committing — entry is expensive."
            />
          </div>
          <div className="space-y-3">
            {opps.map((op, i) => (
              <div key={`${op.category_slug}-${op.query}`} className="bg-gr-bg rounded-md p-5 border border-gr-border hover:border-gr-accent/40 transition">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-3">
                      <span className="text-gr-accent font-bold text-sm font-mono tabular-nums">#{i + 1}</span>
                      <span className="text-gr-text font-semibold text-base font-mono truncate">&ldquo;{op.query}&rdquo;</span>
                    </div>
                    <div className="text-xs text-gr-muted mt-1.5">
                      in {op.category_name}{' '}
                      <span className="text-gr-subtle">·</span>{' '}
                      <span className="text-gr-text">{op.top_brands[0]?.brand ?? '?'}</span> leads
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-5 text-right flex-shrink-0">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">Demand</div>
                      <div className="text-lg font-bold text-gr-text tabular-nums mt-0.5">
                        {op.total_reviews_in_top_n.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-gr-subtle">reviews</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">Avg $</div>
                      <div className="text-lg font-bold text-gr-text tabular-nums mt-0.5">{fmtPrice(op.avg_price)}</div>
                      <div className="text-[10px] text-gr-subtle tabular-nums">
                        {fmtPrice(op.price_range.min)}–{fmtPrice(op.price_range.max)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">HHI</div>
                      <div className="text-lg font-bold text-gr-text tabular-nums mt-0.5">{op.concentration_hhi.toFixed(2)}</div>
                      <div className="text-[10px] text-gr-subtle">
                        {op.concentration_hhi < 0.2 ? 'fragmented' : op.concentration_hhi < 0.4 ? 'mid' : 'entrenched'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team feedback layer — pin intent + notes to this specific
                    whitespace opp so the next reviewer sees prior context. */}
                <div className="mt-4 pt-4 border-t border-gr-border/60 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle">Team intent</span>
                    <InterestSignal
                      entityKind="whitespace_query"
                      entityKey={`${op.category_slug}|${op.query}`}
                      entityLabel={op.query}
                    />
                  </div>
                  <Annotations
                    entityKind="whitespace_query"
                    entityKey={`${op.category_slug}|${op.query}`}
                    entityLabel={op.query}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <div className="mb-6">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle">Coverage</p>
            {hiddenCatsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  trackEvent('click', { label: 'show_passed_toggle', metadata: { kind: 'category' } });
                  catSignals.setShowPassing(!catSignals.showPassing);
                }}
                className="text-xs text-gr-accent hover:text-gr-accent-hover font-semibold transition"
              >
                {catSignals.showPassing
                  ? `Hide passed (${catSignals.passingCount})`
                  : `${hiddenCatsCount} hidden — show passed`}
              </button>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gr-text mb-2 tracking-tight">Gymreapers Position by Category</h2>
          <p className="text-sm text-gr-muted leading-relaxed max-w-3xl">
            Best rank in each tracked Amazon category. Top 5 by popularity shown for context. Victory
            Grips products count as Gymreapers presence. Categories the team has marked &ldquo;Passing&rdquo;
            are hidden by default.
          </p>
        </div>
        <div className="mb-5">
          <SectionExplainer
            what="Every row is one Amazon search Gymreapers competes on, with our best product's rank and the top 5 sellers for context."
            howToRead={'Rank 1 means we own the search. "Not in top 100" means we\'re invisible there. The "bought/mo" column is Amazon\'s monthly volume bucket — the closest public proxy to unit sales.'}
            whatToDo="Top-5 rows are positions to defend. Absent rows are either to invest in (if the search has real volume) or to deliberately skip — write down which."
          />
        </div>
        <div className="space-y-4">
          {visibleCategories.map((cat) => {
            const gr = cat.gymreapers;
            return (
              <div key={cat.slug} className="bg-gr-bg rounded-md p-5 border border-gr-border space-y-3">
                <div className="flex items-center justify-end">
                  <InterestSignal
                    entityKind="amazon_category"
                    entityKey={cat.slug}
                    entityLabel={cat.name}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gr-text tracking-tight">{cat.name}</h3>
                    <div className="text-xs text-gr-subtle mt-0.5">
                      <span className="font-mono">&ldquo;{cat.keyword}&rdquo;</span> · {cat.organic_count} organic results
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold">Gymreapers</div>
                    {gr.present ? (
                      <div className="text-3xl font-bold text-gr-accent font-mono tabular-nums leading-none mt-1">#{gr.top_rank}</div>
                    ) : (
                      <div className="text-sm font-semibold text-gr-subtle mt-1.5">not in top 100</div>
                    )}
                  </div>
                </div>
                {cat.top_5.length > 0 && (
                  <div className="space-y-1">
                    {cat.top_5.map((p) => (
                      <a
                        key={p.asin}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: p.url.slice(0, 200) } })}
                        className="flex items-baseline gap-3 text-sm hover:text-gr-text text-gr-muted"
                        title={p.title}
                      >
                        <span className="w-6 text-right font-bold text-gr-accent">#{p.rank}</span>
                        <span className="flex-1 truncate">{p.title}</span>
                        <span className="text-xs">{fmtPrice(p.price)}</span>
                        <span className="text-xs">⭐{p.rating ?? '—'}</span>
                        <span className="text-xs text-gr-subtle w-14 text-right">{fmtReviews(p.reviews)}r</span>
                        <span className="text-xs text-gr-text w-16 text-right" title="bought in past month">
                          {p.bought_past_month_label ? `${p.bought_past_month_label}/mo` : '—'}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
                {cat.diff?.movers_up && cat.diff.movers_up.length > 0 && cat.diff.movers_up[0] && (
                  <div className="mt-3 pt-3 border-t border-gr-border">
                    <div className="text-xs text-gr-subtle mb-1">Biggest mover today:</div>
                    <a
                      href={cat.diff.movers_up[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: cat.diff!.movers_up[0].url.slice(0, 200) } })}
                      className="text-xs text-gr-text hover:text-gr-accent"
                    >
                      <span className="text-gr-success">↑{cat.diff.movers_up[0].delta}</span>{' '}
                      {cat.diff.movers_up[0].title.slice(0, 80)} (#{cat.diff.movers_up[0].rank_prev} →
                      #{cat.diff.movers_up[0].rank_curr})
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-gr-subtle text-right">
        Snapshot: {new Date(data.last_updated).toLocaleString()} · {totals.categories_tracked} categories
      </p>
    </div>
  );
}
