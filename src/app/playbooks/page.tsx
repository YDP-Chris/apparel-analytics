'use client';

import Link from 'next/link';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { trackEvent } from '@/lib/usage';

/**
 * Playbooks — the educational layer that bridges DATA → DECISION.
 *
 * Each playbook follows the same shape: SIGNAL (what to look for on the
 * dashboard) → WHAT IT MEANS (interpretation) → WHAT TO DO (concrete
 * actions to consider) → WHERE TO CHECK (links into the dashboard).
 *
 * Marketing / product can read top-to-bottom for onboarding, or jump
 * straight to a scenario when something fires.
 */

interface Playbook {
  id: string;
  audience: 'Marketing' | 'Product' | 'Both';
  title: string;
  signal: string;
  meaning: React.ReactNode;
  actions: string[];
  wherePages: { href: string; label: string }[];
}

const PLAYBOOKS: Playbook[] = [
  {
    id: 'whitespace-opportunity',
    audience: 'Both',
    title: 'A whitespace opportunity surfaces',
    signal: 'A sub-query on /gymreapers/amazon shows ≥10,000 total reviews in the top 20, HHI < 0.25, and we have zero products in the results.',
    meaning: (
      <>
        There&apos;s real demand (review count is a sales proxy), the market is fragmented
        (no entrenched leader = low <GlossaryTerm id="hhi">HHI</GlossaryTerm>), and we&apos;re
        invisible. This is the highest-confidence kind of <GlossaryTerm id="whitespace">whitespace</GlossaryTerm>:
        we&apos;re missing a category we could realistically own.
      </>
    ),
    actions: [
      'Marketing: pull the top 3 leaders\' product titles + reviews to understand customer language. Use it for ad copy and landing-page positioning.',
      'Product: if Gymreapers already has SKUs adjacent to this query, push the existing inventory into Amazon ads against it (cheaper than building new).',
      'Product: if no adjacent inventory, scope a new SKU and benchmark against the leaders\' price tier.',
      'Both: revisit weekly — the opportunity score should hold or grow. If it shrinks, the gap is closing.',
    ],
    wherePages: [
      { href: '/gymreapers/amazon', label: 'Whitespace' },
      { href: '/today', label: 'Today\'s brief' },
    ],
  },
  {
    id: 'category-trending-up',
    audience: 'Marketing',
    title: 'A category keyword is trending up fast',
    signal: 'On /for-marketing/trending, a Google Trends category keyword shows WoW +20% or more for two weeks running, AND Amazon autocomplete suggestions for the seed are growing.',
    meaning: (
      <>
        Search demand is accelerating. The Google + Amazon <GlossaryTerm id="triangulation">triangulation</GlossaryTerm>{' '}
        makes this a high-confidence signal, not noise. Either a cultural moment is happening
        (TikTok trend, fitness influencer push) or the category is seasonally peaking.
      </>
    ),
    actions: [
      'Write content (blog, email, social) using exact terms from the autocomplete suggestions — those are the queries people are typing right now.',
      'Bid up the keyword in paid search before the cost-per-click adjusts to the new volume.',
      'Cross-check the trend against actual sales velocity on /for-product/demand — if BSR-ranked products in the category are also seeing rising bought-past-month bands, it\'s real.',
    ],
    wherePages: [
      { href: '/for-marketing/trending', label: 'Trending Terms' },
      { href: '/for-product/demand', label: 'Demand Signals' },
    ],
  },
  {
    id: 'competitor-rank-mover',
    audience: 'Both',
    title: 'A competitor just gained 10+ spots in our category',
    signal: 'On /gymreapers/amazon, the "Biggest mover today" line for a category shows a competitor jumping 10+ rank positions overnight.',
    meaning: (
      <>
        Something caused a real demand shift. Common causes: an influencer review just dropped, a
        price test took, a viral TikTok, a paid push launched. The first two days are usually
        signal; if it sustains 5+ days, it&apos;s a structural shift.
      </>
    ),
    actions: [
      'Marketing: search the product on TikTok / YouTube creator monitoring to identify the trigger. If it\'s an influencer post, the same creator might be open to us.',
      'Product: check the product\'s price + bought-past-month band on /for-product/demand. If volume is rising AND we have a comparable SKU, defend the search slot with Amazon ads on related keywords.',
      'Watch for 3-5 day persistence before responding — short bumps reverse on their own.',
    ],
    wherePages: [
      { href: '/gymreapers/amazon', label: 'Whitespace' },
      { href: '/for-product/demand', label: 'Demand Signals' },
    ],
  },
  {
    id: 'competitor-launch-velocity',
    audience: 'Product',
    title: 'A competitor\'s launch velocity spikes',
    signal: 'On /gymreapers/launches, a peer\'s 7-day sparkline shows 5+ new products in 1-2 days when their baseline is usually 0-2.',
    meaning: (
      <>
        A planned drop is happening. Could be a seasonal collection, a category expansion, or a
        flash sale prep. The category mix of the new products tells you which.
      </>
    ),
    actions: [
      'Click into the recent drops feed — note the categories. A burst in a category we play in is a competitive threat; a burst in an adjacent category is a market-direction signal.',
      'Marketing: if the launches lean into a category we\'re strong in, prep counter-positioning ads timed to their launch announcement.',
      'Product: if a peer is launching in a category we don\'t carry, the question is "do they know something we don\'t?" — check Google Trends + Amazon BSR for that category.',
    ],
    wherePages: [
      { href: '/gymreapers/launches', label: 'Launch Velocity' },
      { href: '/for-marketing/beats', label: 'Competitor Beats' },
    ],
  },
  {
    id: 'sentiment-negative-cluster',
    audience: 'Both',
    title: 'A competitor has a cluster of negative themes',
    signal: 'On /for-marketing/sentiment, a brand\'s themes show 2+ negative-sentiment items with high post counts ("fit issues", "shipping delays", etc.).',
    meaning: (
      <>
        Customers are unhappy in a specific way and saying so publicly. Negative cluster + high
        post count = a positioning opening. The longer the pattern persists, the higher the trust
        the competitor is bleeding.
      </>
    ),
    actions: [
      'Marketing: build campaign messaging that explicitly counter-positions on the pain point ("Gymreapers ships in 48h" if a competitor\'s theme is "shipping delays").',
      'Product: validate the same complaint isn\'t about our products too — check our own reviews on Amazon and D2C. If we\'re also weak there, fix before attacking.',
      'Don\'t lead with negativity — frame as "we built ours specifically for X" rather than "they\'re bad at X."',
    ],
    wherePages: [
      { href: '/for-marketing/sentiment', label: 'Sentiment Pulse' },
      { href: '/for-marketing/voice', label: 'Share of Voice' },
    ],
  },
  {
    id: 'we-are-absent-high-demand',
    audience: 'Product',
    title: 'We\'re absent from a category that has real demand',
    signal: 'On /gymreapers/amazon, a category shows 30+ organic results and Gymreapers is "not in top 100".',
    meaning: (
      <>
        It&apos;s not just whitespace — there\'s a fully-loaded category we don&apos;t play in at
        all. Either deliberate (we\'ve chosen not to) or a gap to address.
      </>
    ),
    actions: [
      'Check who is in the top 10 — if all unfamiliar names, the entry bar is low. If incumbents are Inzer / SBD / brands we know, it\'s competitive.',
      'Cross-reference with /for-product/pricing — is the avg price in our tier or premium? Decides whether we enter with a current SKU or build new.',
      'If we\'ve deliberately skipped this category, document it as a "won\'t play here" — clears the signal so the dashboard stops nagging.',
    ],
    wherePages: [
      { href: '/gymreapers/amazon', label: 'Whitespace' },
      { href: '/for-product/pricing', label: 'Pricing Map' },
    ],
  },
  {
    id: 'price-gap-vs-leader',
    audience: 'Product',
    title: 'Our price is significantly off the leader\'s in a category we play in',
    signal: 'On /for-product/pricing, our avg price for a category is 30%+ above or below the leader\'s.',
    meaning: (
      <>
        Premium pricing vs the category leader needs a brand-story justification customers will buy
        (durability, certification, performance). Bargain pricing leaves margin on the table if
        we&apos;re not the volume leader.
      </>
    ),
    actions: [
      'Premium-side: if we don\'t have a clear premium story, run a price test down 10-15% on a representative SKU and watch Amazon BSR over 14 days.',
      'Bargain-side: if our BSR is strong in the category, test a price increase — incremental margin per unit at the same volume.',
      'Either way, only test on Amazon (low switching cost, fast feedback). Hold D2C pricing stable while testing.',
    ],
    wherePages: [
      { href: '/for-product/pricing', label: 'Pricing Map' },
      { href: '/for-product/demand', label: 'Demand Signals' },
    ],
  },
  {
    id: 'cron-failure-cluster',
    audience: 'Both',
    title: 'The dashboard shows a data warning',
    signal: 'The bold yellow/red banner at the top of /today shows a data integrity issue.',
    meaning: (
      <>
        A scraper failed or a table is stale. The dashboard is still showing the most recent data
        we had, but the numbers may be 24+ hours old. Anything you act on right now should be
        verified against another source.
      </>
    ),
    actions: [
      'Click into /data-quality to see exactly which table is affected and what its sample size + last update were.',
      'For decisions that are tactical (next blog post, next ad headline) — proceed cautiously, accept the staleness.',
      'For decisions that are strategic ($50k+ commitment) — wait for green status or triangulate the same signal from a different source.',
    ],
    wherePages: [
      { href: '/data-quality', label: 'Data Quality' },
      { href: '/methodology', label: 'Methodology' },
    ],
  },
];

const AUDIENCE_COLORS = {
  Marketing: 'bg-gr-accent-soft text-gr-accent',
  Product:   'bg-gr-success/20 text-gr-success',
  Both:      'bg-gr-raised text-gr-text',
};

export default function PlaybooksPage() {
  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Playbooks
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          From data to action.
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Scenarios you&apos;ll see on this dashboard and what to do when each one fires. Read
          top-to-bottom to onboard, or jump straight to a scenario when something hits.
        </p>
      </header>

      <nav className="bg-gr-surface border border-gr-border rounded-md p-5 flex flex-wrap gap-2 text-xs">
        <span className="text-gr-subtle font-bold uppercase tracking-wider mr-2">Jump to:</span>
        {PLAYBOOKS.map((p) => (
          <Link
            key={p.id}
            href={`#${p.id}`}
            onClick={() => trackEvent('click', { label: 'playbook_jump', metadata: { name: p.id } })}
            className="px-2 py-0.5 rounded bg-gr-bg text-gr-muted hover:text-gr-accent hover:bg-gr-raised transition font-semibold"
          >
            {p.title}
          </Link>
        ))}
      </nav>

      <div className="space-y-5">
        {PLAYBOOKS.map((p) => (
          <article
            key={p.id}
            id={p.id}
            className="bg-gr-surface rounded-md border border-gr-border p-7 space-y-5 scroll-mt-24"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-bold text-gr-text tracking-tight">{p.title}</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${AUDIENCE_COLORS[p.audience]}`}>
                {p.audience}
              </span>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-1.5">Signal</p>
              <p className="text-sm text-gr-text leading-relaxed">{p.signal}</p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-1.5">What it means</p>
              <p className="text-sm text-gr-muted leading-relaxed">{p.meaning}</p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-1.5">What to do</p>
              <ul className="text-sm text-gr-muted leading-relaxed space-y-1.5">
                {p.actions.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-gr-accent flex-shrink-0">·</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-gr-border/60 flex flex-wrap gap-2 text-xs">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Pages</span>
              {p.wherePages.map((w) => (
                <Link
                  key={w.href}
                  href={w.href}
                  className="px-2 py-0.5 rounded bg-gr-bg text-gr-accent hover:bg-gr-raised hover:text-gr-accent-hover transition font-semibold"
                >
                  → {w.label}
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-xl font-bold text-gr-text mb-3">Missing a playbook?</h2>
        <p className="text-sm text-gr-muted leading-relaxed">
          When you spot a signal that fires but isn&apos;t covered here, ping Chris with the scenario.
          The goal is that every pattern you see on the dashboard maps to a known action — no one
          should be stuck with &ldquo;I see this number, now what?&rdquo;
        </p>
      </section>
    </div>
  );
}
