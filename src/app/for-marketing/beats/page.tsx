'use client';

import { useGymreapersData } from '../../gymreapers/_lib/GymreapersProvider';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export default function CompetitorBeatsPage() {
  const { data } = useGymreapersData();
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  const launches = (data.launchesSection?.recentDrops || []).filter((d) => d.brand !== 'gymreapers');
  const news = (data.news || []).filter((n) => n.company_id !== 'gymreapers');

  return (
    <div className="space-y-8">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Marketing · Competitor Beats
        </p>
        <h1 className="text-3xl font-bold tracking-tight">What competitors just did — and how to respond</h1>
        <p className="text-gr-muted mt-2 max-w-3xl">
          Recent launches and news from the competitive set, organized so you can spot the move
          worth countering. Click through to the product page or article.
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xl font-bold text-gr-text">Recent launches</h2>
            <Link href="/gymreapers/launches" className="text-xs text-gr-accent hover:underline">All →</Link>
          </div>
          <div className="mb-3"><ConfidenceBadge source="launches" /></div>
          {launches.length === 0 ? (
            <p className="text-sm text-gr-muted">No new launches detected today.</p>
          ) : (
            <ul className="space-y-3">
              {launches.slice(0, 12).map((l, i) => (
                <li key={i}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-gr-bg rounded p-2 -m-2">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-gr-accent text-xs font-bold uppercase tracking-wider">{l.brandName}</span>
                      <span className="text-xs text-gr-subtle">{l.date}</span>
                      {l.category && <span className="text-xs text-gr-subtle">· {l.category}</span>}
                    </div>
                    <div className="text-sm text-gr-text">{l.product_name || l.url.slice(0, 80)}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-gr-surface rounded-md border border-gr-border p-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xl font-bold text-gr-text">Recent news</h2>
            <ConfidenceBadge source="news" />
          </div>
          {news.length === 0 ? (
            <p className="text-sm text-gr-muted">No competitor news captured recently.</p>
          ) : (
            <ul className="space-y-3">
              {news.slice(0, 12).map((n, i) => (
                <li key={i}>
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-gr-bg rounded p-2 -m-2">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-gr-accent text-xs font-bold uppercase tracking-wider">
                        {data.brand_names[n.company_id || ''] || n.company || n.company_id}
                      </span>
                      {n.date && <span className="text-xs text-gr-subtle">{n.date.slice(0, 10)}</span>}
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
