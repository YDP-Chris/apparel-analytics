'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Audience-grouped IA (rebuilt 2026-05-15). Top nav has four sections — one
// daily landing, two audiences (Marketing + Product), and an analyst escape
// hatch. Each section's sub-pages live in a dropdown.
type NavChild = {
  href: string;
  label: string;
  status?: 'live' | 'beta' | 'soon';
  description?: string;
};

type NavSection = {
  href: string;     // landing page for the section
  label: string;
  children?: NavChild[];
};

// Rebuilt 2026-08-03 for team rollout (page audit). Tight spine + two role hubs +
// Lab (betas/one-offs, preserved out of the way) + Settings. Merge-clusters show a
// single hub entry pointing to the lead page; sibling views live in Lab until they
// are tab-merged into the hub. Exec Brief folded into Field Report.
const NAV_SECTIONS: NavSection[] = [
  { href: '/today', label: 'Today' },       // morning read — AI narrative digest
  { href: '/stories', label: 'Signals' },   // ranked, confidence-gated story engine
  { href: '/paper', label: 'Field Report' },
  {
    href: '/for-product',
    label: 'Product',
    children: [
      { href: '/gymreapers/amazon', label: 'Whitespace', status: 'live', description: 'Sub-segments where Gymreapers is absent + has demand' },
      { href: '/gymreapers/launches', label: 'Launch Velocity', status: 'live', description: 'What competitors are dropping' },
      { href: '/gymreapers/mix', label: 'Mix Gaps', status: 'live', description: 'Color, size, and price tier deltas' },
      { href: '/for-product/pricing', label: 'Pricing Map', status: 'live', description: 'Competitor pricing by category and tier' },
      { href: '/next-skus', label: 'Next 5 SKUs', status: 'live', description: 'The next SKUs to build, with rationale and benchmarks' },
      { href: '/for-product/demand', label: 'Demand Signals', status: 'live', description: 'Amazon bought-past-month winners + risers' },
      { href: '/competitor-weakness', label: 'Competitor Weakness', status: 'live', description: 'Attackable peer SKUs with concentrated complaints (incl. Gymshark)' },
      { href: '/apparel-entry-candidates', label: 'Where to Play', status: 'live', description: 'Entry candidates, opportunities, and three-horizons — where the apparel leg goes next' },
    ],
  },
  {
    href: '/for-marketing',
    label: 'Marketing',
    children: [
      { href: '/for-marketing/trending', label: 'Trending Terms', status: 'live', description: 'Rising searches by category (Google + Amazon)' },
      { href: '/for-marketing/sentiment', label: 'Sentiment Pulse', status: 'live', description: 'What people love and hate by brand' },
      { href: '/for-marketing/voice', label: 'Share of Voice', status: 'live', description: 'Mentions across news + Reddit + reviews' },
      { href: '/for-marketing/beats', label: 'Competitor Beats', status: 'live', description: 'Launches + news to react to' },
      { href: '/promo-calendar', label: 'Promo Calendar', status: 'live', description: 'When competitors discount, how deep, and what categories' },
      { href: '/voc-personas', label: 'Voice of Customer', status: 'beta', description: 'Personas, cluster overlap, brand switchers, and owned copy hooks from D2C reviews' },
      { href: '/prelaunch-radar', label: 'Pre-launch Radar', status: 'beta', description: 'What competitors are about to launch — trademarks, patents, leaks, and autocomplete signals' },
    ],
  },
  {
    href: '/gr-sku-tracker',
    label: 'Lab',
    children: [
      { href: '/international', label: 'International', status: 'beta', description: 'Country-level competitor presence' },
      { href: '/gr-sku-tracker', label: 'Apparel SKU Tracker', status: 'beta', description: 'GR apparel SKUs, peer-benchmarked' },
      { href: '/reposition-radar', label: 'Reposition Radar', status: 'beta', description: 'Per-SKU rename/re-merchandise recommendations' },
      { href: '/site-ux', label: 'Site UX', status: 'beta', description: 'PSI + structural signals per brand' },
      { href: '/paid-creators', label: 'Paid Creators', status: 'beta', description: 'Sponsored vs organic UGC velocity' },
      { href: '/earnings', label: 'Earnings Intel', status: 'beta', description: 'Quarterly transcript signals (LULU, GAP, NKE, UAA)' },
      { href: '/email-intel', label: 'Email Intel', status: 'soon', description: 'Competitor newsletter cadence — needs Gmail OAuth' },
      { href: '/competitive-response', label: 'Competitive Response', status: 'beta', description: 'Who reacts when Gymreapers moves' },
      { href: '/compare', label: 'Compare', status: 'live', description: 'Side-by-side brand/SKU comparison' },
      { href: '/anomalies', label: 'Anomalies', status: 'live', description: 'Outliers across price, mix, velocity, reviews' },
      { href: '/trends', label: 'Trends Explorer', status: 'live', description: 'Chart any metric, any brands, any window' },
      { href: '/bundles', label: 'Bundles', status: 'live', description: 'Multi-pack and bundle strategy' },
      { href: '/policies', label: 'Policies', status: 'live', description: 'Shipping, returns, subscriptions, made-in-USA' },
      // Hub siblings (Voice of Customer / Where to Play / Pre-launch Radar) removed
      // from Lab — now reachable via the in-hub tab bar (HubTabs) on their lead pages.
    ],
  },
  {
    href: '/config',
    label: 'Settings',
    children: [
      { href: '/config', label: 'Brand Config', status: 'live', description: 'Add/edit tracked competitors + weekly newspaper settings' },
      { href: '/inputs', label: 'Team Inputs', status: 'live', description: 'Approve, reject, audit team-submitted keywords + queries' },
      { href: '/usage', label: 'Usage', status: 'live', description: 'What the team actually uses' },
      { href: '/log', label: 'Decisions Log', status: 'live', description: 'Every intent the team has set + notes on findings' },
      { href: '/methodology', label: 'Methodology', status: 'live', description: 'How every source is captured, sampled, biased' },
      { href: '/glossary', label: 'Glossary', status: 'live', description: 'Every term defined' },
      { href: '/data-quality', label: 'Data Quality', status: 'live', description: 'Live data-qa run status' },
      { href: '/cron-health', label: 'Cron Health', status: 'live', description: 'Which agents ran, failed, or are stale' },
      { href: '/changelog', label: 'Changelog', status: 'live', description: 'Auto-derived release log' },
      { href: '/data-explorer', label: 'SQL Reference', status: 'live', description: 'Schema map + starter queries' },
      { href: '/roadmap', label: 'Roadmap', status: 'live', description: 'Planned pages and capabilities' },
      { href: '/playbooks', label: 'Playbooks', status: 'live', description: 'What to do when each signal fires' },
    ],
  },
];

