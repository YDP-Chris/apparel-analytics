/**
 * Glossary registry — single source of truth for every term used across
 * the dashboard. The /glossary page reads from here, the <GlossaryTerm>
 * inline tooltip reads from here, the methodology page can link to here.
 *
 * Rules for adding a term:
 *   - Keep `short` to one sentence. If a reader needs more, they click through.
 *   - `long` is 2-4 sentences max. Don't write essays.
 *   - `example` should be concrete (use real numbers from the dashboard).
 *   - `related` cross-links other terms so people can navigate the conceptual graph.
 */

export interface Term {
  id: string;            // kebab-case, used as anchor and key
  label: string;         // display label (e.g. "HHI", "Bought-past-month")
  short: string;         // one-line tooltip
  long: string;          // expanded definition for /glossary
  example?: string;      // optional concrete example
  related?: string[];    // ids of related terms
  category: 'metric' | 'method' | 'source' | 'platform' | 'concept';
}

export const GLOSSARY: Term[] = [
  // ───── Metrics ─────
  {
    id: 'bsr',
    label: 'BSR (Bestseller Rank)',
    short: 'Amazon\'s popularity rank for a product in its category.',
    long: 'Amazon ranks every product in every category 1 to N by how recently it sold, weighted by volume. Rank 1 = currently selling more than anything else in that category. The number changes hourly. We capture the popularity-sorted search results daily as our BSR proxy.',
    example: 'Gymreapers Wrist Wraps at #1 in the "weightlifting wrist wraps" category means Amazon ranks it as the top seller in that search right now.',
    related: ['popularity-rank', 'bought-past-month'],
    category: 'metric',
  },
  {
    id: 'bought-past-month',
    label: 'Bought in past month',
    short: 'Amazon\'s monthly volume bucket (1K+, 3K+, 10K+) — closest public proxy to unit sales.',
    long: 'Amazon shows a "X bought in past month" label on most products selling >500/month. The label is banded (500+, 1K+, 2K+, 3K+, 5K+, 10K+, 20K+, 50K+, 90K+), not an exact count. Going from 1K+ to 3K+ is a real trend signal; sub-500 products don\'t show a label.',
    example: 'Element 26 lifting belt: 1K+ bought/month at $35 — a high-volume mid-tier product.',
    related: ['bsr', 'review-velocity'],
    category: 'metric',
  },
  {
    id: 'hhi',
    label: 'HHI (Herfindahl-Hirschman Index)',
    short: 'Brand-concentration score 0-1. Low = fragmented market, high = dominated by few brands.',
    long: 'HHI sums the squared market shares of every player in a market. We compute it across the top 20 products in a sub-query: if one brand owns most of those 20, HHI is high (entrenched); if 20 different brands each have one product, HHI is low (fragmented). Low HHI + high demand = whitespace opportunity.',
    example: 'HHI 0.10 with $50/unit avg price → fragmented entry-level market, room to compete. HHI 0.50 → one entrenched leader, harder to dislodge.',
    related: ['opportunity-score', 'whitespace'],
    category: 'metric',
  },
  {
    id: 'opportunity-score',
    label: 'Opportunity score',
    short: 'Total reviews in top 20 × (1 − HHI). High score = real demand + fragmented competition.',
    long: 'Combines two signals into one ranking number for whitespace queries: market demand (sum of review counts across the top 20 results, a sales proxy) and market concentration (1 minus HHI, so fragmentation increases the score). Used to rank whitespace opportunities so the highest-leverage gaps surface first.',
    example: 'A sub-query with 50,000 total reviews and HHI of 0.15 scores 50000 × 0.85 = 42,500.',
    related: ['hhi', 'whitespace'],
    category: 'metric',
  },
  {
    id: 'review-velocity',
    label: 'Review velocity',
    short: 'New reviews per day per product. Strongest public proxy for actual sales velocity.',
    long: 'Customer reviews lag sales by 1-2% conversion. So a product gaining many reviews per day is selling many units per day. Tracked by diffing consecutive daily snapshots in the data warehouse.',
    related: ['bought-past-month'],
    category: 'metric',
  },
  {
    id: 'wow',
    label: 'WoW (Week-over-Week %)',
    short: 'Percent change vs same metric one week prior.',
    long: 'Compares the most recent value of a series against the value one week earlier. +20% WoW means up 20% from last week. Useful for spotting accelerating trends, but watch for low-baseline noise: a metric going from 1 to 2 is +100% WoW but not meaningful.',
    related: ['mom'],
    category: 'metric',
  },
  {
    id: 'mom',
    label: 'MoM (Month-over-Month %)',
    short: 'Percent change vs same metric four weeks prior.',
    long: 'Less noisy than WoW for low-volume metrics. Use MoM to smooth out weekly seasonality (e.g. weekend ad spend).',
    related: ['wow'],
    category: 'metric',
  },
  {
    id: 'rank-delta',
    label: 'Rank delta (mover)',
    short: 'Day-over-day change in popularity rank.',
    long: 'If a product moved from #15 to #5 overnight, its rank delta is +10 (gained 10 spots). Negative deltas mean the product lost ranks. Sustained positive deltas over 3-5 days usually indicate a real demand shift, not noise.',
    related: ['bsr'],
    category: 'metric',
  },

  // ───── Methodology ─────
  {
    id: 'confidence-rating',
    label: 'Confidence rating',
    short: 'HIGH / MEDIUM / LOW score per data source, badged on every page.',
    long: 'Every signal in this dashboard comes from a specific source with known biases and sample size. HIGH = direct large-N capture (Amazon BSR, Shopify catalogs). MEDIUM = useful directional signal with caveats (Google Trends, Claude NLP). LOW = thin sample or biased (Reddit-only social listening). Click any badge to read the full source documentation.',
    related: ['triangulation'],
    category: 'method',
  },
  {
    id: 'snapshot-date',
    label: 'Snapshot date',
    short: 'The day the data on this page was captured.',
    long: 'Every page is anchored on a date because the underlying scrapers run daily, not in real time. A snapshot date of "May 16" means the prices, ranks, and volumes shown reflect what Amazon (or another source) was showing at the cron run time on May 16. Most pages refresh between 4-6 AM ET.',
    related: [],
    category: 'method',
  },
  {
    id: 'triangulation',
    label: 'Triangulation',
    short: '3+ independent sources agreeing on a signal = high confidence.',
    long: 'When the same insight surfaces across Amazon BSR rank movers, Google Trends WoW, and Reddit mention velocity, it\'s much more likely to be real than if only one source is talking. Strategic decisions ($250K+ commitments) should triangulate before acting.',
    related: ['confidence-rating'],
    category: 'method',
  },
  {
    id: 'idempotent',
    label: 'Idempotent',
    short: 'Re-running a job overwrites that day\'s row, never duplicates.',
    long: 'Every snapshot table enforces a unique constraint on (date + scope) so the next cron run replaces today\'s data instead of stacking duplicates. This is why you can run a scraper twice and not corrupt the data.',
    category: 'method',
  },

  // ───── Concepts ─────
  {
    id: 'whitespace',
    label: 'Whitespace',
    short: 'A sub-segment with real demand where Gymreapers is absent.',
    long: 'A whitespace gap is a search query (e.g. "13mm lever lifting belt") with high review volume across the top 20 results AND no Gymreapers product appearing. Multiple ways to attack: build the product, run ads against the query, or partner with a category leader. Surfaced and ranked on the Whitespace page.',
    related: ['opportunity-score', 'hhi'],
    category: 'concept',
  },
  {
    id: 'd2c',
    label: 'D2C (Direct-to-Consumer)',
    short: 'A brand\'s own website (not Amazon, not wholesale).',
    long: 'Vuori.com, Gymshark.com, Lululemon.com are D2C. Reviews and customers on a brand\'s D2C site skew differently than Amazon — D2C reviewers are loyalists, Amazon reviewers are bargain-hunters. We capture both to triangulate.',
    related: [],
    category: 'concept',
  },
  {
    id: 'velocity',
    label: 'Launch velocity',
    short: 'How many new products a brand has dropped recently (7-day / 14-day / 30-day windows).',
    long: 'Detected by diffing each brand\'s sitemap day-over-day. A spike (5+ new products in a single day) often signals a planned drop. Used in Launches and Today\'s "Competitor moves" section.',
    related: ['rank-delta'],
    category: 'concept',
  },
  {
    id: 'share-of-voice',
    label: 'Share of Voice',
    short: 'A brand\'s percentage of total mentions across the competitive set.',
    long: 'If three brands each got 100 mentions in a 7-day window, each has 33% SoV. We track mentions on Reddit; FB Ad Library volume and YouTube creator mentions are coming soon. Read directionally — Reddit\'s fitness audience skews powerlifting/male.',
    related: ['confidence-rating'],
    category: 'concept',
  },

  // ───── Sources / platforms ─────
  {
    id: 'yotpo',
    label: 'Yotpo',
    short: 'A review-widget platform many DTC brands embed on their product pages.',
    long: 'Vuori uses Yotpo. The widget makes a public API call to fetch reviews per product — we hit the same endpoint directly to capture them. About 30% of mid-market DTC brands use Yotpo.',
    category: 'platform',
  },
  {
    id: 'bazaarvoice',
    label: 'Bazaarvoice',
    short: 'A review platform used by larger DTC brands (Gymshark, Alo).',
    long: 'Bigger, enterprise-tier review system. Its API is well-documented but rate-limits aggressively for high-volume scraping. We pull a few-dozen reviews per product per scrape window.',
    category: 'platform',
  },
  {
    id: 'algolia',
    label: 'Algolia',
    short: 'A search-and-discovery service many e-commerce sites use.',
    long: 'Vuori and Gymshark both use Algolia to power their product listing pages. Their public search-only API key is embedded in the page JS — we call it directly to scrape their catalog without browser automation. Faster and more reliable than scraping the rendered HTML.',
    category: 'platform',
  },
  {
    id: 'akamai',
    label: 'Akamai (bot detection)',
    short: 'A CDN-level bot-blocker that Lululemon uses to gate scraping.',
    long: 'Lululemon\'s site sits behind Akamai\'s bot management. Datacenter IPs get HTTP/2 protocol errors or captchas on every request. Why Lululemon shows sitemap-only data — we can see what URLs they publish, not their pricing or reviews. Bypassing requires a residential-IP proxy ($50-200/mo).',
    category: 'platform',
  },
];

export function findTerm(id: string): Term | undefined {
  return GLOSSARY.find((t) => t.id === id);
}

export const TERMS_BY_CATEGORY: Record<Term['category'], Term[]> = {
  metric:   GLOSSARY.filter((t) => t.category === 'metric'),
  method:   GLOSSARY.filter((t) => t.category === 'method'),
  source:   GLOSSARY.filter((t) => t.category === 'source'),
  platform: GLOSSARY.filter((t) => t.category === 'platform'),
  concept:  GLOSSARY.filter((t) => t.category === 'concept'),
};
