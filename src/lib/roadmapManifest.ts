/**
 * roadmapManifest.ts
 *
 * Single source of truth for the /roadmap page's QUEUED / BLOCKED items
 * and for the lane (Marketing / Product / Cross-cutting) each shipped page
 * belongs to.
 *
 * Why this file exists
 * --------------------
 * /roadmap used to be a hand-curated wall of items inside page.tsx. Every
 * time we shipped a page, the roadmap went stale until someone updated it.
 * Now /roadmap auto-derives its LIVE / IN-FLIGHT entries from the nav and
 * only the queued + blocked work lives here, since that work has no nav
 * presence yet by definition.
 *
 * Edit this file when:
 *  - you ship a brand new section in Navigation.tsx -> add an entry to
 *    LANE_MAP so /roadmap knows which lane to put it in
 *  - you want to add a future item to the queue (QUEUED_ITEMS) or note a
 *    blocked initiative (BLOCKED_ITEMS)
 *  - the auto-derived nav description is too terse for /roadmap and you
 *    want a fuller blurb (OVERRIDE_DESCRIPTIONS)
 *
 * Do NOT edit page.tsx for new shipped items - they should flow through
 * Navigation.tsx automatically.
 */

export type Lane = 'marketing' | 'product' | 'cross_cutting';
export type RoadmapStatus = 'live' | 'in_flight' | 'queued' | 'blocked';

export interface RoadmapItem {
  title: string;
  href?: string;            // present if shipped or partially shipped
  status: RoadmapStatus;
  description: string;
  updated?: string;         // ISO date string for shipped items
  lane: Lane;
}

// NAV_SECTIONS_MIRROR ------------------------------------------------------
// Keep this in sync with NAV_SECTIONS in src/components/Navigation.tsx.
// Navigation.tsx is a 'use client' component, so we mirror the shape here
// rather than import it - importing a client module into an SSR page tree
// pulls the whole client boundary in for no gain.
//
// Only fields the roadmap cares about are mirrored: href, label, status,
// description, and children.
// -------------------------------------------------------------------------

export type NavChildMirror = {
  href: string;
  label: string;
  status?: 'live' | 'beta' | 'soon';
  description?: string;
};

export type NavSectionMirror = {
  href: string;
  label: string;
  status?: 'live' | 'beta' | 'soon';
  description?: string;
  children?: NavChildMirror[];
};

