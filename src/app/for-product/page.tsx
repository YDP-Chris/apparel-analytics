import Link from 'next/link';

const cards = [
  {
    href: '/gymreapers/amazon',
    title: 'Whitespace',
    status: 'LIVE',
    statusCls: 'bg-gr-success/20 text-gr-success',
    blurb:
      'Amazon categories and sub-segments where Gymreapers is absent but real demand exists. Ranked by demand × concentration.',
    useFor:
      'Picking your next product to develop. Prioritizing category investments. Knowing where the market is moving without you.',
    primary: true,
  },
  {
    href: '/for-product/pricing',
    title: 'Pricing Map',
    status: 'BETA',
    statusCls: 'bg-gr-accent-soft text-gr-accent',
    blurb:
      'Competitor pricing by category and tier, plus our position. Apples-to-apples comparisons.',
    useFor: 'Pricing new launches. Justifying premium positioning. Spotting price tests by competitors.',
  },
  {
    href: '/gymreapers/mix',
    title: 'Mix Gaps',
    status: 'LIVE',
    statusCls: 'bg-gr-success/20 text-gr-success',
    blurb:
      'Color depth, size range, and gender split across the competitive set. Where do we under-index?',
    useFor: 'Assortment planning. Closing color/size holes competitors have already filled.',
  },
  {
    href: '/gymreapers/launches',
    title: 'Launch Velocity',
    status: 'LIVE',
    statusCls: 'bg-gr-success/20 text-gr-success',
    blurb:
      'What competitors are dropping — recent drops with category, gender, and date. 7d / 14d / 30d velocity per brand.',
    useFor: 'Knowing what just hit the market. Cadence benchmarking. Reacting to category bursts.',
  },
  {
    href: '/for-product/demand',
    title: 'Demand Signals',
    status: 'LIVE',
    statusCls: 'bg-gr-success/20 text-gr-success',
    blurb:
      'Amazon bought-past-month volume bands. Top sellers, biggest risers, fastest review velocity.',
    useFor: 'Validating product bets with real market velocity. Spotting trending categories before they peak.',
  },
];

export default function ForProductPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Product
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Build what the market wants.</h1>
        <p className="text-gr-muted mt-3 max-w-3xl text-lg">
          Demand signals, competitive whitespace, and assortment gaps. Daily snapshots from Amazon
          BSR, competitor catalogs, and Google Trends so product decisions are evidence-led.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className={`group bg-gr-surface rounded-md border p-6 transition ${
              c.primary
                ? 'border-gr-accent-soft hover:border-gr-accent md:col-span-2 bg-gradient-to-br from-gr-bg to-gr-surface'
                : 'border-gr-border hover:border-gr-accent-soft'
            }`}
          >
            <div className="flex items-baseline justify-between mb-3">
              <h2 className={`font-bold group-hover:text-gr-accent transition ${
                c.primary ? 'text-2xl text-gr-accent' : 'text-xl text-gr-text'
              }`}>
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
    </div>
  );
}
