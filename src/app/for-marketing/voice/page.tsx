'use client';

import { useGymreapersData } from '../../gymreapers/_lib/GymreapersProvider';

export default function ShareOfVoicePage() {
  const { data } = useGymreapersData();
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  const social = data.social || { redditVelocity: {} };
  const brands = data.brand_order
    .map((slug) => ({
      slug,
      name: data.brand_names[slug] || slug,
      mentions_7d: social.redditVelocity?.[slug]?.mentions_7d || 0,
      positive_pct: social.redditVelocity?.[slug]?.positive_pct,
    }))
    .filter((b) => b.mentions_7d > 0)
    .sort((a, b) => b.mentions_7d - a.mentions_7d);

  const total = brands.reduce((s, b) => s + b.mentions_7d, 0) || 1;
  const max = brands[0]?.mentions_7d || 1;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Marketing · Share of Voice
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Who&apos;s owning the conversation</h1>
        <p className="text-gr-muted mt-2 max-w-3xl">
          Reddit mention volume across the Gymreapers competitive set, last 7 days. The wider the
          bar, the more share of conversation that brand owns.
        </p>
      </header>

      {brands.length === 0 ? (
        <div className="bg-gr-surface rounded-md p-8 border border-gr-border text-center text-gr-muted">
          No Reddit mention data captured today. The social monitor runs every 4 hours.
        </div>
      ) : (
        <section className="bg-gr-surface rounded-md p-6 border border-gr-border space-y-3">
          {brands.map((b) => {
            const width = (b.mentions_7d / max) * 100;
            const share = ((b.mentions_7d / total) * 100).toFixed(1);
            const isGR = b.slug === 'gymreapers';
            return (
              <div key={b.slug}>
                <div className="flex items-baseline justify-between mb-1 text-sm">
                  <span className={isGR ? 'text-gr-accent font-bold' : 'text-gr-text font-semibold'}>
                    {isGR && '→ '}{b.name}
                  </span>
                  <span className="text-gr-muted">
                    {b.mentions_7d} mentions · {share}% share
                    {typeof b.positive_pct === 'number' && ` · ${b.positive_pct.toFixed(0)}% positive`}
                  </span>
                </div>
                <div className="h-3 bg-gr-bg rounded">
                  <div
                    className={`h-full rounded ${isGR ? 'bg-gradient-to-r from-gr-accent-hover to-gr-accent' : 'bg-gr-subtle'}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <div className="text-xs text-gr-subtle">
        Snapshot: {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'} ·{' '}
        Data from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.social_velocity</code>
      </div>
    </div>
  );
}
