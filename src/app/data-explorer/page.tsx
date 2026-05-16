const schemas = [
  {
    name: 'gymreapers_competitive',
    purpose: 'Per-brand competitive intel — Scorecard, Mix, Launches, Social, Jobs',
    tables: [
      { t: 'brands', d: 'Registry of all tracked brands (focus / strength_peer / athleisure)' },
      { t: 'brand_snapshots', d: 'Daily totals, prices, color metrics per brand' },
      { t: 'brand_categories', d: 'Daily category product counts per brand' },
      { t: 'brand_subcategories', d: 'Daily subcategory product counts per brand' },
      { t: 'brand_mix', d: 'Daily mix metrics — color depth, gender split, price positioning (JSONB)' },
      { t: 'brand_trends', d: 'Daily Google Trends interest per brand' },
      { t: 'news_items', d: 'Append-only news articles, deduped by URL md5' },
      { t: 'launches', d: 'Per-product launch events, deduped by brand+url md5' },
      { t: 'launch_velocity', d: 'Daily 7d/14d/30d launch counts per brand' },
      { t: 'brand_jobs', d: 'Daily jobs rollup per brand' },
      { t: 'job_postings', d: 'Individual job postings, deduped' },
      { t: 'social_velocity', d: 'Daily Reddit mention velocity per brand' },
      { t: 'social_posts', d: 'Reddit/Grok posts, deduped' },
      { t: 'category_trends', d: 'Daily Google Trends per category keyword (incoming)' },
      { t: 'review_themes', d: 'Claude-extracted themes from Reddit posts per brand (incoming)' },
    ],
    views: [
      { t: 'v_latest_brand_snapshots', d: 'Most-recent day per brand, joined with brand metadata' },
      { t: 'v_latest_brand_mix', d: 'Most-recent mix metrics per brand' },
      { t: 'v_latest_launch_velocity', d: 'Most-recent velocity rollup per brand' },
    ],
  },
  {
    name: 'gymreapers_bsr',
    purpose: 'Amazon bestseller rank time-series — Whitespace, Demand Signals',
    tables: [
      { t: 'categories', d: 'Tracked Amazon categories (keyword + whitespace sub-queries)' },
      { t: 'snapshots', d: 'Daily category-level metadata (organic count, Gymreapers position)' },
      { t: 'product_snapshots', d: 'Daily ASIN-level rows — rank, price, reviews, bought-past-month' },
      { t: 'whitespace_snapshots', d: 'Daily sub-query analysis with HHI and opportunity score' },
      { t: 'autocomplete_snapshots', d: 'Amazon autocomplete suggestions by seed term (incoming)' },
    ],
    views: [
      { t: 'v_latest_snapshots', d: 'Most-recent day per category' },
      { t: 'v_latest_top_products', d: 'Top 25 ranked products per category for today' },
    ],
  },
];

const sampleQueries = [
  {
    title: 'Today’s Gymreapers position across Amazon categories',
    sql: `SELECT
  c.name AS category,
  s.gymreapers_present,
  s.gymreapers_top_rank
FROM gymreapers_bsr.snapshots s
JOIN gymreapers_bsr.categories c USING (slug)
WHERE s.snapshot_date = (SELECT MAX(snapshot_date) FROM gymreapers_bsr.snapshots)
ORDER BY s.gymreapers_top_rank NULLS LAST;`,
  },
  {
    title: 'Top 10 whitespace opportunities right now',
    sql: `SELECT category_slug, query, total_reviews_in_top_n, avg_price, concentration_hhi, opportunity_score
FROM gymreapers_bsr.whitespace_snapshots
WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM gymreapers_bsr.whitespace_snapshots)
  AND NOT gymreapers_present
  AND top_n_size > 0
ORDER BY opportunity_score DESC
LIMIT 10;`,
  },
  {
    title: 'Bought-past-month risers in lifting belts (7-day window)',
    sql: `SELECT
  asin,
  title,
  MAX(bought_past_month_label) AS curr_label,
  MAX(bought_past_month_est) AS curr_est,
  MIN(bought_past_month_est) AS prev_est
FROM gymreapers_bsr.product_snapshots
WHERE category_slug = 'lifting_belt'
  AND snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
  AND bought_past_month_est IS NOT NULL
GROUP BY asin, title
HAVING MAX(bought_past_month_est) > MIN(bought_past_month_est)
ORDER BY (MAX(bought_past_month_est) - MIN(bought_past_month_est)) DESC
LIMIT 20;`,
  },
  {
    title: 'Brand launch velocity comparison',
    sql: `SELECT b.name, lv.last_7d, lv.last_14d, lv.last_30d
FROM gymreapers_competitive.launch_velocity lv
JOIN gymreapers_competitive.brands b ON b.slug = lv.brand_slug
WHERE lv.snapshot_date = (SELECT MAX(snapshot_date) FROM gymreapers_competitive.launch_velocity)
ORDER BY lv.last_7d DESC;`,
  },
  {
    title: 'Price comparison for joggers across brands',
    sql: `SELECT
  bm.brand_slug,
  (bm.price_positioning->'bottoms'->>'avg')::numeric AS bottoms_avg_price,
  (bm.price_positioning->'bottoms'->>'min')::numeric AS bottoms_min_price,
  (bm.price_positioning->'bottoms'->>'max')::numeric AS bottoms_max_price
FROM gymreapers_competitive.brand_mix bm
WHERE bm.snapshot_date = (SELECT MAX(snapshot_date) FROM gymreapers_competitive.brand_mix)
  AND bm.price_positioning IS NOT NULL
ORDER BY bottoms_avg_price NULLS LAST;`,
  },
];

