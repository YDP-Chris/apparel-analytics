import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

/**
 * /roadmap - internal-only roadmap for the Gymreapers analytics platform.
 *
 * Audience: Chris's marketing + product teams. Communicates trajectory:
 * what's shipped, what's in flight, what's queued, what's blocked.
 *
 * Data is hand-curated and static. Update this file when meaningful work
 * lands. The page is intentionally a single-file source of truth - no
 * Supabase, no API calls, no auto-derivation - so it doubles as a daily
 * frozen snapshot.
 */

type Status = 'live' | 'in_flight' | 'queued' | 'blocked';

interface Item {
  title: string;
  href?: string;              // present if shipped or partially shipped
  status: Status;
  description: string;
  updated?: string;           // ISO date string for shipped items
}

interface Lane {
  key: string;
  label: string;
  blurb: string;
  items: Item[];
}

const TODAY = '2026-05-16';

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  live:      { label: 'LIVE',      cls: 'bg-gr-success/20 text-gr-success ring-gr-success/40' },
  in_flight: { label: 'IN FLIGHT', cls: 'bg-gr-accent-soft text-gr-accent ring-gr-accent/40' },
  queued:    { label: 'QUEUED',    cls: 'bg-gr-raised text-gr-subtle ring-gr-border' },
  blocked:   { label: 'BLOCKED',   cls: 'bg-gr-danger/15 text-gr-danger ring-gr-danger/40' },
};

const STATUS_ORDER: Status[] = ['live', 'in_flight', 'queued', 'blocked'];

