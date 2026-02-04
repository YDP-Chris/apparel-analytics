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
        <Text className="text-cyan-400 uppercase tracking-wider text-sm mb-2">
          Brand Comparison
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          How Brands Position Their Assortments
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Catalog size tells you how big a brand is. Category mix tells you{' '}
          <span className="text-white">what they prioritize</span>.
          Here&apos;s how the top athleisure brands allocate their product investments.
        </p>
      </div>

      {/* Lead Insight */}
      <Card className="bg-gradient-to-r from-blue-900/20 to-blue-900/5 border-blue-800/50 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-gray-400 mb-2">The key finding</Text>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Bottoms dominate every brand&apos;s catalog
            </h2>
            <p className="text-gray-400">
              <span className="text-white font-semibold">{bottomsFocused.name}</span> is most
              bottoms-focused at <span className="text-blue-400 font-semibold">{bottomsPct}%</span> of
              their catalog. Across all brands, bottoms average 40% of assortment—
              the biggest category investment.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-blue-400 text-5xl font-bold">
              {bottomsPct}%
            </Metric>
            <Text className="text-gray-500">bottoms focus</Text>
          </div>
        </div>
      </Card>

      {/* Main Comparison Chart */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Category Mix by Brand
        </h2>
        <Text className="text-gray-400 mb-6">
          Percentage of catalog in each category (stacked to 100%)
        </Text>

        <Card className="bg-gray-900 border-gray-800 ring-0">
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
            { label: 'Other', color: 'bg-gray-500', desc: 'Accessories, dresses, etc.' },
          ].map(({ label, color, desc }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${color}`} />
              <span className="text-gray-300 text-sm">{label}</span>
              <span className="text-gray-500 text-xs">({desc})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brand-specific callouts */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
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
                <Card className="bg-gray-900 border-gray-800 ring-0 hover:border-cyan-800 transition-colors h-full">
                  <Text className="text-gray-400 text-sm">{brand.total.toLocaleString()} products</Text>
                  <h3 className="text-white font-semibold text-lg mt-1">{brand.name}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Strongest:</span>
                      <span className="text-emerald-400">
                        {formatCategory(topCat)} ({topPct}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Gap:</span>
                      <span className="text-gray-500">
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
      <Card className="bg-gray-900 border-gray-800 ring-0">
        <h3 className="text-white font-semibold text-lg mb-3">What this means for strategy</h3>
        <div className="space-y-3 text-gray-400">
          <p>
            <span className="text-white">Bottoms are table stakes.</span> Every brand invests heavily
            here because it&apos;s where customers start their athleisure journey.
          </p>
          <p>
            <span className="text-white">Tops and outerwear differentiate.</span> Brands like Gymshark
            lean into tops (28% of catalog) while Vuori invests more in outerwear.
          </p>
          <p>
            <span className="text-white">Sports bras signal womens&apos; focus.</span> Alo and Lululemon
            show higher sports bra allocations, reflecting their womens-first positioning.
          </p>
        </div>
      </Card>
    </div>
  );
}
