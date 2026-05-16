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
  const primary = cards.find((c) => c.primary);
  const rest = cards.filter((c) => !c.primary);
  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          For Product
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Build what the market wants.
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Demand signals, competitive whitespace, and assortment gaps. Daily snapshots from Amazon
          BSR, competitor catalogs, and Google Trends so product decisions are evidence-led.
        </p>
      </header>

      {/* Primary card — full-width focal point. Accent left rail + larger
          type. Lives in its own region above the supporting grid to avoid
          the proximity bug where it floated in line with siblings. */}
      {primary && (
        <Link
          href={primary.href}
          className="group block bg-gr-surface rounded-md border border-gr-border border-l-2 border-l-gr-accent p-8 hover:border-l-gr-accent-hover hover:bg-gr-raised/50 transition"
        >
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent text-xs font-bold uppercase tracking-[0.25em]">
              Start here
            </p>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-[0.1em] ${primary.statusCls}`}>
              {primary.status}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gr-text group-hover:text-gr-accent transition tracking-tight mb-3">
            {primary.title}
          </h2>
          <p className="text-base text-gr-muted leading-relaxed max-w-3xl mb-5">{primary.blurb}</p>
          <div className="text-xs text-gr-subtle leading-relaxed pt-4 border-t border-gr-border/60 max-w-3xl">
            <span className="uppercase tracking-[0.15em] font-bold text-gr-muted">Use for </span>
            <span className="text-gr-muted">{primary.useFor}</span>
          </div>
        </Link>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {rest.map((c) => (
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
    </div>
  );
}
