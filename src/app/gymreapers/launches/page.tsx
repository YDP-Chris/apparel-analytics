'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';

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
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Launch Velocity
          </p>
          <ConfidenceBadge source="launches" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">Launches</h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          New products detected via brand sitemaps, scoped to the strength &amp; powerlifting set.
          Cadence by brand is the cleanest read of{' '}
          <GlossaryTerm id="velocity">launch velocity</GlossaryTerm>.
        </p>
      </header>

      {(() => {
        const ranked = data.brand_order
          .map((slug) => ({ slug, last7: section.summary[slug]?.last_7d || 0, last30: section.summary[slug]?.last_30d || 0 }))
          .sort((a, b) => b.last7 - a.last7);
        const top = ranked[0];
        const focusRow = ranked.find((r) => r.slug === focus);
        return (
          <section className="bg-gr-surface border border-gr-border border-l-2 border-l-gr-accent rounded-md p-8">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-4">The Read</p>
            <p className="text-lg md:text-xl text-gr-text leading-relaxed font-medium">
              The strength market shipped <b className="text-gr-accent">{totalLast7d}</b> new SKUs in the last 7 days, <b>{totalLast30d}</b> in the last 30.
              {top && top.last7 > 0 && (
                <> <b>{data.brand_names[top.slug] || top.slug}</b> led the week with <b>{top.last7}</b> drops.</>
              )}
              {focusRow && (
                <> Gymreapers contributed <b className="text-gr-accent">{focusRow.last7}</b> ({focusShare}% of weekly volume).</>
              )}
            </p>
            <p className="text-gr-muted text-sm mt-4 leading-relaxed max-w-3xl">
              <span className="text-gr-text font-semibold">What to watch —</span> if a peer&apos;s daily cadence breaks 5+ for several days running, that&apos;s a launch signal worth investigating before the press pickup.
            </p>
          </section>
        );
      })()}

      <SectionExplainer
        collapsed
        what="Four headline numbers: total drops in the last 7d and 30d across all 7 tracked brands, plus Gymreapers' weekly contribution and share."
        howToRead="A high share means we're outpacing peers on launch cadence; a low share means peers are shipping faster than us this week."
        whatToDo="If our share is under 10% and the market is shipping aggressively, ask product whether we're paced too conservatively for the moment."
      />

      <section className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {[
          { label: 'New (7d)', value: totalLast7d, context: 'across all 7 brands' },
          { label: 'New (30d)', value: totalLast30d, context: 'across all 7 brands' },
          { label: 'Gymreapers (7d)', value: focusLast7d, context: 'last week' },
          { label: 'Gymreapers share', value: `${focusShare}%`, context: 'of weekly drops' },
        ].map((s) => (
          <div key={s.label} className="bg-gr-surface rounded-md p-6 border border-gr-border">
            <p className="text-[11px] uppercase tracking-[0.15em] text-gr-subtle font-bold">{s.label}</p>
            <p className="text-3xl md:text-4xl font-bold text-gr-text mt-1.5 tabular-nums tracking-tight">{s.value}</p>
            <p className="text-xs text-gr-subtle mt-1">{s.context}</p>
          </div>
        ))}
      </section>

      {/* Per-brand sparklines */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">Time series</p>
          <h2 className="text-2xl font-bold text-gr-text tracking-tight">30-day Velocity by Brand</h2>
        </div>
        <div className="mb-5">
          <SectionExplainer
            what="One sparkline per brand showing the count of new products dropped each day over the last 30 days, with 7d/14d/30d totals."
            howToRead="Tall bars are heavy-launch days. A series of tall bars usually signals a coordinated drop or a seasonal release. Gymreapers' lane is highlighted in accent red."
            whatToDo="When a peer's bars suddenly grow taller for several days running, that's a launch event worth investigating before it shows up in trade press."
          />
        </div>
        <div className="space-y-4">
          {[...data.brand_order]
            .sort((a, b) => (section.summary[b]?.last_7d || 0) - (section.summary[a]?.last_7d || 0))
            .map((slug) => {
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
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">Feed</p>
            <h2 className="text-2xl font-bold text-gr-text tracking-tight">Recent Drops <span className="text-gr-muted font-normal text-base">(last 14 days)</span></h2>
          </div>
          <div className="mb-5">
            <SectionExplainer
              what="Every new product URL detected across the competitive set in the last 14 days, newest first."
              howToRead="Brand tag · product name · date · category/gender (when classifier can tell). Click a row to open the live PDP. Gymreapers drops use the accent pill."
              whatToDo="Scan for products in categories we play in. Those are candidates for a counter-launch, an ad pivot, or a price test."
            />
          </div>
          <ul className="space-y-3">
            {[...section.recentDrops]
              .sort((a, b) => new Date(b.first_seen || b.date || 0).getTime() - new Date(a.first_seen || a.date || 0).getTime())
              .slice(0, 30).map((d, i) => (
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