const LANES: Lane[] = [
  {
    key: 'marketing',
    label: 'Marketing',
    blurb: 'Pages built for the marketing team - share of voice, competitor beats, promo cadence, creator + IP signals.',
    items: [
      { title: 'Sentiment Pulse',        href: '/for-marketing/sentiment',  status: 'live', description: 'What people love and hate about each brand, distilled from reviews + Reddit.',                updated: '2026-05-15' },
      { title: 'Share of Voice',         href: '/for-marketing/voice',      status: 'live', description: 'Mentions across news, Reddit, and reviews by brand.',                                              updated: '2026-05-14' },
      { title: 'Trending Terms',         href: '/for-marketing/trending',   status: 'live', description: 'Rising searches by category from Google + Amazon autocomplete.',                                   updated: '2026-05-15' },
      { title: 'Competitor Beats',       href: '/for-marketing/beats',      status: 'live', description: 'Launches and news to react to, ranked by reach.',                                                   updated: '2026-05-15' },
      { title: 'Promo Calendar',         href: '/promo-calendar',           status: 'live', description: 'When competitors discount, how deep, and what categories.',                                         updated: '2026-05-15' },
      { title: 'Paid Creators',          href: '/paid-creators',            status: 'live', description: 'Sponsored vs organic UGC velocity per brand.',                                                       updated: '2026-05-15' },
      { title: 'Trademark Radar',        href: '/trademarks',               status: 'live', description: 'USPTO trademark filings as pre-launch leak signal.',                                                updated: '2026-05-14' },
      { title: 'Patent Radar',           href: '/patents',                  status: 'live', description: 'USPTO patents and applications for material + construction innovations.',                           updated: '2026-05-14' },
      { title: 'Pre-launch Radar',       href: '/prelaunch-radar',          status: 'live', description: 'Autocomplete + image CDN + sitemap inserts before products go live.',                              updated: '2026-05-15' },
      { title: 'Email Intel',            href: '/email-intel',              status: 'live', description: 'Captured competitor newsletters. Empty state until Gmail OAuth is wired.',                          updated: '2026-05-15' },
      { title: 'VoC Personas',           href: '/voc-personas',             status: 'live', description: 'Emergent customer voice clusters per brand from 1,785 D2C reviews. 38 clusters discovered.',          updated: '2026-05-16' },
      { title: 'Cluster Matrix',         href: '/cluster-matrix',           status: 'live', description: 'Cross-brand customer voice overlap heatmap. 116 cluster pairs scored.',                              updated: '2026-05-16' },
      { title: 'Customer Flow',          href: '/customer-flow',            status: 'live', description: 'Brand switchers in their own words. Lululemon to Alo/Gymshark migration confirmed.',                 updated: '2026-05-16' },
      { title: 'Copy Mine',              href: '/copy-mine',                status: 'live', description: 'Customer-voice marketing copy bank. 108 phrases mined; GR claim opportunities surfaced.',           updated: '2026-05-16' },
      { title: 'Competitive Response',   href: '/competitive-response',     status: 'live', description: 'Who reacts when Gymreapers moves. Sparse until 14d history accumulates.',                            updated: '2026-05-16' },

      { title: 'Athletes',                                                  status: 'queued',  description: 'Sponsored athlete roster comparison. Proposal written.' },
      { title: 'Earnings call intel',                                        status: 'queued',  description: 'Pull and summarize public-brand earnings transcripts for apparel signals.' },
      { title: 'Trade show / meet sponsorship rosters',                      status: 'queued',  description: 'Who is sponsoring which strength + apparel meets, with cadence + spend tier.' },
      { title: 'International expansion detection',                          status: 'queued',  description: 'Country-store launches, geo-targeted ad regions, hreflang shifts.' },
      { title: 'Wikipedia + press release momentum',                         status: 'queued',  description: 'Wikipedia edit cadence and PR wire density as a momentum signal.' },

      { title: 'SMS marketing intel',                                        status: 'blocked', description: 'Waiting on Twilio number from Chris before we can capture competitor SMS programs.' },
      { title: 'LinkedIn exec hire / layoff scraping',                       status: 'blocked', description: 'TOS-grey. Needs a proxy budget decision before we touch it.' },
    ],
  },
  {
    key: 'product',
    label: 'Product',
    blurb: 'Pages built for the product team - mix gaps, pricing, demand, whitespace, journey, complaints.',
    items: [
      { title: 'Customer Journey',       href: '/journey',                       status: 'live', description: 'Strength athlete journey map with apparel touchpoints.',                                  updated: '2026-05-15' },
      { title: 'Apparel Entry Candidates', href: '/apparel-entry-candidates',    status: 'live', description: 'Strength-athlete-filtered apparel categories to enter next.',                              updated: '2026-05-16' },
      { title: 'Coverage Gaps',          href: '/for-product/gaps',              status: 'live', description: 'Apparel-tier default. Where Gymreapers under- or over-indexes vs the field.',                updated: '2026-05-15' },
      { title: 'Pricing Map',            href: '/for-product/pricing',           status: 'live', description: 'Competitor pricing by category and tier.',                                                    updated: '2026-05-14' },
      { title: 'Demand Signals',         href: '/for-product/demand',            status: 'live', description: 'Amazon bought-past-month winners and risers.',                                                updated: '2026-05-15' },
      { title: 'Whitespace (Amazon)',    href: '/gymreapers/amazon',             status: 'live', description: 'Sub-segments where Gymreapers is absent and has demand.',                                    updated: '2026-05-15' },
      { title: 'Mix Gaps',               href: '/gymreapers/mix',                status: 'live', description: 'Color, size, and price tier deltas vs peer set.',                                              updated: '2026-05-15' },
      { title: 'Launch Velocity',        href: '/gymreapers/launches',           status: 'live', description: 'What competitors are dropping and how often.',                                                updated: '2026-05-15' },
      { title: 'Bundles',                href: '/bundles',                       status: 'live', description: 'Multi-pack and bundle strategy across brands.',                                               updated: '2026-05-14' },
      { title: 'Policies',               href: '/policies',                      status: 'live', description: 'Free shipping, returns, subscriptions, made-in-USA per brand.',                               updated: '2026-05-14' },
      { title: 'VoC Complaints',         href: '/voc-complaints',                status: 'live', description: '376 complaint rows across 11 kinds. Top universal pain: fit_issue (114 mentions).',           updated: '2026-05-16' },
      { title: 'Entry Opportunities',    href: '/entry-opportunities',           status: 'live', description: 'Synthesized product entry recs from cluster overlap + GR catalog gap. 18 ranked.',           updated: '2026-05-16' },
      { title: 'Competitor Weakness',    href: '/competitor-weakness',           status: 'live', description: '35 vulnerable peer SKUs ranked by complaint concentration. Gymshark = 60% of vulnerable.',   updated: '2026-05-16' },
      { title: 'Apparel SKU Tracker',    href: '/gr-sku-tracker',                status: 'live', description: 'Per-SKU instrumentation for the apparel push. 456 GR apparel SKUs, 100% peer-benchmarked.',  updated: '2026-05-16' },
      { title: 'Site UX',                href: '/site-ux',                       status: 'live', description: 'PageSpeed Insights + structural signals per brand. Weekly refresh.',                          updated: '2026-05-16' },
      { title: 'First 5 Apparel SKUs',   href: '/next-skus',                     status: 'in_flight', description: 'Synthesized product-strategy artifact. Synthesizes all VoC + entry + competitor work into 5 concrete launch recs.', updated: '2026-05-16' },

      { title: 'Promo cannibalization historical',                               status: 'queued',  description: 'Backfill historical promo windows to quantify category cannibalization.' },
      { title: 'PDP carousel via Playwright',                                    status: 'queued',  description: 'Headless capture of "Customers also bought" carousels to surface adjacent-category whitespace.' },
      { title: 'Gymshark vulnerability dossier',                                 status: 'queued',  description: 'Deep-dive into the 18 vulnerable Gymshark SKUs + complaint trajectories over time.' },
      { title: 'Pre-launch leak radar v2 (fused)',                               status: 'queued',  description: 'Fuse TM monitor + prelaunch-radar + sitemap inserts into one "what is about to ship" page.' },

      { title: 'Customer journey mapping (own data)',                            status: 'blocked', description: 'Needs Shopify + Klaviyo + CDP integration. Deferred until trust is established.' },
      { title: 'SEO competitive landscape',                                      status: 'blocked', description: 'Needs DataForSEO or Ahrefs subscription decision before we light up keyword coverage.' },
    ],
  },
  {
    key: 'cross_cutting',
    label: 'Cross-cutting',
    blurb: 'Platform-wide pages and patterns - the spine the marketing and product lanes plug into.',
    items: [
      { title: 'Today',                  href: '/today',          status: 'live', description: 'Daily landing brief with the single biggest opportunity at the top.',                                 updated: '2026-05-16' },
      { title: 'Exec Brief',             href: '/exec-brief',     status: 'live', description: 'Weekly exec-level summary for Chris and the CEO.',                                                    updated: '2026-05-15' },
      { title: 'Trends Explorer',        href: '/trends',         status: 'live', description: 'Chart any metric, any brands, any window.',                                                          updated: '2026-05-14' },
      { title: 'Usage Analytics',        href: '/usage',          status: 'live', description: 'What the team actually uses. Anonymous, aggregated.',                                                updated: '2026-05-14' },
      { title: 'Decisions Log',          href: '/log',            status: 'live', description: 'Every intent the team has set plus notes attached to findings.',                                     updated: '2026-05-15' },
      { title: 'Team Inputs',            href: '/inputs',         status: 'live', description: 'Approve, reject, and audit team-submitted keywords + queries + ideas.',                              updated: '2026-05-15' },
      { title: 'Methodology',            href: '/methodology',    status: 'live', description: 'How every source is captured, sampled, and biased. Confidence ratings.',                             updated: '2026-05-14' },
      { title: 'Glossary',               href: '/glossary',       status: 'live', description: 'Every term defined - HHI, BSR, bought-past-month, and the rest.',                                   updated: '2026-05-14' },
      { title: 'Playbooks',              href: '/playbooks',      status: 'live', description: 'What to do when each signal fires. Scenario-driven guide.',                                          updated: '2026-05-14' },
      { title: 'Data Quality',           href: '/data-quality',   status: 'live', description: 'Live data-qa run status. Freshness, volume, consistency.',                                           updated: '2026-05-15' },
      { title: 'Data Explorer',          href: '/data-explorer',  status: 'live', description: 'Schema map and starter queries for analyst self-service.',                                           updated: '2026-05-14' },
      { title: 'Policies',               href: '/policies',       status: 'live', description: 'Brand-policy reference table. Shared between Marketing and Product lanes.',                          updated: '2026-05-14' },
      { title: 'MetricDelta vs-LW pattern',                       status: 'live', description: 'Reusable week-over-week delta component now wired across the dashboard.',                          updated: '2026-05-15' },
      { title: 'Roadmap',                href: '/roadmap',         status: 'live', description: 'This page. Trajectory + status across all dashboards.',                                            updated: '2026-05-16' },
      { title: 'Compare',                href: '/compare',         status: 'live', description: 'Brand-vs-brand side-by-side across 8 panels.',                                                    updated: '2026-05-16' },
      { title: 'Daily Intel Digest',                                status: 'live', description: '5-story CEO-ready summary auto-generated by Claude. Cron 7am ET. Email + ntfy.',                  updated: '2026-05-16' },
      { title: 'Apparel thesis primary frame',                      status: 'live', description: 'Apparel-tier peer defaults applied across gap analysis, journey, entry candidates.',              updated: '2026-05-16' },
      { title: 'Sitemap_products migration to Supabase',            status: 'live', description: '34,978 product URLs across 12 brands migrated from JSON. Dual-write pattern.',                    updated: '2026-05-16' },

      { title: 'Auto-derive Roadmap from Navigation + tasks',       status: 'queued',  description: 'Stop hand-curating Roadmap. Read LIVE/BETA/SOON from Navigation, pending/in_flight from task tracker.' },
      { title: 'Anomaly detection layer',                           status: 'queued',  description: 'Watch every time-series metric for unusual deltas. Alert via ntfy when something breaks trend.' },
      { title: 'Per-insight source attribution pill',               status: 'queued',  description: 'Tiny source pill next to every KPI showing exact feed table + classifier + last-refresh.' },
      { title: 'Weekly digest - apparel-thesis section',            status: 'queued',  description: 'Expand the weekly digest to include an apparel-thesis block alongside core sections.' },
      { title: 'Brand-watchlist alerts',                            status: 'queued',  description: 'Per-brand alert routing via ntfy and email when signals cross thresholds.' },
      { title: 'Export-to-CSV on every page',                       status: 'queued',  description: 'Uniform CSV export affordance on every data table.' },
      { title: 'Cron / data freshness health page',                 status: 'queued',  description: 'Single page surfacing cron-healer status and per-source last-good timestamps.' },
      { title: 'Cost tracking page',                                status: 'queued',  description: 'Roll up Claude API + infra spend by agent and pipeline.' },

      { title: 'Own-data integration (Shopify + Klaviyo + CDP)',    status: 'blocked', description: 'Gymreapers internal data. Chris said "once we have built trust" - so this stays parked.' },
    ],
  },
];

