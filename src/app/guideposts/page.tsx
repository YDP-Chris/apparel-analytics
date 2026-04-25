'use client';

// Curated content. Manually maintained. Update as the team's thinking evolves.

type Guidepost = {
  name: string;
  url?: string;
  est_revenue: string;
  est_revenue_year: string;
  category: 'Premium Niche' | 'Community-Led' | 'Lifestyle Pivot' | 'Branding Masterclass' | 'Direct Peer';
  one_line: string;
  the_play: string;
  apply_to_gymreapers: string;
  watch_for: string;
};

const GUIDEPOSTS: Guidepost[] = [
  {
    name: 'Tracksmith',
    url: 'https://www.tracksmith.com',
    est_revenue: '$60-80M',
    est_revenue_year: 'est 2024',
    category: 'Premium Niche',
    one_line:
      'Heritage-styled premium running brand that owns the cultural narrative through events and storytelling, not influencers.',
    the_play:
      'Charge premium ($48 cotton tees) by serving the serious athlete and refusing to pivot to lifestyle. Trials of Miles events, Meter Magazine, athlete ambassadors who actually compete. Heritage prep aesthetic that signals seriousness without being utilitarian.',
    apply_to_gymreapers:
      "Build the powerlifting equivalent. Own the strength culture: meet sponsorships, training camp partnerships, athlete-led storytelling, design language that signals \"this is for people who actually compete.\" The customer who buys premium will pay because the brand makes them feel like a serious lifter, not because the product specs are 5% better.",
    watch_for:
      'Tracksmith never chased the lifestyle market and never lost its identity. The day Gymreapers releases a "lifestyle" line is the day to ask whether we are giving up our moat.',
  },
  {
    name: 'Gymshark',
    url: 'https://www.gymshark.com',
    est_revenue: '$500M+',
    est_revenue_year: '2024',
    category: 'Community-Led',
    one_line:
      'Built from a UK warehouse to half a billion dollars in a decade by signing pre-fame fitness creators and turning them into a community.',
    the_play:
      "Identify athletes and creators before they're stars. Sign them long. Make them part of the brand identity. UGC pipeline at scale. Live events (Gymshark Lifting Club, training camps). Limited drops that create FOMO.",
    apply_to_gymreapers:
      'Sign powerlifters, strongman athletes, hybrid athletes pre-fame. Bake them into product line names and content. Hold strength-specific events. Run drops with athlete collaborations. Their playbook works for any athletic community.',
    watch_for:
      'Gymshark is currently a peer; the question is whether we follow their playbook or differentiate from them. Probably differentiate — they own the lifestyle/social-first space.',
  },
  {
    name: 'Vuori',
    url: 'https://www.vuoriclothing.com',
    est_revenue: '$1B+',
    est_revenue_year: '2024',
    category: 'Lifestyle Pivot',
    one_line:
      'Pivoted from performance to lifestyle and crossed a billion dollars by selling the moment of training-to-life transition.',
    the_play:
      "Performance fit and fabric, but design language that's at home in the gym AND on the street. \"Ready for anything\" positioning. Premium pricing ($90 joggers) by being adopted as everyday wear, not just workout wear. SoftCore, DreamKnit, fabric brand-names that mean something.",
    apply_to_gymreapers:
      'Bridge gym-to-life with elevated essentials. Hoodies, joggers, tees that are heavyweight enough for training but cut clean enough to wear out. The customer who lifts is also living a life — meet them across both moments.',
    watch_for:
      'Vuori succeeded by leaving sports-specific positioning. We can borrow the elevated-essentials playbook without abandoning the strength identity.',
  },
  {
    name: 'Goruck',
    url: 'https://www.goruck.com',
    est_revenue: '$100-200M',
    est_revenue_year: 'est 2023',
    category: 'Community-Led',
    one_line:
      'Built a tribal brand around an experience (the GORUCK Challenge) before the product. Premium pricing because the product is a badge.',
    the_play:
      'Own a defined community (military, veterans, GORUCK Tough finishers). Hold owned events (GRC, Tough, Heavy). Lifetime warranty. Tribal aesthetic. The product follows the community, not the other way around.',
    apply_to_gymreapers:
      "Strength has the same tribal opportunity. \"Reapers\" tribe of serious lifters with their own events, badges (\"meet a 1000lb total\"), local meetups. Sell premium because owning a piece of Gymreapers is identity-affirming, not just functional.",
    watch_for:
      'Goruck is the closest spiritual cousin to Gymreapers — premium / tribal / owned events / heritage aesthetic. Study them more than any direct apparel competitor.',
  },
  {
    name: 'Liquid Death',
    url: 'https://liquiddeath.com',
    est_revenue: '$700M+',
    est_revenue_year: '2024',
    category: 'Branding Masterclass',
    one_line:
      'Sells canned water at premium prices because the brand is heavy metal art. Proves a commodity becomes premium with brave branding.',
    the_play:
      'Turn a commodity into a cult by being unapologetically loud about identity. Heavy metal aesthetic, irreverent voice, viral marketing at zero ad spend. Branded merch outsells the product itself in some channels.',
    apply_to_gymreapers:
      'The reaper / iron / hard / serious identity is already there. Lean further. Branded merch (apparel, stickers, bottles, posters) as cultural artifacts. Voice that talks to lifters, not to "fitness consumers."',
    watch_for:
      'Liquid Death proves that brand can outrun product fundamentals when the identity is strong enough. Most strength brands lean on product specs. Brand is the harder, longer-running moat.',
  },
  {
    name: 'Onnit',
    url: 'https://www.onnit.com',
    est_revenue: '$150-200M',
    est_revenue_year: 'at sale to Unilever 2021',
    category: 'Branding Masterclass',
    one_line:
      'Built the "total human optimization" frame, ran a podcast halo via Joe Rogan, sold to Unilever. Lifestyle-meets-strength supplements + gear.',
    the_play:
      'Position around a lifestyle frame ("optimization"), not a product category. Use a creator/podcast halo for trust. Tribal aesthetic. Multi-category expansion (supplements + gear + apparel + classes).',
    apply_to_gymreapers:
      'Strength has its own equivalents — pure strength, raw power, longevity, hybrid athletics. Pick a frame larger than "we sell belts and shorts." Find the strength-community equivalent of the Joe Rogan halo (Stan Efferding, Mark Bell, Andrew Huberman in his strength moments).',
    watch_for:
      'Onnit teaches: a brand frame > a product line. The frame extends the catalog and gives every new SKU a place to live.',
  },
  {
    name: 'Lululemon',
    url: 'https://shop.lululemon.com',
    est_revenue: '$10B+',
    est_revenue_year: '2024',
    category: 'Premium Niche',
    one_line:
      'Built the playbook every premium athletic brand follows: ambassadors, community classes, store as event, premium-priced essentials.',
    the_play:
      'Local ambassadors (yoga teachers, run captains) who become evangelists. In-store classes turn retail into community. Pricing premium ($98 leggings) supported by fit and fabric and identity. Refusing to discount.',
    apply_to_gymreapers:
      'Steal the ambassador model. A network of powerlifting coaches, gym owners, hybrid athletes who get gear, host meets at their gyms, become local Gymreapers faces. Steal the no-discounting discipline.',
    watch_for:
      'Lulu is too big and too lifestyle to copy whole-cloth. But the ambassador / community / premium discipline are exactly the right disciplines.',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Premium Niche': 'text-gr-accent',
  'Community-Led': 'text-gr-warning',
  'Lifestyle Pivot': 'text-gr-success',
  'Branding Masterclass': 'text-gr-accent-hover',
  'Direct Peer': 'text-gr-muted',
};

export default function GuidepostsPage() {
  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Guideposts
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Brands That Hit $300M (Or Beat It)</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Aspirational brands worth studying as Gymreapers scales. Each got past $100-200M+ on a different
          playbook. The lesson here is not which brand to copy — it&apos;s which playbook fits our identity
          when we have the chance to choose.
        </p>
      </header>

      <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
        <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
        <p className="text-lg text-gr-text leading-relaxed">
          Five distinct paths to scale show up in the strength / athletic adjacent landscape. Premium niche
          (Tracksmith), community-led (Gymshark, Goruck), lifestyle pivot (Vuori), branding masterclass
          (Liquid Death, Onnit), and the bigger-than-life premium athletic standard
          (Lululemon). Each is a real $100M-$10B business built on a different bet.
        </p>
        <p className="text-gr-muted text-base mt-3 leading-relaxed">
          <span className="text-gr-text font-bold">Decision lens:</span> Gymreapers&apos; closest spiritual
          cousins are <b className="text-gr-accent">Goruck</b> (tribal community + premium + owned events) and{' '}
          <b className="text-gr-accent">Tracksmith</b> (premium niche + cultural moat). Both show that
          serving a serious athletic subculture seriously can scale to nine figures without ever pivoting
          to mainstream lifestyle. That is the most-likely path to $300M for us.
        </p>
      </section>

      <section>
        <div className="text-xs uppercase tracking-[0.2em] text-gr-subtle font-mono mb-1">Evidence</div>
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-4">
          Seven Brands, Seven Plays
        </h2>
        <div className="space-y-4">
          {GUIDEPOSTS.map((gp) => (
            <div
              key={gp.name}
              className="bg-gr-surface border border-gr-border rounded-md p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-[0.2em] mb-1 ${CATEGORY_COLORS[gp.category] || 'text-gr-muted'}`}
                  >
                    {gp.category}
                  </div>
                  <h3 className="text-2xl font-bold text-gr-text">
                    {gp.url ? (
                      <a
                        href={gp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-gr-accent transition"
                      >
                        {gp.name}
                      </a>
                    ) : (
                      gp.name
                    )}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-gr-text">{gp.est_revenue}</div>
                  <div className="text-xs text-gr-subtle uppercase tracking-wider font-mono mt-0.5">
                    {gp.est_revenue_year}
                  </div>
                </div>
              </div>

              <p className="text-gr-text leading-relaxed mb-4">{gp.one_line}</p>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs text-gr-accent font-bold uppercase tracking-[0.2em] mb-1">
                    The Play
                  </div>
                  <p className="text-gr-muted leading-relaxed">{gp.the_play}</p>
                </div>
                <div>
                  <div className="text-xs text-gr-accent font-bold uppercase tracking-[0.2em] mb-1">
                    Apply To Gymreapers
                  </div>
                  <p className="text-gr-text leading-relaxed">{gp.apply_to_gymreapers}</p>
                </div>
                <div>
                  <div className="text-xs text-gr-accent font-bold uppercase tracking-[0.2em] mb-1">
                    Watch For
                  </div>
                  <p className="text-gr-muted leading-relaxed italic">{gp.watch_for}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-xs uppercase tracking-[0.25em] text-gr-accent font-bold mb-3">
          What This Page Is For
        </h2>
        <div className="space-y-2 text-gr-muted leading-relaxed">
          <p>
            Direct competitive intel (gaps, pricing, palette) tells us where we&apos;re leaving money on the
            table this quarter. Guideposts tell us what shape we&apos;re trying to grow into.
          </p>
          <p>
            Update this page as the team&apos;s thinking sharpens. The brands here should change as we learn
            what fits.
          </p>
        </div>
      </section>
    </div>
  );
}