export const NAV_SECTIONS_MIRROR: NavSectionMirror[] = [
  { href: '/today', label: 'Today', status: 'live', description: 'Daily landing brief with the single biggest opportunity at the top.' },
  { href: '/roadmap', label: 'Roadmap', status: 'live', description: 'This page. Trajectory plus status across all dashboards.' },
  { href: '/exec-brief', label: 'Exec Brief', status: 'live', description: 'Weekly exec-level summary for Chris and the CEO.' },
  { href: '/three-horizons', label: 'Horizons', status: 'beta', description: 'CEO conversation document: Now (next 90 days), Next (next 365 days), Then (1-3 years) with the apparel thesis in the middle.' },
  { href: '/anomalies', label: 'Anomalies', status: 'live', description: 'Auto-detected unusual deltas across every time-series metric.' },
  { href: '/leak-radar', label: 'Leak Radar', status: 'live', description: 'Fused pre-launch leak signals: trademark, prelaunch radar, sitemap inserts.' },
  { href: '/journey', label: 'Journey', status: 'live', description: 'Strength athlete journey map with apparel touchpoints.' },
  { href: '/apparel-entry-candidates', label: 'Entry Candidates', status: 'live', description: 'Strength-athlete-filtered apparel categories to enter next.' },
  { href: '/entry-opportunities', label: 'Entry Opportunities', status: 'live', description: 'Synthesized product entry recs from cluster overlap and GR catalog gap. 18 ranked.' },
  { href: '/next-skus', label: 'Next 5 SKUs', status: 'live', description: 'Synthesized product-strategy artifact. Top 5 concrete launch recs from VoC plus entry plus competitor work.' },
  { href: '/compare', label: 'Compare', status: 'live', description: 'Brand-vs-brand side-by-side across 8 panels.' },
  {
    href: '/for-marketing',
    label: 'For Marketing',
    children: [
      { href: '/for-marketing/trending', label: 'Trending Terms', status: 'live', description: 'Rising searches by category (Google + Amazon)' },
      { href: '/for-marketing/voice', label: 'Share of Voice', status: 'live', description: 'Mentions across news + Reddit + reviews' },
      { href: '/for-marketing/sentiment', label: 'Sentiment Pulse', status: 'live', description: 'What people love and hate by brand' },
      { href: '/voc-personas', label: 'VoC Personas', status: 'beta', description: 'Customer voice plus life context per brand from 1,785 D2C reviews' },
      { href: '/cluster-matrix', label: 'Cluster Matrix', status: 'beta', description: 'Cross-brand customer voice overlap heatmap. 116 cluster pairs scored.' },
      { href: '/customer-flow', label: 'Customer Flow', status: 'beta', description: 'Brand switchers in their own words. Origin brand inferred from review text via regex.' },
      { href: '/copy-mine', label: 'Copy Mine', status: 'beta', description: 'Verbatim customer phrases per brand. Which hooks each brand owns and where Gymreapers has no claim yet.' },
      { href: '/for-marketing/beats', label: 'Competitor Beats', status: 'live', description: 'Launches plus news to react to' },
      { href: '/promo-calendar', label: 'Promo Calendar', status: 'live', description: 'When competitors discount, how deep, and what categories' },
      { href: '/email-intel', label: 'Email Intel', status: 'soon', description: 'Captured competitor newsletter cadence plus offers. Waiting on Gmail OAuth setup.' },
      { href: '/paid-creators', label: 'Paid Creators', status: 'beta', description: 'Sponsored vs organic UGC velocity per brand' },
      { href: '/trademarks', label: 'Trademark Radar', status: 'live', description: 'USPTO trademark filings as pre-launch leak signal' },
      { href: '/patents', label: 'Patent Radar', status: 'live', description: 'USPTO patents. Material plus construction leak signal.' },
      { href: '/competitive-response', label: 'Competitive Response', status: 'beta', description: 'Who reacts when Gymreapers moves. Sparse until 14d+ history accumulates.' },
      { href: '/gymshark-vulnerability', label: 'Gymshark Dossier', status: 'live', description: '18 vulnerable Gymshark SKUs, 254 captured complaints. Focused brand-attack map.' },
      { href: '/prelaunch-radar', label: 'Pre-launch Radar', status: 'beta', description: 'Search autocomplete plus image CDN plus sitemap inserts. 9 brands captured, 4 v2-blocked.' },
      { href: '/athletes', label: 'Athletes', status: 'soon', description: 'Sponsored athlete roster comparison. Proposal written, awaiting decision.' },
    ],
  },
  {
    href: '/for-product',
    label: 'For Product',
    children: [
      { href: '/gymreapers/amazon', label: 'Whitespace', status: 'live', description: 'Sub-segments where Gymreapers is absent plus has demand' },
      { href: '/for-product/pricing', label: 'Pricing Map', status: 'live', description: 'Competitor pricing by category and tier' },
      { href: '/gymreapers/mix', label: 'Mix Gaps', status: 'live', description: 'Color, size, and price tier deltas' },
      { href: '/gymreapers/launches', label: 'Launch Velocity', status: 'live', description: 'What competitors are dropping' },
      { href: '/for-product/demand', label: 'Demand Signals', status: 'live', description: 'Amazon bought-past-month winners plus risers' },
      { href: '/for-product/gaps', label: 'Coverage Gaps', status: 'live', description: 'Where Gymreapers under- or over-indexes vs peers on subcategory depth' },
      { href: '/reposition-radar', label: 'Reposition Radar', status: 'beta', description: 'Free-revenue lens. For each existing Gymreapers SKU, the recommended rename, re-merchandise, re-photograph, or re-bundle action to align with the cluster actually buying it.' },
      { href: '/gr-sku-tracker', label: 'Apparel SKU Tracker', status: 'beta', description: '456 GR apparel SKUs tracked, 100 percent peer-benchmarked. Review velocity lights up as Okendo backfill deepens.' },
      { href: '/voc-complaints', label: 'VoC Complaints', status: 'live', description: 'Claude-categorized complaints across 1,388 D2C reviews. 376 complaint rows captured.' },
      { href: '/competitor-weakness', label: 'Competitor Weakness', status: 'live', description: 'Specific peer SKUs with concentrated complaints. Directly-attackable products.' },
      { href: '/site-ux', label: 'Site UX', status: 'beta', description: 'PSI scores plus structural signals per brand. Weekly refresh; PSI quota resolves overnight.' },
      { href: '/bundles', label: 'Bundles', status: 'live', description: 'Multi-pack and bundle strategy across brands' },
      { href: '/policies', label: 'Policies', status: 'live', description: 'Free shipping, returns, subscriptions, made-in-USA per brand' },
    ],
  },
  {
    href: '/data-explorer',
    label: 'Data Explorer',
    children: [
      { href: '/playbooks', label: 'Playbooks', status: 'live', description: 'What to do when each signal fires. Scenario-driven guide.' },
      { href: '/log', label: 'Decisions Log', status: 'live', description: 'Every intent the team has set plus notes attached to findings' },
      { href: '/usage', label: 'Usage', status: 'live', description: 'What the team actually uses. Anonymous, aggregated.' },
      { href: '/methodology', label: 'Methodology', status: 'live', description: 'How every source is captured, sampled, biased. Confidence ratings.' },
      { href: '/glossary', label: 'Glossary', status: 'live', description: 'Every term defined. HHI, BSR, bought-past-month, and the rest.' },
      { href: '/data-quality', label: 'Data Quality', status: 'live', description: 'Live data-qa run status. Freshness, volume, consistency.' },
      { href: '/inputs', label: 'Team Inputs', status: 'live', description: 'Approve, reject, and audit team-submitted keywords plus queries' },
      { href: '/trends', label: 'Trends Explorer', status: 'live', description: 'Chart any metric, any brands, any window' },
      { href: '/data-explorer', label: 'SQL Reference', status: 'live', description: 'Schema map plus starter queries for analyst self-service' },
    ],
  },
];

