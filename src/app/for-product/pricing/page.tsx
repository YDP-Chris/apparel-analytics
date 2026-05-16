'use client';

import { useGymreapersData } from '../../gymreapers/_lib/GymreapersProvider';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { useHiddenBrands } from '@/components/useHiddenBrands';
import { BrandHideButton, HiddenBrandsBanner } from '@/components/BrandVisibilityControls';

function fmtPrice(p: number | null | undefined): string {
  if (p == null || isNaN(p)) return '—';
  return `$${p.toFixed(0)}`;
}

export default function PricingMapPage() {
  const { data } = useGymreapersData();
  const { isHidden } = useHiddenBrands();
  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  // Collect every category that has price positioning data for any brand
  const allCategories = new Set<string>();
  Object.values(data.mix || {}).forEach((m) => {
    Object.keys(m.pricePositioning || {}).forEach((c) => allCategories.add(c));
  });
  const categories = Array.from(allCategories).sort();

  // Brands sorted: focus first, then by total products desc.
  // Focus brand (gymreapers) is always visible regardless of hidden state.
  const brandsAll = data.brand_order.filter((s) => data.mix?.[s]?.pricePositioning);
  const brands = brandsAll.filter((s) => s === 'gymreapers' || !isHidden(s));
  const allBrandsForBanner = brandsAll.map((slug) => ({ slug, name: data.brand_names[slug] || slug }));

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Pricing Map
          </p>
          <ConfidenceBadge source="shopify_catalog" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Where each brand prices
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Average price by category for every brand we scrape Shopify catalogs from. Higher numbers
          mean premium positioning. Empty cells mean the brand doesn&apos;t carry that category or
          we can&apos;t scrape their pricing yet (some use <GlossaryTerm id="akamai">Akamai</GlossaryTerm> bot
          detection).
        </p>
      </header>

      <HiddenBrandsBanner brands={allBrandsForBanner} />

      <SectionExplainer
        what="A grid of average price per category for every brand we can scrape pricing from."
        howToRead="Read across a row to compare brands inside one category. Hover a cell to see the min/max/sample size behind the average. The Gymreapers column is highlighted in accent red."
        whatToDo="If we're materially below a peer we consider a direct competitor, ask whether we're discounting unnecessarily. If we're above, the assortment had better earn the premium."
      />

      {brands.length === 0 ? (
        <div className="bg-gr-surface rounded-md p-8 border border-gr-border text-center text-gr-muted">
          No pricing data captured yet today. Most strength brands sync at the 4 AM Tue-Sat cron.
        </div>
      ) : (
        <section className="bg-gr-surface rounded-md border border-gr-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                <th className="py-3 px-6 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Category</th>
                {brands.map((slug) => (
                  <th
                    key={slug}
                    className={`py-3 px-3 text-right font-bold text-[11px] uppercase tracking-[0.15em] ${
                      slug === 'gymreapers' ? 'text-gr-accent' : 'text-gr-subtle'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1 justify-end">
                      {data.brand_names[slug]}
                      {slug !== 'gymreapers' && <BrandHideButton slug={slug} name={data.brand_names[slug] || slug} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat} className={`border-b border-gr-border last:border-0 ${i % 2 === 1 ? 'bg-gr-bg/20' : ''}`}>
                  <td className="py-3 px-6 text-gr-text capitalize font-semibold">{cat.replace('_', ' ')}</td>
                  {brands.map((slug) => {
                    const pp = data.mix[slug]?.pricePositioning?.[cat];
                    const isGR = slug === 'gymreapers';
                    if (!pp) {
                      return <td key={slug} className="py-3 px-3 text-right text-gr-subtle">—</td>;
                    }
                    return (
                      <td
                        key={slug}
                        className={`py-3 px-3 text-right tabular-nums ${isGR ? 'font-bold text-gr-accent' : 'text-gr-muted'}`}
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

      <div className="text-xs text-gr-subtle leading-relaxed">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.brand_mix.price_positioning</code> · Updated daily.
        Lululemon, Alo, Vuori show sitemap-only data (no pricing) — their Shopify is proxy-blocked.
      </div>
    </div>
  );
}
