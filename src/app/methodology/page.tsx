'use client';

import { GlossaryTerm } from '@/components/GlossaryTerm';

// Per-source confidence ratings live here as the single source of truth.
// The ConfidenceBadge component (in components/ConfidenceBadge.tsx) imports
// from this same registry so every page renders consistent badges.
//
// When you add a data source, add it here AND link to it from the page
// that consumes it. The credibility moat is one update away from breaking.

interface DataSource {
  id: string;
  name: string;
  audience: ('Marketing' | 'Product' | 'Both')[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  whatItCaptures: string;
  sampleSize: string;
  cadence: string;
  knownBiases: string[];
  limitations: string[];
  source: string;
  schema: string;
  usedBy: { href: string; label: string }[];
}

const SOURCES: DataSource[] = [
  {
    id: 'amazon_bsr',
    name: 'Amazon BSR (popularity rank)',
    audience: ['Product', 'Both'],
    confidence: 'HIGH',
    description:
      'Daily snapshots of Amazon\'s popularity-ranked search results for Gymreapers-aligned category keywords. Captures rank, price, rating, review count, and "X bought in past month" volume label per product per day.',
    whatItCaptures:
      'Top ~50 products per keyword × 37 tracked categories = ~1,800 product rows per daily snapshot.',
    sampleSize: '~1,800 ASIN rows/day · ~13,000 reviews indexed',
    cadence: 'Daily 5 AM ET',
    knownBiases: [
      'Amazon-only audience — bargain-hunter skew, US-only.',
      'Sponsored listings filtered out of organic rank but still captured separately.',
      '"Bought in past month" buckets only show on products selling >500/month.',
    ],
    limitations: [
      'No actual unit sales — bought-past-month is a banded estimate (1K+, 3K+, 10K+).',
      'No discount-vs-retail differentiation in the price field.',
      'Categories with <30 organic results (lifting_shoes, gym_bag) are thin — Amazon doesn\'t fill 100 spots for every search.',
    ],
    source: 'https://www.amazon.com/s?s=exact-aware-popularity-rank',
    schema: 'gymreapers_bsr',
    usedBy: [
      { href: '/gymreapers/amazon', label: 'Whitespace' },
      { href: '/for-product/demand', label: 'Demand Signals' },
      { href: '/today', label: 'Today\'s brief' },
    ],
  },
  {
    id: 'amazon_autocomplete',
    name: 'Amazon autocomplete (search trends)',
    audience: ['Marketing'],
    confidence: 'HIGH',
    description:
      'Amazon\'s own popularity-ordered query completions for seed terms like "lifting belt" or "crossfit grips". Captures what people are typing into the search box.',
    whatItCaptures: '25 seed terms × ~8.5 suggestions = ~213 suggestion rows per daily snapshot.',
    sampleSize: '213 ranked suggestions/day',
    cadence: 'Daily 5:30 AM ET',
    knownBiases: ['Reflects Amazon search behavior only — not Google, not TikTok.'],
    limitations: ['No volume number per suggestion — only relative rank.'],
    source: 'https://completion.amazon.com/api/2017/suggestions',
    schema: 'gymreapers_bsr.autocomplete_snapshots',
    usedBy: [{ href: '/for-marketing/trending', label: 'Trending Terms' }],
  },
  {
    id: 'shopify_catalog',
    name: 'Shopify product catalogs (Gymreapers + peers)',
    audience: ['Product', 'Both'],
    confidence: 'HIGH',
    description:
      'Daily scrape of `/products.json` from every Shopify-backed brand in the competitive set. Captures total products, prices, colors, sizes, categories, and gender split per brand.',
    whatItCaptures: '~14,000 product rows across 10 brands. Per-brand mix metrics computed nightly.',
    sampleSize: '~14,000 SKUs from 10 brands',
    cadence: 'Daily 4 AM ET (Tue-Sat), full pipeline Sun 11 PM',
    knownBiases: ['Each brand splits colorways into separate "products" — see notes per brand.'],
    limitations: [
      'Lululemon, Alo, Vuori use proxy-blocked Shopify endpoints. Vuori is scraped via direct Algolia API; Alo via products.json. Lululemon is sitemap-only (no color/size/price).',
    ],
    source: 'Each brand\'s `/products.json` Shopify endpoint',
    schema: 'gymreapers_competitive.brand_snapshots + brand_mix',
    usedBy: [
      { href: '/gymreapers', label: 'Scorecard' },
      { href: '/gymreapers/mix', label: 'Mix Gaps' },
      { href: '/for-product/pricing', label: 'Pricing Map' },
    ],
  },
  {
    id: 'google_trends_brand',
    name: 'Google Trends — brand-level',
    audience: ['Marketing'],
    confidence: 'MEDIUM',
    description:
      'Brand-name search interest scores (0-100 normalized by Google) with week-over-week and month-over-month deltas.',
    whatItCaptures: '~10 brand keywords. Score is relative, not absolute volume.',
    sampleSize: '10 brand keywords/day',
    cadence: 'Daily',
    knownBiases: [
      'Google\'s 0-100 score is relative to the search-term universe in the query window — comparing two pulls requires the same query.',
      'Low-volume brands return noisy scores; low-volume keywords can register as -100% WoW from a rounding artifact.',
    ],
    limitations: ['No absolute search volume — only relative scale.'],
    source: 'pytrends (unofficial Google Trends client)',
    schema: 'gymreapers_competitive.brand_trends',
    usedBy: [{ href: '/gymreapers', label: 'Scorecard' }],
  },
  {
    id: 'google_trends_category',
    name: 'Google Trends — category-level',
    audience: ['Marketing', 'Product'],
    confidence: 'MEDIUM',
    description:
      '30 category keywords (lifting belt, knee sleeves, massage gun…) tracked daily with WoW + MoM and a 90-day series.',
    whatItCaptures: '30 keywords/day across 4 groups (strength, gymnastics, apparel, recovery).',
    sampleSize: '30 keywords × 90 days of history',
    cadence: 'Daily 5:45 AM ET',
    knownBiases: ['Same 0-100 normalization caveat as brand-level.'],
    limitations: ['12 keywords sit at current_interest=0 today — low search volume produces noise rather than signal.'],
    source: 'pytrends',
    schema: 'gymreapers_competitive.category_trends',
    usedBy: [{ href: '/for-marketing/trending', label: 'Trending Terms' }],
  },
  {
    id: 'reddit',
    name: 'Reddit posts (social listening)',
    audience: ['Marketing'],
    confidence: 'LOW',
    description: 'Reddit posts mentioning Gymreapers or any tracked competitor, captured via PRAW.',
    whatItCaptures: 'Posts per brand per day, with sentiment label, score, subreddit context.',
    sampleSize: 'Very thin today — Lululemon ~30 posts/14d, Bear Grips ~7, Gymreapers itself: 0.',
    cadence: 'Every 4 hours',
    knownBiases: [
      'Reddit fitness community skews heavily male, powerlifting-leaning, US/UK-centric — NOT a representative slice of Gymreapers\' broader audience.',
      'Subreddit list was originally built for ValleySomm (r/ncwine etc.). Needs expansion to r/powerlifting, r/weightroom, r/crossfit, r/Fitness, r/gymsnark to be useful.',
    ],
    limitations: [
      'Sentiment is rule-based, not Claude-graded. Treat as directional.',
      'Mentions don\'t equal share-of-voice in the real customer base.',
    ],
    source: 'PRAW (Reddit API)',
    schema: 'gymreapers_competitive.social_posts + social_velocity',
    usedBy: [{ href: '/for-marketing/voice', label: 'Share of Voice' }],
  },
  {
    id: 'review_themes',
    name: 'Reddit theme NLP (Claude)',
    audience: ['Marketing', 'Product'],
    confidence: 'MEDIUM',
    description:
      'Claude Sonnet reads the last 14 days of Reddit posts per brand and extracts 3-8 recurring themes with sentiment.',
    whatItCaptures: '~9 theme rows per run. Depends entirely on Reddit feed quality (see above LOW caveat).',
    sampleSize: '9 themes across 2 brands today (only Lululemon + Bear Grips have enough posts to analyze).',
    cadence: 'Weekly Mondays 7:30 AM ET',
    knownBiases: ['Inherits Reddit\'s biases. Claude\'s theme extraction is opinionated — same data could produce different theme labels run-to-run.'],
    limitations: [
      'Skips brands with <5 posts (most are skipped today).',
      'Will become useful when Reddit feed expands or D2C-review scrape lands.',
    ],
    source: 'Claude Sonnet 4.6 over gymreapers_competitive.social_posts',
    schema: 'gymreapers_competitive.review_themes',
    usedBy: [{ href: '/for-marketing/sentiment', label: 'Sentiment Pulse' }],
  },
  {
    id: 'news',
    name: 'News articles (RSS + Google News)',
    audience: ['Marketing'],
    confidence: 'MEDIUM',
    description:
      'Industry trades (Retail Dive, Business of Fashion) + Google News searches for each brand. Captures headline, URL, date, summary.',
    whatItCaptures: 'Last 50 articles across the brand set.',
    sampleSize: '11 recent articles indexed today',
    cadence: 'Every 4 hours',
    knownBiases: ['Trade-press skew — favors larger brands with PR budgets.'],
    limitations: ['Smaller brands appear rarely; small brand silence is not a signal.'],
    source: 'Google News RSS + curated trade feeds',
    schema: 'gymreapers_competitive.news_items',
    usedBy: [
      { href: '/today', label: 'Today\'s brief' },
      { href: '/for-marketing/beats', label: 'Competitor Beats' },
    ],
  },
  {
    id: 'launches',
    name: 'Launch detection (sitemap + news)',
    audience: ['Product'],
    confidence: 'MEDIUM',
    description:
      'New product URLs detected via daily sitemap diff per brand + cross-referenced with launch-keyword news mentions.',
    whatItCaptures: 'Recent drops (last ~50), plus per-brand velocity (last 7d / 14d / 30d counts).',
    sampleSize: '50 recent launches/day across the set',
    cadence: 'Daily',
    knownBiases: [
      'Sitemap-only brands (Lululemon, Alo, Vuori) lack product-level color/size context — only URL + classifier-inferred category.',
      'Brand color/style variations sometimes count as separate "products" depending on URL structure.',
    ],
    limitations: ['Product name extraction is regex-based per brand — Lululemon and Alo parsers were fixed 2026-05-15, but a brand changing URL shape could regress.'],
    source: 'sitemap.xml per brand + Google News',
    schema: 'gymreapers_competitive.launches + launch_velocity',
    usedBy: [
      { href: '/gymreapers/launches', label: 'Launch Velocity' },
      { href: '/for-marketing/beats', label: 'Competitor Beats' },
    ],
  },
  {
    id: 'jobs',
    name: 'Job postings (Greenhouse / Lever)',
    audience: ['Both'],
    confidence: 'MEDIUM',
    description: 'Daily check of public Greenhouse + Lever boards per brand for new postings.',
    whatItCaptures: 'Total jobs, change from prior day, departments + seniority breakdown, individual postings.',
    sampleSize: 'Only 2 brands have public boards we can scrape today; the rest are dark.',
    cadence: 'Daily 5 AM ET',
    knownBiases: ['Coverage is uneven — strength brands rarely use Greenhouse/Lever.'],
    limitations: ['Most strength-peer brands have no public ATS — they\'re invisible to this signal.'],
    source: 'boards.greenhouse.io + jobs.lever.co per brand',
    schema: 'gymreapers_competitive.brand_jobs + job_postings',
    usedBy: [{ href: '/gymreapers/jobs', label: 'Jobs' }],
  },
];

const CONFIDENCE_STYLES = {
  HIGH:   { bg: 'bg-gr-success/15',     border: 'border-gr-success',   text: 'text-gr-success',  label: 'HIGH confidence' },
  MEDIUM: { bg: 'bg-gr-accent-soft/40', border: 'border-gr-accent',    text: 'text-gr-accent',   label: 'MEDIUM confidence' },
  LOW:    { bg: 'bg-gr-danger/10',      border: 'border-gr-danger/60', text: 'text-gr-danger',   label: 'LOW confidence' },
};

export default function MethodologyPage() {
  return (
    <div className="space-y-10">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Methodology
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">How to read this dashboard</h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Every number on every page comes from one of the data sources below. Each source is
          rated HIGH, MEDIUM, or LOW{' '}
          <GlossaryTerm id="confidence-rating">confidence</GlossaryTerm> based on its sample size,
          freshness, and known biases. If you&apos;re going to make a decision off a number, scan
          its source&apos;s confidence rating first — and for strategic moves, look for{' '}
          <GlossaryTerm id="triangulation">triangulation</GlossaryTerm> across sources.
        </p>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h2 className="text-xl font-bold text-gr-text mb-4">How confidence ratings work</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${CONFIDENCE_STYLES.HIGH.bg} ${CONFIDENCE_STYLES.HIGH.text}`}>HIGH</span>
            <div className="text-gr-muted">
              Large sample size, daily refresh, captured directly from the source of truth. Examples:
              Amazon BSR, Shopify product catalogs, Amazon autocomplete. <strong className="text-gr-text">Decisions up to executive-grade may rely on these signals alone.</strong>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${CONFIDENCE_STYLES.MEDIUM.bg} ${CONFIDENCE_STYLES.MEDIUM.text}`}>MEDIUM</span>
            <div className="text-gr-muted">
              Useful directional signal but has structural caveats (normalized scores, partial
              coverage, interpretive layer). <strong className="text-gr-text">Triangulate with another source before betting big.</strong>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${CONFIDENCE_STYLES.LOW.bg} ${CONFIDENCE_STYLES.LOW.text}`}>LOW</span>
            <div className="text-gr-muted">
              Thin data, biased sample, or known structural limitation. <strong className="text-gr-text">Read these as hypotheses to test, never as conclusions.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h2 className="text-xl font-bold text-gr-text mb-4">Decision-confidence ladder</h2>
        <div className="text-sm text-gr-muted leading-relaxed space-y-3">
          <p>
            We score what level of confidence a decision needs, then map it to which sources can
            support it.
          </p>
          <div className="bg-gr-bg rounded p-4 space-y-3">
            <div>
              <span className="font-bold text-gr-text">Tactical</span>{' '}
              <span className="text-gr-subtle">(next blog post, ad headline, social hook)</span>{' '}
              — ~60% confidence threshold. Single LOW or MEDIUM source is fine.
            </div>
            <div>
              <span className="font-bold text-gr-text">Strategic</span>{' '}
              <span className="text-gr-subtle">(launch a new product line, kill a SKU)</span>{' '}
              — ~85% threshold. Requires <strong>multi-source corroboration</strong>: at least one
              HIGH source AND one other independent source agreeing.
            </div>
            <div>
              <span className="font-bold text-gr-text">Executive</span>{' '}
              <span className="text-gr-subtle">($250K+ commitment, public stance)</span>{' '}
              — ~95% threshold. HIGH sources + independent human spot-check + external validation
              (industry report, internal sales correlation, customer interview).
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gr-text">Data sources</h2>
        {SOURCES.map((s) => {
          const styles = CONFIDENCE_STYLES[s.confidence];
          return (
            <div
              key={s.id}
              className={`rounded-md border-2 p-6 ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h3 className="text-xl font-bold text-gr-text">{s.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${styles.text} bg-gr-bg`}>
                  {styles.label}
                </span>
              </div>

              <p className="text-sm text-gr-muted leading-relaxed mb-4">{s.description}</p>

              <dl className="grid md:grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle">Audience</dt>
                  <dd className="text-gr-text">{s.audience.join(', ')}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle">Cadence</dt>
                  <dd className="text-gr-text">{s.cadence}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle">Sample size</dt>
                  <dd className="text-gr-text">{s.sampleSize}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle">Schema / source</dt>
                  <dd className="text-gr-text">
                    <code className="bg-gr-bg px-1.5 py-0.5 rounded text-xs">{s.schema}</code>
                  </dd>
                </div>
              </dl>

              <div className="mb-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-gr-subtle mb-1">What it captures</div>
                <div className="text-sm text-gr-muted">{s.whatItCaptures}</div>
              </div>

              <div className="mb-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-gr-subtle mb-1">Known biases</div>
                <ul className="text-sm text-gr-muted list-disc list-inside space-y-0.5">
                  {s.knownBiases.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-gr-subtle mb-1">Limitations</div>
                <ul className="text-sm text-gr-muted list-disc list-inside space-y-0.5">
                  {s.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>

              <div className="flex items-baseline justify-between gap-4 text-xs">
                <div>
                  <span className="text-gr-subtle uppercase tracking-wider font-semibold">Used by:</span>{' '}
                  {s.usedBy.map((u, i) => (
                    <span key={u.href}>
                      <a href={u.href} className="text-gr-accent hover:underline">
                        {u.label}
                      </a>
                      {i < s.usedBy.length - 1 && <span className="text-gr-subtle">, </span>}
                    </span>
                  ))}
                </div>
                <div className="text-gr-subtle">
                  Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">{s.source}</code>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h2 className="text-xl font-bold text-gr-text mb-3">What we&apos;re NOT capturing</h2>
        <p className="text-sm text-gr-muted leading-relaxed mb-3">
          Honest about gaps. If you make a decision that depends on any of the below, this
          dashboard isn&apos;t the source — go elsewhere.
        </p>
        <ul className="text-sm text-gr-muted list-disc list-inside space-y-1">
          <li><b className="text-gr-text">Actual unit sales.</b> No competitor publishes them. Amazon&apos;s "bought past month" is a banded estimate, not a precise number.</li>
          <li><b className="text-gr-text">D2C site reviews.</b> Coming online — see Sentiment Pulse status.</li>
          <li><b className="text-gr-text">Influencer / creator content.</b> Coming online via creator-monitor agent.</li>
          <li><b className="text-gr-text">Paid ad creative.</b> Coming online via Facebook Ad Library.</li>
          <li><b className="text-gr-text">Wholesale / B2B channel intel.</b> Not tracked — competitors at Dick&apos;s, REI, Academy are invisible to us.</li>
          <li><b className="text-gr-text">Customer demographics.</b> No first-party-data integration. Our own marketing platform is the source of truth there.</li>
          <li><b className="text-gr-text">Manufacturing / supply chain signals.</b> Patent filings, factory permits, port volumes — all out of scope.</li>
        </ul>
      </section>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h2 className="text-xl font-bold text-gr-text mb-3">How we prove this is accurate</h2>
        <ul className="text-sm text-gr-muted space-y-2 leading-relaxed">
          <li>· <b className="text-gr-text">Data-QA agent</b> runs every 30 min validating freshness, volume, consistency, and outliers across all tracked tables. See <a href="/data-quality" className="text-gr-accent hover:underline">/data-quality</a>.</li>
          <li>· <b className="text-gr-text">Provenance</b> — every row links back to its source URL + scrape timestamp. Click any number to see the underlying record.</li>
          <li>· <b className="text-gr-text">Idempotent upserts</b> — re-running a daily job overwrites that day&apos;s row, never duplicates. The schema enforces this with unique constraints.</li>
          <li>· <b className="text-gr-text">Open SQL access</b> — see <a href="/data-explorer" className="text-gr-accent hover:underline">/data-explorer</a> for the full schema map and starter queries. Verify anything yourself.</li>
          <li>· <b className="text-gr-text">Weekly manual QA sample</b> (planned) — 10 random insights verified by hand each Monday, accuracy logged so we can show a long-running validity track record.</li>
        </ul>
      </section>
    </div>
  );
}