// LANE_MAP ---------------------------------------------------------------
// Map each navigable href to its roadmap lane. Anything in NAV_SECTIONS_MIRROR
// that has no entry here defaults to 'cross_cutting'.
//
// When you ship a new page and add it to Navigation.tsx, add the href here
// too so it lands in the correct lane on /roadmap.
// ------------------------------------------------------------------------

export const LANE_MAP: Record<string, Lane> = {
  // Marketing lane
  '/for-marketing/sentiment': 'marketing',
  '/for-marketing/voice': 'marketing',
  '/for-marketing/trending': 'marketing',
  '/for-marketing/beats': 'marketing',
  '/promo-calendar': 'marketing',
  '/paid-creators': 'marketing',
  '/trademarks': 'marketing',
  '/patents': 'marketing',
  '/prelaunch-radar': 'marketing',
  '/email-intel': 'marketing',
  '/voc-personas': 'marketing',
  '/cluster-matrix': 'marketing',
  '/customer-flow': 'marketing',
  '/copy-mine': 'marketing',
  '/competitive-response': 'marketing',
  '/gymshark-vulnerability': 'marketing',
  '/athletes': 'marketing',
  '/leak-radar': 'marketing',

  // Product lane
  '/journey': 'product',
  '/apparel-entry-candidates': 'product',
  '/entry-opportunities': 'product',
  '/next-skus': 'product',
  '/for-product/gaps': 'product',
  '/for-product/pricing': 'product',
  '/for-product/demand': 'product',
  '/gymreapers/amazon': 'product',
  '/gymreapers/mix': 'product',
  '/gymreapers/launches': 'product',
  '/bundles': 'product',
  '/policies': 'product',
  '/voc-complaints': 'product',
  '/competitor-weakness': 'product',
  '/gr-sku-tracker': 'product',
  '/reposition-radar': 'product',
  '/site-ux': 'product',

  // Cross-cutting lane
  '/today': 'cross_cutting',
  '/exec-brief': 'cross_cutting',
  '/three-horizons': 'cross_cutting',
  '/roadmap': 'cross_cutting',
  '/compare': 'cross_cutting',
  '/anomalies': 'cross_cutting',
  '/trends': 'cross_cutting',
  '/usage': 'cross_cutting',
  '/log': 'cross_cutting',
  '/inputs': 'cross_cutting',
  '/methodology': 'cross_cutting',
  '/glossary': 'cross_cutting',
  '/playbooks': 'cross_cutting',
  '/data-quality': 'cross_cutting',
  '/data-explorer': 'cross_cutting',
};

// OVERRIDE_DESCRIPTIONS ---------------------------------------------------
// If the nav child description is too terse for /roadmap, override it here.
// Keyed by href.
// ------------------------------------------------------------------------