function StatusPill({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ring-1 ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function ItemRow({ item }: { item: Item }) {
  const titleEl = item.href ? (
    <Link
      href={item.href}
      className="text-sm font-semibold text-gr-text hover:text-gr-accent transition"
    >
      {item.title}
    </Link>
  ) : (
    <span className="text-sm font-semibold text-gr-text">{item.title}</span>
  );

  return (
    <div className="border-l-2 border-gr-border/60 pl-3 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{titleEl}</div>
        <StatusPill status={item.status} />
      </div>
      <p className="text-xs text-gr-muted mt-1 leading-relaxed">{item.description}</p>
      {item.updated && (
        <p className="text-[10px] uppercase tracking-wider text-gr-subtle mt-1.5">
          Updated {item.updated}
        </p>
      )}
    </div>
  );
}

function LaneColumn({ lane }: { lane: Lane }) {
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: lane.items.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="bg-gr-surface border border-gr-border rounded-md p-6 space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-gr-subtle font-bold mb-1">
          Lane
        </div>
        <h2 className="text-2xl font-bold text-gr-text tracking-tight">{lane.label}</h2>
        <p className="text-sm text-gr-muted mt-2 leading-relaxed">{lane.blurb}</p>
      </div>

      {grouped.map(({ status, items }) => (
        <section key={status} className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusPill status={status} />
            <span className="text-[11px] uppercase tracking-wider text-gr-subtle font-bold">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="space-y-2">
            {items.map((item) => (
              <ItemRow key={item.title} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Mini-stats numbers - actuals as of 2026-05-16. Update when meaningful work lands.
const SHIPPED_STATS = [
  { label: 'Pages shipped',       value: '25' },
  { label: 'Agents wired',        value: '6'  },
  { label: 'Schema migrations',   value: '7'  },
  { label: 'Days of history',     value: '2'  },
];

export default function RoadmapPage() {
  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.25em] text-gr-accent font-bold">
            Internal &middot; Data &amp; Analytics Roadmap
          </div>
          <h1 className="text-4xl font-bold text-gr-text tracking-tight mt-2">
            What&apos;s shipped, what&apos;s coming, what&apos;s blocked
          </h1>
          <p className="text-base text-gr-muted mt-3 leading-relaxed">
            Trajectory of the Gymreapers analytics platform. Living document - update
            when meaningful work lands. Frozen daily snapshot of where we are.
          </p>
          <p className="text-xs text-gr-subtle uppercase tracking-wider mt-3">
            Last refreshed {TODAY}
          </p>
        </div>
        <div className="flex-shrink-0">
          <ConfidenceBadge source="composite" size="md" />
        </div>
      </header>

      {/* APPAREL THESIS CALLOUT */}
      <section className="bg-gr-surface border border-gr-accent/40 border-l-2 border-l-gr-accent rounded-md p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-gr-accent font-bold">
          Strategic Frame
        </div>
        <h2 className="text-xl font-bold text-gr-text tracking-tight mt-2">
          Apparel thesis is the primary lens
        </h2>
        <p className="text-sm text-gr-muted mt-3 leading-relaxed max-w-4xl">
          Gymreapers is steering into apparel beyond accessories core. Pages flagged
          with the apparel direction surface entry candidates filtered for the
          strength-athlete customer story - training, between-sets, recovery, identity,
          meet day. Off-thesis categories (yoga-pure, high-fashion drops, tennis
          dresses) are deprioritized even when peers are deep in them.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link
            href="/journey"
            className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent-soft text-gr-accent hover:bg-gr-accent hover:text-gr-text transition"
          >
            View Journey
          </Link>
          <Link
            href="/apparel-entry-candidates"
            className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent-soft text-gr-accent hover:bg-gr-accent hover:text-gr-text transition"
          >
            View Entry Candidates
          </Link>
        </div>
      </section>

      {/* LEGEND */}
      <section className="bg-gr-bg/60 border border-gr-border/60 rounded-md p-4">
        <div className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-3">
          Status Legend
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gr-muted">
          <div className="flex items-center gap-2">
            <StatusPill status="live" />
            <span>in production, team can use</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="in_flight" />
            <span>actively being built</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="queued" />
            <span>in backlog, no blockers</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="blocked" />
            <span>waiting on decision or external dependency</span>
          </div>
        </div>
      </section>

      {/* THREE LANES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {LANES.map((lane) => (
          <LaneColumn key={lane.key} lane={lane} />
        ))}
      </section>

      {/* WHAT WE BUILT TODAY */}
      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-gr-subtle font-bold">
          Recent Velocity
        </div>
        <h2 className="text-2xl font-bold text-gr-text tracking-tight mt-2">
          What we built today
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-5">
          {SHIPPED_STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-gr-text">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gr-muted mt-5 leading-relaxed max-w-3xl">
          vs-LW deltas will light up across the dashboard over the next 5 days as
          snapshots accumulate. Until then, week-over-week numbers will show as
          dashes rather than zeros.
        </p>
      </section>

      {/* BOTTOM STRIP */}
      <section className="bg-gr-bg/60 border border-gr-border/60 rounded-md p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gr-text">
            Got an idea for the roadmap?
          </div>
          <p className="text-xs text-gr-muted mt-1">
            Submit it on the Team Inputs page. Chris reviews submissions weekly.
          </p>
        </div>
        <Link
          href="/inputs"
          className="inline-flex items-center px-4 py-2 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent text-gr-text hover:bg-gr-accent-hover transition"
        >
          Submit a roadmap suggestion
        </Link>
      </section>

      {/* SOURCE ATTRIBUTION */}
      <footer className="text-xs text-gr-subtle leading-relaxed border-t border-gr-border/60 pt-4">
        Roadmap is manually curated. Last update: {TODAY}. Backed by 100+ tracked
        tasks in the system. See{' '}
        <Link href="/log" className="text-gr-accent hover:text-gr-accent-hover">/log</Link>{' '}
        for decisions made and rationale.
      </footer>
    </div>
  );
}
