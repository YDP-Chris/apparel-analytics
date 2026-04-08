'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';

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

  if (loading && !data) return <div className="text-center py-20 text-socal-stone-400">Loading social...</div>;
  if (error && !data) return <div className="text-center py-20 text-rose-600">{error}</div>;
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
      <header className="text-center max-w-3xl mx-auto">
        <p className="text-socal-ocean-600 font-medium text-sm uppercase tracking-wide mb-2">
          Conversation Volume
        </p>
        <h1 className="text-4xl font-bold text-socal-stone-800 mb-3">Social</h1>
        <p className="text-socal-stone-500">
          Reddit mentions and X/Twitter intelligence across the strength &amp; powerlifting set.
        </p>
      </header>

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
          <div key={s.label} className="bg-white rounded-2xl p-6 shadow-soft border border-socal-sand-100">
            <p className="text-sm text-socal-stone-400 font-medium">{s.label}</p>
            <p className="text-3xl font-bold text-socal-stone-800 mt-1">{s.value}</p>
            <p className="text-xs text-socal-stone-400 mt-1">{s.context}</p>
          </div>
        ))}
      </section>

      {/* Brand momentum cards */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Reddit Mention Momentum</h2>
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
                  className={`p-4 rounded-xl ${
                    isFocus
                      ? 'bg-gradient-to-r from-socal-ocean-50 to-socal-sand-50 border-2 border-socal-ocean-200'
                      : 'bg-socal-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-semibold ${isFocus ? 'text-socal-ocean-700' : 'text-socal-stone-700'}`}>
                      {isFocus && '→ '}
                      {data.brand_names[slug]}
                    </span>
                    <span className="text-sm text-socal-stone-600">
                      <strong className="text-socal-stone-900">{v?.mentions_7d}</strong>{' '}
                      mentions / 7d
                    </span>
                  </div>
                  <div className="h-3 bg-socal-stone-100 rounded">
                    <div
                      className={`h-full rounded ${isFocus ? 'bg-socal-ocean-500' : 'bg-socal-stone-400'}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {sentiment != null && (
                    <p className="text-xs text-socal-stone-500 mt-2">
                      Sentiment: <span className={sentiment >= 50 ? 'text-socal-sage-600' : 'text-rose-600'}>
                        {sentiment.toFixed(0)}% positive
                      </span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-socal-stone-400 italic">No social signal collected yet.</p>
        )}
      </section>

      {/* Recent posts feed */}
      {social.redditPosts.length > 0 && (
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Recent Reddit Discussion</h2>
          <ul className="space-y-3">
            {social.redditPosts.slice(0, 30).map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-3 border-b border-socal-sand-100 pb-3 last:border-0"
              >
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${
                    p.brand === focus
                      ? 'bg-socal-ocean-100 text-socal-ocean-700'
                      : 'bg-socal-stone-100 text-socal-stone-600'
                  }`}
                >
                  {p.brand && data.brand_names[p.brand] ? data.brand_names[p.brand] : p.brand}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-socal-stone-700 hover:text-socal-ocean-700 font-medium block"
                  >
                    {p.title}
                  </a>
                  <div className="text-xs text-socal-stone-400 mt-0.5">
                    r/{p.subreddit}
                    {(p.date || p.created_at) && ` · ${relTime(p.date || p.created_at || '')}`}
                    {p.sentiment && (
                      <span
                        className={`ml-2 ${
                          p.sentiment === 'positive'
                            ? 'text-socal-sage-600'
                            : p.sentiment === 'negative'
                            ? 'text-rose-600'
                            : 'text-socal-stone-400'
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
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <h2 className="text-xl font-bold text-socal-stone-800 mb-6">X/Twitter Themes (Grok)</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(social.grokThemes)
              .sort((a, b) => b[1] - a[1])
              .map(([theme, count]) => (
                <span
                  key={theme}
                  className="px-3 py-1.5 rounded-full text-sm bg-socal-ocean-50 text-socal-ocean-700 border border-socal-ocean-100"
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
