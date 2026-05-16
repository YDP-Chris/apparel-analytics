'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';
import type { AmazonOpportunity, AmazonCategoryRollup } from '../_lib/types';

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  return `$${p.toFixed(0)}`;
}

function fmtReviews(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function GymreapersAmazonPage() {
  const { data, loading, error } = useGymreapersData();

  if (loading && !data) return <div className="text-center py-20 text-gr-subtle">Loading Amazon data...</div>;
  if (error && !data) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return null;

  const amz = data.amazon;
  if (!amz || !amz.categories || amz.categories.length === 0) {
    return (
      <div className="bg-gr-surface rounded-md p-8 border border-gr-border max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-2">Amazon BSR</h1>
        <p className="text-gr-muted">
          The amazon-bsr agent has not produced a snapshot yet. The first daily run is scheduled for 5 AM ET.
        </p>
      </div>
    );
  }

  const totals = amz.totals || {};
  const categoriesTracked = totals.categories_tracked ?? amz.categories.length;
  const gymreapersIn = totals.categories_with_gymreapers ?? 0;
  const gaps = totals.whitespace_gaps ?? 0;
  const queriesRun = totals.whitespace_queries_run ?? 0;

  // Only show opportunities that actually have data. A row with top_n_size=0
  // means Amazon blocked us on that sub-query — it's a failed scrape, not a
  // real opportunity, and showing it as "0 reviews, $0 avg, HHI 0" is
  // worse than showing nothing.
  const allOpps = amz.topOpportunities || [];
  const opps = allOpps.filter(
    (o) => (o.top_n_size || 0) > 0 && (o.total_reviews_in_top_n || 0) > 0,
  );
  const pendingCount = allOpps.length - opps.length;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Amazon Demand Signal
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Where the buyers are</h1>
        <p className="text-gr-muted mt-3 max-w-3xl text-lg leading-relaxed">
          Daily popularity-rank snapshots across{' '}
          <span className="font-semibold text-gr-text">{categoriesTracked}</span> Amazon
          categories aligned to the Gymreapers assortment. Gymreapers appears in the top 100 of{' '}
          <span className="font-semibold text-gr-accent">{gymreapersIn}/{categoriesTracked}</span>{' '}
          categories. Whitespace pass found{' '}
          <span className="font-semibold text-gr-accent">{gaps}</span> sub-segments
          ({queriesRun} queries) where Gymreapers is absent.
        </p>
      </header>

      {/* Top whitespace opportunities */}
      {opps.length === 0 && pendingCount > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border border-l-4 border-l-gr-accent-soft">
          <h2 className="text-xl font-bold text-gr-text mb-2">Whitespace data still being collected</h2>
          <p className="text-sm text-gr-muted">
            We attempted{' '}
            <span className="font-semibold text-gr-text">{pendingCount}</span> whitespace
            sub-queries today but Amazon rate-limited the requests. The next overnight pass
            is firing now (4 batches × 90 min) and tomorrow&apos;s 5 AM run will produce a
            full whitespace report. Per-category Gymreapers position below is from the
            successful main snapshots and is accurate.
          </p>
        </section>
      )}

      {opps.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-2">Top Whitespace Opportunities</h2>
          <p className="text-sm text-gr-subtle mb-6">
            Sub-queries with real demand (high review counts in the top 20) where Gymreapers has
            no presence. Score = total reviews × (1 − brand concentration). High score = real
            demand + fragmented competition = room to enter.
            {pendingCount > 0 && (
              <span className="block mt-1 italic">
                {pendingCount} additional queries are still pending — Amazon rate-limit
                cooldown is in progress.
              </span>
            )}
          </p>
          <div className="space-y-3">
            {opps.map((op: AmazonOpportunity, i: number) => (
              <div key={`${op.category_slug}-${op.query}`} className="bg-gr-bg rounded-md p-4 border border-gr-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-gr-accent font-bold text-sm">#{i + 1}</span>
                      <span className="text-gr-text font-semibold">&ldquo;{op.query}&rdquo;</span>
                    </div>
                    <div className="text-xs text-gr-muted mt-1">
                      in {op.category_name} · {op.top_brands[0]?.brand ?? '?'} leads{' '}
                      {op.top_brands.length > 1 && `(${op.top_brands.slice(0, 3).map((b) => b.brand).join(', ')})`}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-right">
                    <div>
                      <div className="text-xs text-gr-subtle">demand</div>
                      <div className="text-lg font-bold text-gr-text">{op.total_reviews_in_top_n.toLocaleString()}</div>
                      <div className="text-xs text-gr-subtle">reviews</div>
                    </div>
                    <div>
                      <div className="text-xs text-gr-subtle">avg $</div>
                      <div className="text-lg font-bold text-gr-text">{fmtPrice(op.avg_price)}</div>
                      <div className="text-xs text-gr-subtle">{fmtPrice(op.price_range.min)}–{fmtPrice(op.price_range.max)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gr-subtle">HHI</div>
                      <div className="text-lg font-bold text-gr-text">{op.concentration_hhi.toFixed(2)}</div>
                      <div className="text-xs text-gr-subtle">{op.concentration_hhi < 0.2 ? 'fragmented' : op.concentration_hhi < 0.4 ? 'mid' : 'entrenched'}</div>
                    </div>
                  </div>
                </div>
                {op.leaders.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gr-border">
                    <div className="text-xs text-gr-subtle mb-2">Top of the pack:</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {op.leaders.slice(0, 3).map((l) => (
                        <a
                          key={l.asin}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded bg-gr-raised text-gr-muted hover:text-gr-text"
                          title={l.title}
                        >
                          #{l.rank} {l.title.slice(0, 50)}… · {fmtPrice(l.price)} · {fmtReviews(l.reviews)}r
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Per-category Gymreapers position */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-2">Gymreapers Position by Category</h2>
        <p className="text-sm text-gr-subtle mb-6">Best rank in each Amazon category we track. Top 5 by popularity shown for context.</p>
        <div className="space-y-6">
          {amz.categories.map((cat: AmazonCategoryRollup) => {
            const gr = cat.gymreapers;
            return (
              <div key={cat.slug} className="bg-gr-bg rounded-md p-4 border border-gr-border">
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gr-text">{cat.name}</h3>
                    <div className="text-xs text-gr-subtle">&ldquo;{cat.keyword}&rdquo; · {cat.organic_count} organic results</div>
                  </div>
                  <div className="text-right">
                    {gr.present ? (
                      <>
                        <div className="text-xs text-gr-subtle">Gymreapers</div>
                        <div className="text-2xl font-bold text-gr-accent">#{gr.top_rank}</div>
                        <div className="text-xs text-gr-subtle">{fmtPrice(gr.price)} · {fmtReviews(gr.reviews)}r</div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-gr-subtle">Gymreapers</div>
                        <div className="text-lg font-bold text-gr-muted">not in top 100</div>
                      </>
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
                {cat.diff && cat.diff.movers_up.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gr-border">
                    <div className="text-xs text-gr-subtle mb-1">Biggest mover today:</div>
                    <a
                      href={cat.diff.movers_up[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gr-text hover:text-gr-accent"
                    >
                      <span className="text-gr-success">↑{cat.diff.movers_up[0].delta}</span>{' '}
                      {cat.diff.movers_up[0].title.slice(0, 80)} (#{cat.diff.movers_up[0].rank_prev} → #{cat.diff.movers_up[0].rank_curr})
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {amz.lastUpdated && (
        <p className="text-xs text-gr-subtle text-right">
          Snapshot: {new Date(amz.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
}
