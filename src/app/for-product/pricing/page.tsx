'use client';

import { useGymreapersData } from '../../gymreapers/_lib/GymreapersProvider';

function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '—';
  return `$${p.toFixed(0)}`;
}

export default function PricingMapPage() {
  const { data } = useGymreapersData();
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  // Collect every category that has price positioning data for any brand
  const allCategories = new Set<string>();
  Object.values(data.mix || {}).forEach((m) => {
    Object.keys(m.pricePositioning || {}).forEach((c) => allCategories.add(c));
  });
  const categories = Array.from(allCategories).sort();

  // Brands sorted: focus first, then by total products desc
  const brands = data.brand_order.filter((s) => data.mix?.[s]?.pricePositioning);

  return (
    <div className="space-y-8">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Product · Pricing Map
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Where each brand prices across categories</h1>
        <p className="text-gr-muted mt-2 max-w-3xl">
          Average price by category for every brand we scrape Shopify catalogs from. Bigger numbers
          mean premium positioning. Empty cells mean the brand doesn&apos;t carry that category or
          we can&apos;t scrape their pricing yet.
        </p>
      </header>

      {brands.length === 0 ? (
        <div className="bg-gr-surface rounded-md p-8 border border-gr-border text-center text-gr-muted">
          No pricing data captured yet today. Most strength brands sync at the 4 AM Tue-Sat cron.
        </div>
      ) : (
        <section className="bg-gr-surface rounded-md p-6 border border-gr-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gr-border text-left">
                <th className="py-2 pr-4 font-medium text-gr-muted">Category</th>
                {brands.map((slug) => (
                  <th
                    key={slug}
                    className={`py-2 px-3 text-right font-medium ${
                      slug === 'gymreapers' ? 'text-gr-accent' : 'text-gr-muted'
                    }`}
                  >
                    {data.brand_names[slug]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-b border-gr-border">
                  <td className="py-2 pr-4 text-gr-text capitalize font-medium">{cat.replace('_', ' ')}</td>
                  {brands.map((slug) => {
                    const pp = data.mix[slug]?.pricePositioning?.[cat];
                    const isGR = slug === 'gymreapers';
                    if (!pp) {
                      return <td key={slug} className="py-2 px-3 text-right text-gr-subtle">—</td>;
                    }
                    return (
                      <td
                        key={slug}
                        className={`py-2 px-3 text-right ${isGR ? 'font-bold text-gr-accent' : 'text-gr-muted'}`}
                        title={`min ${fmtPrice(pp.min)} · max ${fmtPrice(pp.max)} · n=${pp.count}`}
                      >
                        {fmtPrice(pp.avg)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.brand_mix.price_positioning</code> · Updated daily.
        Lululemon, Alo, Vuori show sitemap-only data (no pricing) — their Shopify is proxy-blocked.
      </div>
    </div>
  );
}
