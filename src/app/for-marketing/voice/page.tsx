'use client';

import { useGymreapersData } from '../../gymreapers/_lib/GymreapersProvider';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { useHiddenBrands } from '@/components/useHiddenBrands';
import { BrandHideButton, HiddenBrandsBanner } from '@/components/BrandVisibilityControls';

export default function ShareOfVoicePage() {
  const { data } = useGymreapersData();
  const { isHidden } = useHiddenBrands();
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  const social = data.social || { redditVelocity: {} };
  const allBrands = data.brand_order
    .map((slug) => ({
      slug,
      name: data.brand_names[slug] || slug,
      mentions_7d: social.redditVelocity?.[slug]?.mentions_7d || 0,
      positive_pct: social.redditVelocity?.[slug]?.positive_pct,
    }))
    .filter((b) => b.mentions_7d > 0)
    .sort((a, b) => b.mentions_7d - a.mentions_7d);
  // Focus brand (gymreapers) is always visible regardless of hidden state.
  const brands = allBrands.filter((b) => b.slug === 'gymreapers' || !isHidden(b.slug));
  const allBrandsForBanner = data.brand_order.map((slug) => ({ slug, name: data.brand_names[slug] || slug }));

  const total = brands.reduce((s, b) => s + b.mentions_7d, 0) || 1;
  const max = brands[0]?.mentions_7d || 1;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing · Share of Voice
          </p>
          <ConfidenceBadge source="reddit" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Who&apos;s owning the conversation
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Reddit mention volume across the Gymreapers competitive set, last 7 days — our current
          best public proxy for <GlossaryTerm id="share-of-voice">share of voice</GlossaryTerm>. The
          wider the bar, the more conversation that brand owns. Reddit&apos;s fitness community
          skews male/powerlifting — read directionally, not as ground truth.
        </p>
      </header>

      <HiddenBrandsBanner brands={allBrandsForBanner} />

      {brands.length === 0 ? (
        <div className="bg-gr-surface rounded-md p-8 border border-gr-border text-center text-gr-muted">
          No Reddit mention data captured today. The social monitor runs every 4 hours.
        </div>
      ) : (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">7-day window</p>
            <h2 className="text-2xl font-bold text-gr-text tracking-tight">Mention volume by brand</h2>
          </div>
          <div className="mb-5">
            <SectionExplainer
              what="Each bar = one brand's total Reddit mentions across powerlifting/fitness subreddits in the last 7 days."
              howToRead="Wider bar = more share of the conversation. The % share number is that brand's slice of total mentions across the whole competitive set. Sample is thin — treat as directional, not statistically robust."
              whatToDo="If a peer's share is spiking, dig into the threads — usually a new product, a viral creator post, or a controversy. Either ride along or defend."
            />
          </div>
          <div className="space-y-4">
            {brands.map((b) => {
              const width = (b.mentions_7d / max) * 100;
              const share = ((b.mentions_7d / total) * 100).toFixed(1);
              const isGR = b.slug === 'gymreapers';
              return (
                <div key={b.slug}>
                  <div className="flex items-baseline justify-between mb-1.5 text-sm">
                    <span className={`inline-flex items-center gap-1.5 ${isGR ? 'text-gr-accent font-bold' : 'text-gr-text font-semibold'}`}>
                      {isGR && '→ '}{b.name}
                      {!isGR && <BrandHideButton slug={b.slug} name={b.name} />}
                    </span>
                    <span className="text-gr-muted text-xs tabular-nums">
                      {b.mentions_7d} mentions · {share}% share
                      {typeof b.positive_pct === 'number' && ` · ${b.positive_pct.toFixed(0)}% positive`}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gr-bg rounded">
                    <div
                      className={`h-full rounded ${isGR ? 'bg-gradient-to-r from-gr-accent-hover to-gr-accent' : 'bg-gr-subtle'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="text-xs text-gr-subtle">
        Snapshot: {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'} ·{' '}
        Data from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.social_velocity</code>
      </div>
    </div>
  );
}
