'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';
import { trackEvent } from '@/lib/usage';

function relTime(iso: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (isNaN(t)) return '';
  const diff = Date.now() - t;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GymreapersSocialPage() {
  const { data, loading, error } = useGymreapersData();

  if (loading && !data) return <div className="text-center py-20 text-gr-subtle">Loading social...</div>;
  if (error && !data) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return null;

  const focus = data.focus_brand;
  const social = data.social;

  // Sort brands by 7d mention volume
  const rankedBrands = data.brand_order
    .map((slug) => ({ slug, v: social.redditVelocity[slug] }))
    .filter((b) => b.v && b.v.mentions_7d != null)
    .sort((a, b) => (b.v!.mentions_7d || 0) - (a.v!.mentions_7d || 0));

  const totalMentions7d = rankedBrands.reduce(
    (sum, b) => sum + (b.v?.mentions_7d || 0),
    0
  );
  const focusMentions = social.redditVelocity[focus]?.mentions_7d || 0;

  return (
    <div className="space-y-10">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Conversation Volume
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Social</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Reddit mentions and X/Twitter intelligence across the strength &amp; powerlifting set.
        </p>
      </header>

      {(() => {
        const topBrand = rankedBrands[0];
        const focusShare = totalMentions7d > 0 ? Math.round((focusMentions / totalMentions7d) * 100) : 0;
        const topShare = topBrand && totalMentions7d > 0 ? Math.round(((topBrand.v?.mentions_7d || 0) / totalMentions7d) * 100) : 0;
        return (
          <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
            <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
            <p className="text-lg text-gr-text leading-relaxed">
              The strength market is talking <b className="text-gr-accent">{totalMentions7d.toLocaleString()}</b> times this week on Reddit alone.
              {topBrand && (
                <> <b>{data.brand_names[topBrand.slug] || topBrand.slug}</b> dominates with <b>{topBrand.v?.mentions_7d}</b> mentions ({topShare}% of share).</>
              )}
              {' '}Gymreapers sits at <b className="text-gr-accent">{focusMentions}</b> mentions ({focusShare}% of share).
            </p>
            <p className="text-gr-muted text-base mt-3 leading-relaxed">
              <span className="text-gr-text font-bold">Decision lens:</span> share-of-conversation is a leading indicator for share-of-revenue at this scale. If our share is below catalog share, we&apos;re under-marketing. If above, we&apos;re punching above weight on content.
            </p>
          </section>
        );
      })()}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Reddit mentions (7d)', value: totalMentions7d.toLocaleString(), context: 'across 7 brands' },
          { label: 'Gymreapers (7d)', value: focusMentions.toLocaleString(), context: 'last week' },
          { label: 'Brands tracked', value: rankedBrands.length, context: 'with social signal' },
          {
            label: 'Posts in feed',
            value: social.redditTotalMatched?.toLocaleString() || social.redditPosts.length.toLocaleString(),
            context: 'total matched',
          },
        ].map((s) => (
          <div key={s.label} className="bg-gr-surface rounded-md p-6 border border-gr-border">
            <p className="text-sm text-gr-subtle font-medium">{s.label}</p>
            <p className="text-3xl font-bold text-gr-text mt-1">{s.value}</p>
            <p className="text-xs text-gr-subtle mt-1">{s.context}</p>
          </div>
        ))}
      </section>

      {/* Brand momentum cards */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-6">Reddit Mention Momentum</h2>
        {rankedBrands.length > 0 ? (
          <div className="space-y-3">
            {rankedBrands.map(({ slug, v }) => {
              const isFocus = slug === focus;
              const max = Math.max(...rankedBrands.map((b) => b.v?.mentions_7d || 0), 1);
              const width = ((v?.mentions_7d || 0) / max) * 100;
              const sentiment = v?.positive_pct;
              return (
                <div
                  key={slug}
                  className={`p-4 rounded-md ${
                    isFocus
                      ? 'bg-gradient-to-r from-gr-accent-soft to-gr-raised border-2 border-gr-accent-soft'
                      : 'bg-gr-bg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                      {isFocus && '→ '}
                      {data.brand_names[slug]}
                    </span>
                    <span className="text-sm text-gr-muted">
                      <strong className="text-gr-bg">{v?.mentions_7d}</strong>{' '}
                      mentions / 7d
                    </span>
                  </div>
                  <div className="h-3 bg-gr-raised rounded">
                    <div
                      className={`h-full rounded ${isFocus ? 'bg-gr-accent-hover' : 'bg-gr-subtle'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {sentiment != null && (
                    <p className="text-xs text-gr-muted mt-2">
                      Sentiment: <span className={sentiment >= 50 ? 'text-gr-success' : 'text-gr-danger'}>
                        {sentiment.toFixed(0)}% positive
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gr-subtle italic">No social signal collected yet.</p>
        )}
      </section>

      {/* Recent posts feed */}
      {social.redditPosts.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Recent Reddit Discussion</h2>
          <ul className="space-y-3">
            {social.redditPosts.slice(0, 30).map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 border-b border-gr-border pb-3 last:border-0"
              >
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${
                    p.brand === focus
                      ? 'bg-gr-accent-soft text-gr-accent'
                      : 'bg-gr-raised text-gr-muted'
                  }`}
                >
                  {p.brand && data.brand_names[p.brand] ? data.brand_names[p.brand] : p.brand}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackEvent('outbound', { label: 'creator_link', metadata: { href: (p.url || '').slice(0, 200) } })}
                    className="text-gr-text hover:text-gr-accent font-medium block"
                  >
                    {p.title}
                  </a>
                  <div className="text-xs text-gr-subtle mt-0.5">
                    r/{p.subreddit}
                    {(p.date || p.created_at) && ` · ${relTime(p.date || p.created_at || '')}`}
                    {p.sentiment && (
                      <span
                        className={`ml-2 ${
                          p.sentiment === 'positive'
                            ? 'text-gr-success'
                            : p.sentiment === 'negative'
                            ? 'text-gr-danger'
                            : 'text-gr-subtle'
                        }`}
                      >
                        · {p.sentiment}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Grok themes */}
      {Object.keys(social.grokThemes || {}).length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">X/Twitter Themes (Grok)</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(social.grokThemes)
              .sort((a, b) => b[1] - a[1])
              .map(([theme, count]) => (
                <span
                  key={theme}
                  className="px-3 py-1.5 rounded-full text-sm bg-gr-accent-soft text-gr-accent border border-gr-accent-soft"
                >
                  {theme.replace('_', ' ')} <span className="opacity-60">({count})</span>
                </span>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
