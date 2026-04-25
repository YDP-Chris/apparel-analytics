'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';

const CATEGORY_ORDER = ['bottoms', 'tops', 'outerwear', 'sports_bras', 'dresses', 'accessories', 'other'];
const CATEGORY_COLORS: Record<string, string> = {
  bottoms: '#3b82f6',
  tops: '#22c55e',
  outerwear: '#f59e0b',
  sports_bras: '#a855f7',
  dresses: '#ec4899',
  accessories: '#6b7280',
  other: '#94a3b8',
};

function formatMoney(n: number): string {
  return `$${n.toFixed(0)}`;
}

export default function GymreapersMixPage() {
  const { data, loading, error } = useGymreapersData();

  if (loading && !data) return <div className="text-center py-20 text-gr-subtle">Loading product mix...</div>;
  if (error && !data) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return null;

  const focus = data.focus_brand;
  const mixOrder = data.brand_order.filter((s) => data.mix[s]);

  // Aggregate price ranges across all categories for the comparison matrix
  const allCategories = new Set<string>();
  Object.values(data.mix).forEach((m) => {
    Object.keys(m.pricePositioning || {}).forEach((c) => allCategories.add(c));
  });

  return (
    <div className="space-y-10">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Assortment Strategy
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Product Mix</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          How Gymreapers&apos; catalog compares to competitors across categories, colors, sizes, and price.
        </p>
      </header>

      {(() => {
        const focusMix = data.mix[focus];
        const topCat = focusMix?.categoryMix
          ? Object.entries(focusMix.categoryMix).sort((a, b) => b[1] - a[1])[0]
          : null;
        const focusExt = focusMix?.sizeStrategy?.extendedSizePct ?? 0;
        const focusColors = focusMix?.colorStrategy?.avgColorsPerStyle ?? 0;
        // Find peer with deepest color depth for comparison
        const peerColors = mixOrder
          .filter((s) => s !== focus)
          .map((s) => ({ slug: s, val: data.mix[s]?.colorStrategy?.avgColorsPerStyle || 0 }))
          .sort((a, b) => b.val - a.val);
        const colorLeader = peerColors[0];
        return (
          <section className="bg-gr-surface border-l-4 border-gr-accent rounded-md p-6">
            <div className="text-gr-accent font-bold text-xs uppercase tracking-[0.3em] mb-3">The Read</div>
            <p className="text-lg text-gr-text leading-relaxed">
              {topCat && (
                <>Our biggest category is <b className="text-gr-accent">{topCat[0]}</b> at <b>{topCat[1].toFixed(0)}%</b> of catalog. </>
              )}
              We offer <b className="text-gr-accent">{focusExt.toFixed(0)}%</b> extended sizes (2XL+) and average <b className="text-gr-accent">{focusColors.toFixed(1)}</b> colors per style.
              {colorLeader && colorLeader.val > focusColors && (
                <> {data.brand_names[colorLeader.slug] || colorLeader.slug} runs <b>{colorLeader.val.toFixed(1)}</b> colors per style — a measurable depth gap.</>
              )}
            </p>
            <p className="text-gr-muted text-base mt-3 leading-relaxed">
              <span className="text-gr-text font-bold">Decision lens:</span> mix is the merchandising fingerprint. Compare each row below to ask whether we&apos;re leaning where the strength athlete spends or where we want them to spend.
            </p>
          </section>
        );
      })()}

      {/* Category mix — stacked bars */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-2">Category Mix</h2>
        <p className="text-sm text-gr-subtle mb-6">% of catalog by category, normalized per brand.</p>
        <div className="space-y-4">
          {mixOrder.map((slug) => {
            const m = data.mix[slug];
            const isFocus = slug === focus;
            return (
              <div key={slug}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                    {isFocus && '→ '}
                    {data.brand_names[slug]}
                  </span>
                  <span className="text-xs text-gr-subtle">
                    {m.totalProducts.toLocaleString()} products{' '}
                    {m.source === 'sitemap' && <span className="opacity-60">(sitemap-only)</span>}
                  </span>
                </div>
                <div className="flex h-7 rounded-lg overflow-hidden border border-gr-border">
                  {CATEGORY_ORDER.map((cat) => {
                    const pct = m.categoryMix[cat] || 0;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={cat}
                        className="flex items-center justify-center text-xs text-gr-text font-medium"
                        style={{ width: `${pct}%`, background: CATEGORY_COLORS[cat] }}
                        title={`${cat}: ${pct}%`}
                      >
                        {pct >= 8 ? `${pct}%` : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 mt-5 text-xs">
          {CATEGORY_ORDER.map((cat) => (
            <span key={cat} className="flex items-center gap-1.5 text-gr-muted">
              <span className="w-3 h-3 rounded-sm" style={{ background: CATEGORY_COLORS[cat] }} />
              {cat.replace('_', ' ')}
            </span>
          ))}
        </div>
      </section>

      {/* Color depth + size inclusivity */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Color Depth</h2>
          <div className="space-y-3">
            {mixOrder
              .filter((slug) => data.mix[slug].colorDepth)
              .sort((a, b) => (data.mix[b].colorDepth!.avgColorsPerStyle) - (data.mix[a].colorDepth!.avgColorsPerStyle))
              .map((slug) => {
                const m = data.mix[slug];
                const cd = m.colorDepth!;
                const isFocus = slug === focus;
                const max = Math.max(
                  ...mixOrder
                    .map((s) => data.mix[s].colorDepth?.avgColorsPerStyle || 0),
                  1
                );
                const width = (cd.avgColorsPerStyle / max) * 100;
                return (
                  <div key={slug} className="flex items-center gap-3">
                    <div className={`w-32 text-sm font-medium ${isFocus ? 'text-gr-accent' : 'text-gr-muted'}`}>
                      {isFocus && '→ '}{data.brand_names[slug]}
                    </div>
                    <div className="flex-1 h-6 bg-gr-raised rounded">
                      <div
                        className={`h-full rounded ${isFocus ? 'bg-gr-accent-hover' : 'bg-gr-subtle'}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className={`w-14 text-right text-sm font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-muted'}`}>
                      {cd.avgColorsPerStyle.toFixed(1)}
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="mt-4 text-xs text-gr-subtle">
            Avg colors per style. Higher = broader customer choice.
          </p>
        </div>

        <div className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Size Inclusivity</h2>
          <div className="space-y-3">
            {mixOrder
              .filter((slug) => data.mix[slug].sizeRange)
              .sort((a, b) => (data.mix[b].sizeRange!.extendedSizesPct) - (data.mix[a].sizeRange!.extendedSizesPct))
              .map((slug) => {
                const m = data.mix[slug];
                const sr = m.sizeRange!;
                const isFocus = slug === focus;
                return (
                  <div key={slug} className="flex items-center gap-3">
                    <div className={`w-32 text-sm font-medium ${isFocus ? 'text-gr-accent' : 'text-gr-muted'}`}>
                      {isFocus && '→ '}{data.brand_names[slug]}
                    </div>
                    <div className="flex-1 h-6 bg-gr-raised rounded">
                      <div
                        className={`h-full rounded ${isFocus ? 'bg-gr-accent-hover' : 'bg-gr-subtle'}`}
                        style={{ width: `${sr.extendedSizesPct}%` }}
                      />
                    </div>
                    <div className={`w-14 text-right text-sm font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-muted'}`}>
                      {sr.extendedSizesPct}%
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="mt-4 text-xs text-gr-subtle">
            % of styles offered in 2XL or larger.
          </p>
        </div>
      </section>

      {/* Gender split */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-6">Gender Split</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {mixOrder.map((slug) => {
            const m = data.mix[slug];
            const g = m.genderSplit;
            const isFocus = slug === focus;
            return (
              <div
                key={slug}
                className={`p-4 rounded-md border ${
                  isFocus
                    ? 'bg-gradient-to-br from-gr-accent-soft to-gr-raised border-gr-accent-soft'
                    : 'bg-gr-bg border-gr-border'
                }`}
              >
                <div className={`text-sm font-semibold mb-2 ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                  {data.brand_names[slug]}
                </div>
                <div className="flex h-6 rounded overflow-hidden">
                  <div className="bg-blue-400" style={{ width: `${g.mens || 0}%` }} title={`mens ${g.mens || 0}%`} />
                  <div className="bg-rose-400" style={{ width: `${g.womens || 0}%` }} title={`womens ${g.womens || 0}%`} />
                  <div className="bg-gr-subtle" style={{ width: `${g.unisex || 0}%` }} title={`unisex ${g.unisex || 0}%`} />
                </div>
                <div className="flex justify-between text-xs text-gr-muted mt-2">
                  <span>M {Math.round(g.mens || 0)}%</span>
                  <span>W {Math.round(g.womens || 0)}%</span>
                  <span>U {Math.round(g.unisex || 0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Price positioning */}
      {allCategories.size > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-2">Price Positioning</h2>
          <p className="text-sm text-gr-subtle mb-6">Average price by category, per brand.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-gr-muted">
                  <th className="py-2 pr-4 text-left font-medium">Category</th>
                  {mixOrder.filter((s) => data.mix[s].pricePositioning).map((slug) => (
                    <th
                      key={slug}
                      className={`py-2 px-3 text-right font-medium ${
                        slug === focus ? 'text-gr-accent' : ''
                      }`}
                    >
                      {data.brand_names[slug]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from(allCategories).sort().map((cat) => (
                  <tr key={cat} className="border-b border-gr-border">
                    <td className="py-2 pr-4 text-gr-text capitalize font-medium">{cat.replace('_', ' ')}</td>
                    {mixOrder
                      .filter((s) => data.mix[s].pricePositioning)
                      .map((slug) => {
                        const pp = data.mix[slug].pricePositioning?.[cat];
                        const isFocus = slug === focus;
                        if (!pp) {
                          return (
                            <td key={slug} className="py-2 px-3 text-right text-gr-subtle">
                              —
                            </td>
                          );
                        }
                        return (
                          <td
                            key={slug}
                            className={`py-2 px-3 text-right ${
                              isFocus ? 'font-bold text-gr-accent' : 'text-gr-muted'
                            }`}
                            title={`min ${formatMoney(pp.min)} · max ${formatMoney(pp.max)} · n=${pp.count}`}
                          >
                            {formatMoney(pp.avg)}
                          </td>
                        );
                      })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="bg-gradient-to-br from-gr-accent to-gr-accent rounded-md p-8 text-gr-text">
        <h2 className="text-xl font-bold mb-3">Read of the data</h2>
        <ul className="space-y-2 text-sm text-gr-accent-soft">
          {(() => {
            const focusMix = data.mix[focus];
            if (!focusMix) return <li>No data yet for {focus}.</li>;
            const lines: string[] = [];
            const sr = focusMix.sizeRange;
            const cd = focusMix.colorDepth;
            if (sr) lines.push(`Gymreapers offers extended sizes (2XL+) on ${sr.extendedSizesPct}% of styles.`);
            if (cd) lines.push(`Avg ${cd.avgColorsPerStyle.toFixed(1)} colors per style across ${cd.uniqueColors} unique colors.`);
            const topCat = Object.entries(focusMix.categoryMix).sort((a, b) => b[1] - a[1])[0];
            if (topCat) lines.push(`Heaviest in ${topCat[0].replace('_', ' ')} at ${topCat[1]}% of catalog.`);
            return lines.map((l, i) => <li key={i}>· {l}</li>);
          })()}
        </ul>
      </section>
    </div>
  );
}
