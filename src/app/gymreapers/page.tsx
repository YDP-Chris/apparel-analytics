'use client';

import { useGymreapersData } from './_lib/GymreapersProvider';

export default function GymreapersScorecardPage() {
  const { data, loading, error } = useGymreapersData();

  if (loading && !data) return <div className="text-center py-20 text-gr-subtle">Loading scorecard...</div>;
  if (error && !data) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-gr-text mb-3">Could not load report</h1>
        <p className="text-gr-muted">{error}</p>
      </div>
    );
  }
  if (!data) return null;

  const focusBrand = data.brands[data.focus_brand];
  const competitors = data.brand_order.filter((s) => s !== data.focus_brand);
  const sortedCompetitors = competitors
    .map((slug) => data.brands[slug])
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const topCategories = Object.entries(data.byCategory)
    .map(([cat, brands]) => ({ cat, total: Object.values(brands).reduce((s, n) => s + n, 0), brands }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const trendsList = Object.entries(data.trends || {})
    .map(([slug, t]) => ({ slug, name: data.brand_names[slug] || slug, ...t }))
    .filter((t) => typeof t.current === 'number');

  return (
    <div className="space-y-10">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Catalog Scorecard
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Where Does Gymreapers Stand?</h1>
        <p className="text-gr-muted mt-3 max-w-3xl text-lg leading-relaxed">
          Tracking{' '}
          <span className="font-semibold text-gr-text">
            {focusBrand?.total.toLocaleString() || 0}
          </span>{' '}
          Gymreapers products against{' '}
          <span className="font-semibold text-gr-text">
            {data.totals.competitor_products.toLocaleString()}
          </span>{' '}
          from {competitors.length} strength competitors. Gymreapers represents{' '}
          <span className="font-semibold text-gr-accent">
            {data.totals.gymreapers_share_pct}%
          </span>{' '}
          of the strength apparel landscape we track.
        </p>
      </header>

      {focusBrand && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Products', value: focusBrand.total.toLocaleString(), context: 'in catalog' },
            { label: 'Styles', value: focusBrand.uniqueStyles.toLocaleString(), context: 'unique product lines' },
            { label: 'Color Coverage', value: `${focusBrand.colorCoverage}%`, context: 'products with color data' },
            { label: 'Colors/Style', value: focusBrand.avgColorsPerStyle.toFixed(1), context: 'avg variants' },
          ].map((stat) => (
            <div key={stat.label} className="bg-gr-surface rounded-md p-6 border border-gr-border">
              <p className="text-sm text-gr-subtle font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gr-text mt-1">{stat.value}</p>
              <p className="text-xs text-gr-subtle mt-1">{stat.context}</p>
            </div>
          ))}
        </section>
      )}

      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-6">Catalog Size — Head to Head</h2>
        <div className="space-y-3">
          {[focusBrand, ...sortedCompetitors].filter(Boolean).map((brand) => {
            const max = Math.max(...data.brand_order.map((s) => data.brands[s]?.total || 0), 1);
            const isFocus = brand.slug === data.focus_brand;
            const width = (brand.total / max) * 100;
            return (
              <div
                key={brand.slug}
                className={`flex items-center gap-4 p-4 rounded-md ${
                  isFocus
                    ? 'bg-gradient-to-r from-gr-accent-soft to-gr-raised border-2 border-gr-accent-soft'
                    : 'bg-gr-bg'
                }`}
              >
                <div className="w-36 flex-shrink-0">
                  <span className={`font-semibold ${isFocus ? 'text-gr-accent' : 'text-gr-muted'}`}>
                    {isFocus && '→ '}
                    {brand.name}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-gr-raised rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${
                        isFocus
                          ? 'bg-gradient-to-r from-gr-accent-hover to-gr-accent'
                          : 'bg-gr-subtle'
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span className={`text-lg font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-muted'}`}>
                    {brand.total.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {topCategories.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Category Mix Across Brands</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-gr-muted text-left">
                  <th className="py-2 pr-4 font-medium">Category</th>
                  {data.brand_order.map((slug) => (
                    <th
                      key={slug}
                      className={`py-2 px-2 text-right font-medium ${
                        slug === data.focus_brand ? 'text-gr-accent' : ''
                      }`}
                    >
                      {data.brand_names[slug]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCategories.map(({ cat, brands }) => (
                  <tr key={cat} className="border-b border-gr-border">
                    <td className="py-2 pr-4 text-gr-text font-medium capitalize">{cat}</td>
                    {data.brand_order.map((slug) => (
                      <td
                        key={slug}
                        className={`py-2 px-2 text-right ${
                          slug === data.focus_brand
                            ? 'font-bold text-gr-accent'
                            : 'text-gr-muted'
                        }`}
                      >
                        {brands[slug] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {trendsList.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Search Interest (Google Trends)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {trendsList.map((t) => {
              const wow = t.wow_change ?? 0;
              const isFocus = t.slug === data.focus_brand;
              return (
                <div
                  key={t.slug}
                  className={`p-4 rounded-md border ${
                    isFocus
                      ? 'bg-gradient-to-br from-gr-accent-soft to-gr-raised border-gr-accent-soft'
                      : 'bg-gr-bg border-gr-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                      {t.name}
                    </span>
                    <span className="text-2xl font-bold text-gr-text">{t.current ?? '—'}</span>
                  </div>
                  <div className="mt-2 text-xs text-gr-muted">
                    WoW{' '}
                    <span className={wow >= 0 ? 'text-gr-success' : 'text-gr-danger'}>
                      {wow >= 0 ? '+' : ''}
                      {wow.toFixed(1)}%
                    </span>
                    {typeof t.mom_change === 'number' && (
                      <>
                        {'  ·  '}
                        MoM{' '}
                        <span className={t.mom_change >= 0 ? 'text-gr-success' : 'text-gr-danger'}>
                          {t.mom_change >= 0 ? '+' : ''}
                          {t.mom_change.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.news && data.news.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Recent News</h2>
          <ul className="space-y-3">
            {data.news.slice(-15).reverse().map((item, i) => (
              <li key={i} className="border-b border-gr-border pb-3 last:border-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gr-text hover:text-gr-accent font-medium"
                >
                  {item.title}
                </a>
                <div className="text-xs text-gr-subtle mt-1">
                  {item.company || item.company_id}
                  {item.date && ` · ${item.date}`}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
