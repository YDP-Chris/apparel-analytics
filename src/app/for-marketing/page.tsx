import Link from 'next/link';
import { GlossaryTerm } from '@/components/GlossaryTerm';

const cards = [
  {
    href: '/for-marketing/trending',
    title: 'Trending Terms',
    status: 'BETA',
    statusCls: 'bg-gr-accent-soft text-gr-accent',
    blurb:
      'Rising searches by category from Google Trends + Amazon autocomplete. Fuel for content, SEO, and ad copy.',
    useFor: 'Picking which keywords to write the next blog/ad around. Spotting category lifts before competitors.',
  },
  {
    href: '/for-marketing/voice',
    title: 'Share of Voice',
    status: 'LIVE',
    statusCls: 'bg-gr-success/20 text-gr-success',
    blurb:
      'Gymreapers vs the competitive set across Reddit mentions, news coverage, and review volume.',
    useFor: 'Justifying budget shifts. Spotting which competitor is owning the conversation right now.',
  },
  {
    href: '/for-marketing/sentiment',
    title: 'Sentiment Pulse',
    status: 'BETA',
    statusCls: 'bg-gr-accent-soft text-gr-accent',
    blurb:
      'What people love and hate about each brand, mined from Reddit threads + reviews by Claude.',
    useFor: 'Positioning. Knowing what hooks land vs what backfires. Surfacing competitor weak spots.',
  },
  {
    href: '/for-marketing/beats',
    title: 'Competitor Beats',
    status: 'LIVE',
    statusCls: 'bg-gr-success/20 text-gr-success',
    blurb:
      'Launches and news framed as moves you may want to react to or counter.',
    useFor: 'Ride-along campaigns. Defensive replies. Knowing what your audience just saw from Lululemon yesterday.',
  },
];

export default function ForMarketingPage() {
  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          For Marketing
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Build the narrative.
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          What your audience is searching for, what they&apos;re saying, and what your competitors
          are doing. Live data, refreshed daily.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-5">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group bg-gr-surface rounded-md border border-gr-border p-7 hover:border-gr-accent/60 hover:bg-gr-raised/50 transition flex flex-col"
          >
            <div className="flex items-baseline justify-between gap-3 mb-4">
              <h2 className="text-2xl font-bold text-gr-text group-hover:text-gr-accent transition tracking-tight">
                {c.title}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-[0.1em] ${c.statusCls}`}>
                {c.status}
              </span>
            </div>
            <p className="text-sm text-gr-muted leading-relaxed mb-5 flex-1">{c.blurb}</p>
            <div className="text-xs text-gr-subtle leading-relaxed pt-4 border-t border-gr-border/60">
              <span className="uppercase tracking-[0.15em] font-bold text-gr-muted">Use for </span>
              <span className="text-gr-muted">{c.useFor}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-gr-surface rounded-md border border-gr-border p-6">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">New here?</p>
        <p className="text-sm text-gr-muted leading-relaxed max-w-3xl">
          Every page anchors on a{' '}
          <GlossaryTerm id="snapshot-date">snapshot date</GlossaryTerm> at the top — that&apos;s the
          day the data was captured. Most pages refresh daily around 5 AM ET. To query the raw
          tables yourself, head to{' '}
          <Link href="/data-explorer" className="text-gr-accent hover:text-gr-accent-hover font-semibold">Data Explorer</Link>.
        </p>
      </div>
    </div>
  );
}