export const OVERRIDE_DESCRIPTIONS: Record<string, string> = {
  '/for-marketing/sentiment': 'What people love and hate about each brand, distilled from reviews and Reddit.',
  '/for-marketing/voice': 'Mentions across news, Reddit, and reviews by brand.',
  '/for-marketing/trending': 'Rising searches by category from Google plus Amazon autocomplete.',
  '/for-marketing/beats': 'Launches and news to react to, ranked by reach.',
  '/promo-calendar': 'When competitors discount, how deep, and what categories.',
  '/paid-creators': 'Sponsored vs organic UGC velocity per brand.',
  '/trademarks': 'USPTO trademark filings as pre-launch leak signal.',
  '/patents': 'USPTO patents and applications for material plus construction innovations.',
  '/prelaunch-radar': 'Autocomplete plus image CDN plus sitemap inserts before products go live.',
  '/email-intel': 'Captured competitor newsletters. Empty state until Gmail OAuth is wired.',
  '/voc-personas': 'Emergent customer voice clusters per brand from 1,785 D2C reviews. 38 clusters discovered.',
  '/cluster-matrix': 'Cross-brand customer voice overlap heatmap. 116 cluster pairs scored.',
  '/customer-flow': 'Brand switchers in their own words. Lululemon to Alo/Gymshark migration confirmed.',
  '/copy-mine': 'Customer-voice marketing copy bank. 108 phrases mined; GR claim opportunities surfaced.',
  '/competitive-response': 'Who reacts when Gymreapers moves. Sparse until 14d history accumulates.',
  '/gymshark-vulnerability': '18 vulnerable Gymshark SKUs, 254 captured complaints. Focused brand-attack map.',

  '/journey': 'Strength athlete journey map with apparel touchpoints.',
  '/apparel-entry-candidates': 'Strength-athlete-filtered apparel categories to enter next.',
  '/for-product/gaps': 'Apparel-tier default. Where Gymreapers under- or over-indexes vs the field.',
  '/for-product/pricing': 'Competitor pricing by category and tier.',
  '/for-product/demand': 'Amazon bought-past-month winners and risers.',
  '/gymreapers/amazon': 'Sub-segments where Gymreapers is absent and has demand.',
  '/gymreapers/mix': 'Color, size, and price tier deltas vs peer set.',
  '/gymreapers/launches': 'What competitors are dropping and how often.',
  '/bundles': 'Multi-pack and bundle strategy across brands.',
  '/policies': 'Free shipping, returns, subscriptions, made-in-USA per brand.',
  '/voc-complaints': '376 complaint rows across 11 kinds. Top universal pain: fit_issue (114 mentions).',
  '/entry-opportunities': 'Synthesized product entry recs from cluster overlap plus GR catalog gap. 18 ranked.',
  '/competitor-weakness': '35 vulnerable peer SKUs ranked by complaint concentration. Gymshark equals 60 percent of vulnerable.',
  '/gr-sku-tracker': 'Per-SKU instrumentation for the apparel push. 456 GR apparel SKUs, 100 percent peer-benchmarked.',
  '/site-ux': 'PageSpeed Insights plus structural signals per brand. Weekly refresh.',
  '/next-skus': 'Synthesized product-strategy artifact. Synthesizes all VoC plus entry plus competitor work into 5 concrete launch recs.',

  '/today': 'Daily landing brief with the single biggest opportunity at the top.',
  '/exec-brief': 'Weekly exec-level summary for Chris and the CEO.',
  '/three-horizons': 'CEO conversation document. Three horizons: Now (next 90 days), Next (next 365 days), Then (1-3 years). Apparel thesis in the middle.',
  '/reposition-radar': 'Free-revenue lens. For each existing Gymreapers SKU, the recommended rename, re-merchandise, re-photograph, or re-bundle action to align with the cluster actually buying it.',
  '/trends': 'Chart any metric, any brands, any window.',
  '/usage': 'What the team actually uses. Anonymous, aggregated.',
  '/log': 'Every intent the team has set plus notes attached to findings.',
  '/inputs': 'Approve, reject, and audit team-submitted keywords plus queries plus ideas.',
  '/methodology': 'How every source is captured, sampled, and biased. Confidence ratings.',
  '/glossary': 'Every term defined. HHI, BSR, bought-past-month, and the rest.',
  '/playbooks': 'What to do when each signal fires. Scenario-driven guide.',
  '/data-quality': 'Live data-qa run status. Freshness, volume, consistency.',
  '/data-explorer': 'Schema map and starter queries for analyst self-service.',
  '/roadmap': 'This page. Trajectory plus status across all dashboards.',
  '/compare': 'Brand-vs-brand side-by-side across 8 panels.',
  '/anomalies': 'Watch every time-series metric for unusual deltas. Alert via ntfy when something breaks trend.',
  '/leak-radar': 'Fused pre-launch leak signals: trademark plus prelaunch-radar plus sitemap inserts in one view.',
};

