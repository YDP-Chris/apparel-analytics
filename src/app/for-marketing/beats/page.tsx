'use client';

import { useGymreapersData } from '../../gymreapers/_lib/GymreapersProvider';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { trackEvent } from '@/lib/usage';

export default function CompetitorBeatsPage() {
  const { data } = useGymreapersData();
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  const launches = (data.launchesSection?.recentDrops || []).filter((d) => d.brand !== 'gymreapers');
  const news = (data.news || []).filter((n) => n.company_id !== 'gymreapers');

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          For Marketing · Competitor Beats
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What competitors just did
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Recent launches and news from the competitive set, organized so you can spot the move
          worth countering. Click through to the product page or article. Launches come from daily
          sitemap diffs; news from RSS + Google News with{' '}
          <GlossaryTerm id="triangulation">triangulation</GlossaryTerm> where possible.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-gr-surface rounded-md border border-gr-border p-7">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle">
              Recent launches
            </p>
            <ConfidenceBadge source="launches" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h2 className="text-2xl font-bold text-gr-text tracking-tight">Drops to react to</h2>
            <Link href="/gymreapers/launches" className="text-[11px] text-gr-accent hover:text-gr-accent-hover font-semibold uppercase tracking-wider">All →</Link>
          </div>
          <div className="mb-4">
            <SectionExplainer
              collapsed
              what="New products each competitor brand has added to their site, detected by diffing their sitemap day-over-day."
              howToRead="Brand · date · product. Click a row to see the PDP. We catch the URL the moment it lands; press coverage usually trails by 1-3 days."
              whatToDo="Pick the one or two drops worth a counter-campaign, a ride-along post, or an internal heads-up to the merchandising team."
            />
          </div>
          {launches.length === 0 ? (
            <p className="text-sm text-gr-muted">No new launches detected today.</p>
          ) : (
            <ul className="space-y-1 -mx-2">
              {launches.slice(0, 12).map((l, i) => (
                <li key={i}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: (l.url || '').slice(0, 200) } })}
                    className="block hover:bg-gr-bg rounded px-2 py-2"
                  >
                    <div className="flex items-baseline gap-2 mb-0.5 text-[11px]">
                      <span className="text-gr-accent font-bold uppercase tracking-wider">{l.brandName}</span>
                      <span className="text-gr-subtle">{l.date}</span>
                      {l.category && <span className="text-gr-subtle">· {l.category}</span>}
                    </div>
                    <div className="text-sm text-gr-text leading-snug">{l.product_name || l.url.slice(0, 80)}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-gr-surface rounded-md border border-gr-border p-7">
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle">
              Recent news
            </p>
            <ConfidenceBadge source="news" />
          </div>
          <div className="flex items-baseline justify-between gap-3 mb-5">
            <h2 className="text-2xl font-bold text-gr-text tracking-tight">Headlines in the set</h2>
          </div>
          <div className="mb-4">
            <SectionExplainer
              collapsed
              what="Recent press and trade-media coverage of any brand in the competitive set, from RSS feeds and Google News."
              howToRead="Brand · date · headline. Trade press skews toward larger brands with PR budgets — strength peers may show up rarely."
              whatToDo="If a peer just got a big PR placement, they'll see a search-interest bump for 1-2 weeks. Decide whether to outbid on their brand terms or stay quiet."
            />
          </div>
          {news.length === 0 ? (
            <p className="text-sm text-gr-muted">No competitor news captured recently.</p>
          ) : (
            <ul className="space-y-1 -mx-2">
              {news.slice(0, 12).map((n, i) => (
                <li key={i}>
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('outbound', { label: 'review_link', metadata: { href: (n.url || '').slice(0, 200) } })}
                    className="block hover:bg-gr-bg rounded px-2 py-2"
                  >
                    <div className="flex items-baseline gap-2 mb-0.5 text-[11px]">
                      <span className="text-gr-accent font-bold uppercase tracking-wider">
                        {data.brand_names[n.company_id || ''] || n.company || n.company_id}
                      </span>
                      {n.date && <span className="text-gr-subtle">{n.date.slice(0, 10)}</span>}
                    </div>
                    <div className="text-sm text-gr-text leading-snug">{n.title}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
