import Link from 'next/link';

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
    <div className="space-y-8">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Marketing
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Build the narrative.</h1>
        <p className="text-gr-muted mt-3 max-w-3xl text-lg">
          Pages that surface what your audience is searching for, what they&apos;re saying, and what
          your competitors are doing — all sourced from live data, refreshed daily.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group bg-gr-surface rounded-md border border-gr-border p-6 hover:border-gr-accent-soft transition"
          >
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xl font-bold text-gr-text group-hover:text-gr-accent transition">
                {c.title}
              </h2>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${c.statusCls}`}>
                {c.status}
              </span>
            </div>
            <p className="text-sm text-gr-muted leading-relaxed mb-3">{c.blurb}</p>
            <div className="text-xs text-gr-subtle">
              <span className="uppercase tracking-wider font-semibold text-gr-text">Use for:</span>{' '}
              {c.useFor}
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h3 className="font-bold text-gr-text mb-2">New here?</h3>
        <p className="text-sm text-gr-muted leading-relaxed">
          Every page anchors on a <strong>snapshot date</strong> at the top — that&apos;s the day
          the data was captured. Most pages refresh daily around 5 AM ET. If you want to query the
          raw tables yourself, head to <Link href="/data-explorer" className="text-gr-accent hover:underline">Data Explorer</Link>.
        </p>
      </div>
    </div>
  );
}