// QUEUED_ITEMS -----------------------------------------------------------
// Future work that has no nav presence yet. Add freely. Items with an href
// imply partial work has shipped (e.g. an artifact written but the page is
// still being assembled).
// ------------------------------------------------------------------------

export const QUEUED_ITEMS: RoadmapItem[] = [
  // Marketing-lane queued
  { title: 'Earnings call intel',                       status: 'queued', lane: 'marketing',     description: 'Pull and summarize public-brand earnings transcripts for apparel signals.' },
  { title: 'Trade show / meet sponsorship rosters',     status: 'queued', lane: 'marketing',     description: 'Who is sponsoring which strength plus apparel meets, with cadence plus spend tier.' },
  { title: 'International expansion detection',         status: 'queued', lane: 'marketing',     description: 'Country-store launches, geo-targeted ad regions, hreflang shifts.' },
  { title: 'Wikipedia plus press release momentum',     status: 'queued', lane: 'marketing',     description: 'Wikipedia edit cadence and PR wire density as a momentum signal.' },

  // Product-lane queued
  { title: 'Promo cannibalization historical',          status: 'queued', lane: 'product',       description: 'Backfill historical promo windows to quantify category cannibalization.' },
  { title: 'PDP carousel via Playwright',               status: 'queued', lane: 'product',       description: 'Headless capture of "Customers also bought" carousels to surface adjacent-category whitespace.' },
  { title: 'Pre-launch leak radar v2 (fused)',          status: 'queued', lane: 'product',       description: 'Fuse TM monitor plus prelaunch-radar plus sitemap inserts into one "what is about to ship" page.' },

  // Cross-cutting queued
  { title: 'Anomaly detection layer',                   status: 'queued', lane: 'cross_cutting', description: 'Watch every time-series metric for unusual deltas. Alert via ntfy when something breaks trend.' },
  { title: 'Per-insight source attribution pill',       status: 'queued', lane: 'cross_cutting', description: 'Tiny source pill next to every KPI showing exact feed table plus classifier plus last-refresh.' },
  { title: 'Weekly digest apparel-thesis section',      status: 'queued', lane: 'cross_cutting', description: 'Expand the weekly digest to include an apparel-thesis block alongside core sections.' },
  { title: 'Brand-watchlist alerts',                    status: 'queued', lane: 'cross_cutting', description: 'Per-brand alert routing via ntfy and email when signals cross thresholds.' },
  { title: 'Export-to-CSV on every page',               status: 'queued', lane: 'cross_cutting', description: 'Uniform CSV export affordance on every data table.' },
  { title: 'Cron / data freshness health page',         status: 'queued', lane: 'cross_cutting', description: 'Single page surfacing cron-healer status and per-source last-good timestamps.' },
  { title: 'Cost tracking page',                        status: 'queued', lane: 'cross_cutting', description: 'Roll up Claude API plus infra spend by agent and pipeline.' },
];

// BLOCKED_ITEMS ----------------------------------------------------------
// Initiatives parked on an external dependency or a pending decision.
// ------------------------------------------------------------------------

export const BLOCKED_ITEMS: RoadmapItem[] = [
  // Marketing-lane blocked
  { title: 'SMS marketing intel',                      status: 'blocked', lane: 'marketing',     description: 'Waiting on Twilio number from Chris before we can capture competitor SMS programs.' },
  { title: 'LinkedIn exec hire / layoff scraping',     status: 'blocked', lane: 'marketing',     description: 'TOS-grey. Needs a proxy budget decision before we touch it.' },

  // Product-lane blocked
  { title: 'Customer journey mapping (own data)',      status: 'blocked', lane: 'product',       description: 'Needs Shopify plus Klaviyo plus CDP integration. Deferred until trust is established.' },
  { title: 'SEO competitive landscape',                status: 'blocked', lane: 'product',       description: 'Needs DataForSEO or Ahrefs subscription decision before we light up keyword coverage.' },
  { title: 'Amazon reviews ingestion (GR ASINs)',      status: 'blocked', lane: 'product',       description: 'Scraper built and parked. Amazon rate-limits the Pi IP; would also unlock the full Reposition Radar SKU coverage. Needs Gymreapers Amazon SP-API credentials from the GR team (legit path), or a residential proxy service ($10-50/mo).' },
  { title: 'Reddit API (PRAW) switch + SKU matcher',   status: 'blocked', lane: 'product',       description: 'Reddit RSS pipeline fixed (OV-wildcard bug killed; word-boundary matching live). Switching to PRAW unlocks post bodies, higher post limits, and clean fingerprinting. Once 1 week of real GR posts accumulates, build SKU fuzzy-matcher to write cluster_product_affinity rows from Reddit. Needs REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET in env (5 min app registration at reddit.com/prefs/apps).' },

  // Cross-cutting blocked
  { title: 'Own-data integration (Shopify + Klaviyo + CDP)', status: 'blocked', lane: 'cross_cutting', description: 'Gymreapers internal data. Chris said "once we have built trust" so this stays parked.' },
];

