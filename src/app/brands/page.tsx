'use client';

import { Card, Text, BarChart, Metric } from '@tremor/react';
import { getBrands, formatCategory } from '@/lib/data';
import Link from 'next/link';

/**
 * Brand Comparison Page
 * Story: "How do brands position their assortments differently?"
 *
 * SWD Principles applied:
 * - Lead with the insight, not the data
 * - Use percentage-based comparison for fair analysis
 * - Highlight the meaningful differences
 */

export default function BrandsPage() {
  const brands = getBrands();

  // Calculate category percentages for each brand
  const categoryMixData = brands
    .sort((a, b) => b.total - a.total)
    .map((brand) => {
      const total = brand.total;
      return {
        name: brand.name,
        Bottoms: Math.round(((brand.categories.bottoms || 0) / total) * 100),
        Tops: Math.round(((brand.categories.tops || 0) / total) * 100),
        Outerwear: Math.round(((brand.categories.outerwear || 0) / total) * 100),
        'Sports Bras': Math.round(((brand.categories.sports_bras || 0) / total) * 100),
        Other: Math.round(((brand.categories.other || 0) / total) * 100),
      };
    });

  // Find the most bottoms-focused brand
  const bottomsFocused = [...brands].sort(
    (a, b) =>
      (b.categories.bottoms || 0) / b.total -
      (a.categories.bottoms || 0) / a.total
  )[0];
  const bottomsPct = Math.round(
    ((bottomsFocused.categories.bottoms || 0) / bottomsFocused.total) * 100
  );


  return (
    <div className="space-y-12">
      {/* Context */}
      <div className="max-w-3xl">
        <Text className="text-gr-accent uppercase tracking-wider text-sm mb-2">
          Brand Comparison
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-gr-text mb-4">
          How Brands Position Their Assortments
        </h1>
        <p className="text-gr-muted text-lg leading-relaxed">
          Catalog size tells you how big a brand is. Category mix tells you{' '}
          <span className="text-gr-text">what they prioritize</span>.
          Here&apos;s how the top athleisure brands allocate their product investments.
        </p>
      </div>

      {/* Lead Insight */}
      <Card className="bg-gradient-to-r from-gr-accent-soft to-gr-raised border-gr-accent-soft ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-gr-subtle mb-2">The key finding</Text>
            <h2 className="text-2xl md:text-3xl font-bold text-gr-text mb-3">
              Bottoms dominate every brand&apos;s catalog
            </h2>
            <p className="text-gr-muted">
              <span className="text-gr-text font-semibold">{bottomsFocused.name}</span> is most
              bottoms-focused at <span className="text-gr-accent font-semibold">{bottomsPct}%</span> of
              their catalog. Across all brands, bottoms average 40% of assortment—
              the biggest category investment.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-gr-accent text-5xl font-bold">
              {bottomsPct}%
            </Metric>
            <Text className="text-gr-subtle">bottoms focus</Text>
          </div>
        </div>
      </Card>

      {/* Main Comparison Chart */}
      <div>
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Category Mix by Brand
        </h2>
        <Text className="text-gr-muted mb-6">
          Percentage of catalog in each category (stacked to 100%)
        </Text>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <BarChart
            data={categoryMixData}
            index="name"
            categories={['Bottoms', 'Tops', 'Outerwear', 'Sports Bras', 'Other']}
            colors={['blue', 'emerald', 'amber', 'violet', 'gray']}
            layout="vertical"
            stack
            className="h-96"
            showAnimation
            showGridLines={false}
            valueFormatter={(v) => `${v}%`}
          />
        </Card>

        {/* Legend with explanation */}
        <div className="mt-6 flex flex-wrap gap-6">
          {[
            { label: 'Bottoms', color: 'bg-blue-500', desc: 'Leggings, joggers, shorts, pants' },
            { label: 'Tops', color: 'bg-emerald-500', desc: 'Tees, tanks, long sleeves' },
            { label: 'Outerwear', color: 'bg-amber-500', desc: 'Hoodies, jackets, pullovers' },
            { label: 'Sports Bras', color: 'bg-violet-500', desc: 'Bras and bralettes' },
            { label: 'Other', color: 'bg-gray-400', desc: 'Accessories, dresses, etc.' },
          ].map(({ label, color, desc }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-gr-muted text-sm">{label}</span>
              <span className="text-gr-subtle text-xs">({desc})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brand-specific callouts */}
      <div>
        <h2 className="text-xl font-semibold text-gr-text mb-6">
          Brand Positioning Highlights
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.slice(0, 6).map((brand) => {
            // Find their strongest category
            const sorted = Object.entries(brand.categories)
              .filter(([k]) => k !== 'other')
              .sort((a, b) => b[1] - a[1]);
            const [topCat, topCount] = sorted[0] || ['bottoms', 0];
            const topPct = Math.round((topCount / brand.total) * 100);

            // Find what they're weak in
            const weakest = sorted[sorted.length - 1];
            const [weakCat, weakCount] = weakest || ['accessories', 0];
            const weakPct = Math.round((weakCount / brand.total) * 100);

            return (
              <Link key={brand.slug} href={`/brand/${brand.slug}`}>
                <Card className="bg-gr-surface border-gr-border ring-0 hover:border-gr-accent-soft transition-colors h-full">
                  <Text className="text-gr-subtle text-sm">{brand.total.toLocaleString()} products</Text>
                  <h3 className="text-gr-text font-semibold text-lg mt-1">{brand.name}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gr-subtle">Strongest:</span>
                      <span className="text-gr-success">
                        {formatCategory(topCat)} ({topPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gr-subtle">Gap:</span>
                      <span className="text-gr-subtle">
                        {formatCategory(weakCat)} ({weakPct}%)
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Strategic Takeaway */}
      <Card className="bg-gr-surface border-gr-border ring-0">
        <h3 className="text-gr-text font-semibold text-lg mb-3">What this means for strategy</h3>
        <div className="space-y-3 text-gr-muted">
          <p>
            <span className="text-gr-text">Bottoms are table stakes.</span> Every brand invests heavily
            here because it&apos;s where customers start their athleisure journey.
          </p>
          <p>
            <span className="text-gr-text">Tops and outerwear differentiate.</span> Brands like Gymshark
            lean into tops (28% of catalog) while Vuori invests more in outerwear.
          </p>
          <p>
            <span className="text-gr-text">Sports bras signal womens&apos; focus.</span> Alo and Lululemon
            show higher sports bra allocations, reflecting their womens-first positioning.
          </p>
        </div>
      </Card>
    </div>
  );
}
