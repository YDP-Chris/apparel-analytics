'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function GymreapersLaunchesPage() {
  const { data, loading, error } = useGymreapersData();

  if (loading && !data) return <div className="text-center py-20 text-gr-subtle">Loading launches...</div>;
  if (error && !data) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return null;

  const focus = data.focus_brand;
  const section = data.launchesSection;

  // Build a 30-day date axis
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Find max daily count for sparkline normalization
  const allCounts = data.brand_order.flatMap((slug) =>
    days.map((d) => section.velocity[slug]?.[d] || 0)
  );
  const maxDaily = Math.max(...allCounts, 1);

  // Brand summary totals
  const totalLast7d = Object.values(section.summary).reduce((sum, b) => sum + (b.last_7d || 0), 0);
  const totalLast30d = Object.values(section.summary).reduce((sum, b) => sum + (b.last_30d || 0), 0);
  const focusLast7d = section.summary[focus]?.last_7d || 0;
  const focusShare =
    totalLast7d > 0 ? Math.round((focusLast7d / totalLast7d) * 100) : 0;

  return (
    <div className="space-y-10">
      <header className="text-center max-w-3xl mx-auto">
        <p className="text-gr-accent font-medium text-sm uppercase tracking-wide mb-2">
          Product Velocity
        </p>
        <h1 className="text-4xl font-bold text-gr-text mb-3">Launches</h1>
        <p className="text-gr-muted">
          New products detected via brand sitemaps, scoped to the strength &amp; powerlifting set.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'New (7d)', value: totalLast7d, context: 'across all 7 brands' },
          { label: 'New (30d)', value: totalLast30d, context: 'across all 7 brands' },
          { label: 'Gymreapers (7d)', value: focusLast7d, context: 'last week' },
          { label: 'Gymreapers share', value: `${focusShare}%`, context: 'of weekly drops' },
        ].map((s) => (
          <div key={s.label} className="bg-gr-surface rounded-md p-6 border border-gr-border">
            <p className="text-sm text-gr-subtle font-medium">{s.label}</p>
            <p className="text-3xl font-bold text-gr-text mt-1">{s.value}</p>
            <p className="text-xs text-gr-subtle mt-1">{s.context}</p>
          </div>
        ))}
      </section>

      {/* Per-brand sparklines */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-6">30-day Velocity by Brand</h2>
        <div className="space-y-4">
          {data.brand_order.map((slug) => {
            const summary = section.summary[slug] || { last_7d: 0, last_14d: 0, last_30d: 0 };
            const isFocus = slug === focus;
            const baseline = section.baselineDates[slug];
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
                  <span
                    className={`font-semibold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}
                  >
                    {isFocus && '→ '}
                    {data.brand_names[slug]}
                  </span>
                  <span className="text-xs text-gr-muted">
                    7d: <strong className="text-gr-text">{summary.last_7d}</strong>
                    {' · '}
                    14d: <strong className="text-gr-text">{summary.last_14d}</strong>
                    {' · '}
                    30d: <strong className="text-gr-text">{summary.last_30d}</strong>
                  </span>
                </div>
                <div className="flex items-end gap-px h-12">
                  {days.map((d) => {
                    const n = section.velocity[slug]?.[d] || 0;
                    const h = (n / maxDaily) * 100;
                    return (
                      <div
                        key={d}
                        className="flex-1 min-w-0"
                        title={`${d}: ${n}`}
                      >
                        <div
                          className={`w-full rounded-sm ${
                            isFocus ? 'bg-gr-accent-hover' : 'bg-gr-subtle'
                          }`}
                          style={{ height: `${Math.max(h, n > 0 ? 4 : 0)}%`, marginTop: 'auto' }}
                        />
                      </div>
                    );
                  })}
                </div>
                {summary.last_30d === 0 && baseline && (
                  <p className="text-xs text-gr-subtle mt-2 italic">
                    No drops detected yet. Tracking since {dateLabel(baseline)}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent drops feed */}
      {section.recentDrops.length > 0 ? (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Recent Drops (last 14 days)</h2>
          <ul className="space-y-3">
            {section.recentDrops.slice(0, 30).map((d, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-gr-border pb-3 last:border-0">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 ${
                    d.brand === focus
                      ? 'bg-gr-accent-soft text-gr-accent'
                      : 'bg-gr-raised text-gr-muted'
                  }`}
                >
                  {d.brandName}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gr-text hover:text-gr-accent font-medium block truncate"
                  >
                    {d.product_name || d.url}
                  </a>
                  <div className="text-xs text-gr-subtle mt-0.5">
                    {dateLabel(d.first_seen)}
                    {d.category && ` · ${d.category}`}
                    {d.gender && ` · ${d.gender}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="bg-gr-surface rounded-md p-12 border border-gr-border text-center">
          <p className="text-gr-muted">
            No new product drops detected in the last 14 days. We just started tracking some of these brands —
            check back tomorrow.
          </p>
        </section>
      )}
    </div>
  );
}