// SHIPPED_PLATFORM_ITEMS -------------------------------------------------
// Live work that is not a standalone page but a platform-wide pattern
// (components, migrations, cron jobs). Surfaced on /roadmap so the team
// sees the spine, not just the page count.
// ------------------------------------------------------------------------

export const SHIPPED_PLATFORM_ITEMS: RoadmapItem[] = [
  { title: 'MetricDelta vs-LW pattern',            status: 'live', lane: 'cross_cutting', description: 'Reusable week-over-week delta component now wired across the dashboard.',                       updated: '2026-05-15' },
  { title: 'Daily Intel Digest',                   status: 'live', lane: 'cross_cutting', description: '5-story CEO-ready summary auto-generated by Claude. Cron 7am ET. Email plus ntfy.',                updated: '2026-05-16' },
  { title: 'Apparel thesis primary frame',         status: 'live', lane: 'cross_cutting', description: 'Apparel-tier peer defaults applied across gap analysis, journey, entry candidates.',                updated: '2026-05-16' },
  { title: 'Sitemap_products migration to Supabase', status: 'live', lane: 'cross_cutting', description: '34,978 product URLs across 12 brands migrated from JSON. Dual-write pattern.',                    updated: '2026-05-16' },
  { title: 'Auto-derive Roadmap from Navigation', status: 'live', lane: 'cross_cutting', description: 'This page now auto-syncs with Navigation.tsx. Queued plus blocked items live in roadmapManifest.ts.', updated: '2026-05-16' },
];

// Helper: convert nav status to roadmap status.
export function navStatusToRoadmapStatus(s: NavChildMirror['status']): RoadmapStatus {
  if (s === 'soon') return 'queued';
  // 'live', 'beta', and undefined (top-level sections) all map to 'live'
  return 'live';
}

// Helper: flatten NAV_SECTIONS_MIRROR into a list of {href, label, status,
// description} entries for every navigable destination (top-level sections
// AND their children). Dedupes by href - if a child appears under multiple
// sections (e.g. /competitive-response under both Marketing and Product),
// the first occurrence wins so LANE_MAP gets the final say.
export function flattenNav(): NavChildMirror[] {
  const seen = new Set<string>();
  const out: NavChildMirror[] = [];

  for (const section of NAV_SECTIONS_MIRROR) {
    if (!seen.has(section.href)) {
      seen.add(section.href);
      out.push({
        href: section.href,
        label: section.label,
        status: section.status,
        description: section.description,
      });
    }
    for (const child of section.children ?? []) {
      if (seen.has(child.href)) continue;
      seen.add(child.href);
      out.push(child);
    }
  }
  return out;
}

// Helper: build the full roadmap-item list. Pages that exist in the nav
// become live (or queued, if status === 'soon'). QUEUED_ITEMS, BLOCKED_ITEMS,
// and SHIPPED_PLATFORM_ITEMS are appended. Items with no LANE_MAP entry
// fall back to 'cross_cutting'.
export interface BuiltRoadmapItem extends RoadmapItem {
  source: 'nav' | 'manifest';
}

export function buildRoadmapItems(): BuiltRoadmapItem[] {
  const items: BuiltRoadmapItem[] = [];

  for (const nav of flattenNav()) {
    const lane: Lane = LANE_MAP[nav.href] ?? 'cross_cutting';
    const description =
      OVERRIDE_DESCRIPTIONS[nav.href] ??
      nav.description ??
      '(no description in nav)';
    items.push({
      title: nav.label,
      href: nav.href,
      status: navStatusToRoadmapStatus(nav.status),
      description,
      lane,
      source: 'nav',
    });
  }

  for (const it of [...SHIPPED_PLATFORM_ITEMS, ...QUEUED_ITEMS, ...BLOCKED_ITEMS]) {
    items.push({ ...it, source: 'manifest' });
  }

  return items;
}