export default function DataExplorerPage() {
  return (
    <div className="space-y-10">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Data Explorer
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Query the underlying data.
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Every page in this dashboard reads from Supabase tables. If you want to slice the data
          your own way — Looker, Retool, Metabase, raw SQL in the Supabase studio — here&apos;s
          the map.
        </p>
      </header>

      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-xl font-bold text-gr-text mb-3">Where the data lives</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold text-gr-text">Project:</span>{' '}
            <code className="bg-gr-bg px-2 py-0.5 rounded text-xs">ValleySomm Supabase</code>{' '}
            <span className="text-gr-muted">(same project Masonic + Crop Circles use; Gymreapers data is isolated by schema)</span>
          </div>
          <div>
            <span className="font-semibold text-gr-text">Schemas:</span>{' '}
            <code className="bg-gr-bg px-2 py-0.5 rounded text-xs">gymreapers_competitive</code>,{' '}
            <code className="bg-gr-bg px-2 py-0.5 rounded text-xs">gymreapers_bsr</code>
          </div>
          <div>
            <span className="font-semibold text-gr-text">Access:</span>{' '}
            <span className="text-gr-muted">Service role for writes. Read access requires a Supabase API key — ping Chris for one.</span>
          </div>
          <div>
            <span className="font-semibold text-gr-text">Refresh:</span>{' '}
            <span className="text-gr-muted">Most tables update daily at 4–5 AM ET. Snapshot rows are idempotent (upsert on date+key).</span>
          </div>
        </div>
      </section>

      {schemas.map((s) => (
        <section key={s.name} className="bg-gr-surface border border-gr-border rounded-md p-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xl font-bold text-gr-text">
              <code className="font-mono">{s.name}</code>
            </h2>
          </div>
          <p className="text-sm text-gr-muted mb-4">{s.purpose}</p>

          <h3 className="font-semibold text-gr-text mb-2 text-sm uppercase tracking-wider">Tables</h3>
          <div className="space-y-1.5 mb-5">
            {s.tables.map((t) => (
              <div key={t.t} className="flex items-baseline gap-3 text-sm">
                <code className="bg-gr-bg px-2 py-0.5 rounded text-xs font-mono w-56 flex-shrink-0">{t.t}</code>
                <span className="text-gr-muted">{t.d}</span>
              </div>
            ))}
          </div>

          {s.views && s.views.length > 0 && (
            <>
              <h3 className="font-semibold text-gr-text mb-2 text-sm uppercase tracking-wider">Views</h3>
              <div className="space-y-1.5">
                {s.views.map((t) => (
                  <div key={t.t} className="flex items-baseline gap-3 text-sm">
                    <code className="bg-gr-bg px-2 py-0.5 rounded text-xs font-mono w-56 flex-shrink-0">{t.t}</code>
                    <span className="text-gr-muted">{t.d}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      ))}

      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-xl font-bold text-gr-text mb-4">Starter queries</h2>
        <div className="space-y-5">
          {sampleQueries.map((q) => (
            <div key={q.title}>
              <h3 className="text-sm font-semibold text-gr-text mb-2">{q.title}</h3>
              <pre className="bg-gr-bg border border-gr-border rounded p-3 text-xs overflow-x-auto text-gr-muted font-mono">
{q.sql}
              </pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