// Legacy routes still accessible directly but no longer in the primary nav
// (Decisions, Gaps, Pricing, Whitespace, Landscape, Radar, Guideposts, Brands,
// Taxonomy, Scorecard, Social, Jobs). Linked from /data-explorer.

const STATUS_BADGES: Record<NonNullable<NavChild['status']>, { label: string; cls: string }> = {
  live: { label: 'LIVE', cls: 'bg-gr-success/20 text-gr-success' },
  beta: { label: 'BETA', cls: 'bg-gr-accent-soft text-gr-accent' },
  soon: { label: 'SOON', cls: 'bg-gr-raised text-gr-subtle' },
};

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);

  const isSectionActive = (s: NavSection) =>
    pathname === s.href ||
    pathname.startsWith(s.href + '/') ||
    (s.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + '/')) ?? false);

  return (
    <nav className="border-b border-gr-border bg-gr-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/today" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gr-accent-hover to-gr-accent flex items-center justify-center">
              <span className="text-gr-text font-bold text-sm tracking-wider">GR</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-gr-text uppercase tracking-wider">Gymreapers</span>
              <span className="block text-xs text-gr-subtle -mt-0.5 uppercase tracking-[0.2em]">Competitive Intel</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_SECTIONS.map((section) => {
              const active = isSectionActive(section);
              const isOpen = openSection === section.label;
              const hasChildren = !!section.children?.length;

              return (
                <div
                  key={section.href}
                  className="relative"
                  onMouseEnter={() => hasChildren && setOpenSection(section.label)}
                  onMouseLeave={() => setOpenSection(null)}
                >
                  <Link
                    href={section.href}
                    className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-1 ${
                      active
                        ? 'bg-gr-accent-soft text-gr-accent'
                        : 'text-gr-muted hover:text-gr-text hover:bg-gr-raised'
                    }`}
                  >
                    {section.label}
                    {hasChildren && (
                      <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </Link>

                  {hasChildren && isOpen && (
                    <div className="absolute left-0 top-full pt-1 min-w-[320px]">
                      <div
                        className="bg-gr-surface border border-gr-border rounded-md shadow-xl p-2 space-y-1 overflow-y-auto overscroll-contain"
                        style={{ maxHeight: 'calc(100vh - 5rem)' }}
                      >
                        {section.children!.map((c) => {
                          const cActive = pathname === c.href || pathname.startsWith(c.href + '/');
                          const badge = c.status ? STATUS_BADGES[c.status] : null;
                          return (
                            <Link
                              key={c.href}
                              href={c.href}
                              className={`block px-3 py-2 rounded transition-all ${
                                cActive ? 'bg-gr-accent-soft' : 'hover:bg-gr-raised'
                              }`}
                              onClick={() => setOpenSection(null)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-sm font-semibold ${cActive ? 'text-gr-accent' : 'text-gr-text'}`}>
                                  {c.label}
                                </span>
                                {badge && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                )}
                              </div>
                              {c.description && (
                                <p className="text-xs text-gr-muted mt-0.5">{c.description}</p>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded text-gr-muted hover:text-gr-text hover:bg-gr-raised"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden border-t border-gr-border bg-gr-surface/95 backdrop-blur-md overflow-y-auto overscroll-contain"
          style={{ maxHeight: 'calc(100vh - 4rem)' }}
        >
          <div className="px-4 py-3 space-y-2 pb-[env(safe-area-inset-bottom)]">
            {NAV_SECTIONS.map((section) => (
              <div key={section.href}>
                <Link
                  href={section.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded text-sm font-bold uppercase tracking-[0.15em] text-gr-text hover:bg-gr-raised"
                >
                  {section.label}
                </Link>
                {section.children?.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-6 py-1.5 rounded text-sm text-gr-muted hover:text-gr-text hover:bg-gr-raised"
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
