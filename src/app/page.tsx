'use client';

import { Card, BarChart, Text, Metric } from '@tremor/react';
import { getData, getBrands } from '@/lib/data';
import InsightCard from '@/components/InsightCard';
import Link from 'next/link';

/**
 * Home Page - Following Cole Nussbaumer Knaflic's "Storytelling with Data" principles:
 * 1. Understand context - Who is the audience? What do they need to know?
 * 2. Choose appropriate visuals - Simple charts that serve the story
 * 3. Eliminate clutter - Remove chartjunk, unnecessary elements
 * 4. Focus attention - Use preattentive attributes strategically
 * 5. Tell a story - Clear narrative arc with beginning, middle, end
 */

export default function HomePage() {
  const data = getData();
  const brands = getBrands();

  // Single focused chart: Who has the largest catalog?
  // Sorted horizontal bar - easy to compare, no legend needed
  const catalogData = brands
    .sort((a, b) => b.total - a.total)
    .map((brand) => ({
      name: brand.name,
      'Products': brand.total,
    }));

  // The "big number" that matters
  const totalProducts = data.totals.products;
  const brandCount = brands.length;

  return (
    <div className="space-y-12">
      {/* Context: What is this and why should I care? */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Competitive Intelligence Report
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          The Premium Athleisure Landscape
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          We tracked <span className="text-socal-stone-700 font-semibold">{totalProducts.toLocaleString()} products</span> across{' '}
          <span className="text-socal-stone-700 font-semibold">{brandCount} premium athleisure brands</span> to understand
          how competitors position their assortments. Here&apos;s what the data reveals.
        </p>
      </div>

      {/* The Big Insight - Vuori's unique positioning */}
      <Card className="bg-gradient-to-r from-socal-sand-50 to-socal-ocean-50 border-socal-sand-200 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-socal-stone-400 mb-2">The headline</Text>
            <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
              Vuori stands alone with{' '}
              <span className="text-socal-ocean-600">balanced gender positioning</span>
            </h2>
            <p className="text-socal-stone-500">
              While Alo skews <span className="text-socal-stone-700">82% women&apos;s</span> and
              Gymshark leans <span className="text-socal-stone-700">55% men&apos;s</span>,
              Vuori maintains a <span className="text-socal-stone-700">48/52 split</span>—capturing both markets.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-socal-ocean-600 text-5xl md:text-6xl font-bold">
              {Math.round(totalProducts / 1000)}K+
            </Metric>
            <Text className="text-socal-stone-400">products tracked</Text>
          </div>
        </div>
      </Card>

      {/* Primary Visual: Simple horizontal bar chart */}
      {/* Cole's principle: Let the data speak, remove gridlines and chartjunk */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Catalog Size Comparison
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Products tracked from each brand&apos;s sitemap
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={catalogData}
            index="name"
            categories={['Products']}
            colors={['cyan']}
            layout="vertical"
            className="h-80"
            showAnimation
            showGridLines={false}
            showLegend={false}
            valueFormatter={(v) => v.toLocaleString()}
          />
        </Card>
      </div>

      {/* Strategic Insights - What actions should this inform? */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          What This Means
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Key patterns that inform competitive strategy
        </Text>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.insights.slice(0, 4).map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </div>

      {/* Call to Action: Where to go deeper */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/brands" className="group">
          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft hover:border-socal-ocean-300 transition-colors h-full">
            <Text className="text-socal-stone-400 group-hover:text-socal-ocean-600 transition-colors">
              Next: Compare Brands
            </Text>
            <h3 className="text-socal-stone-700 font-semibold mt-1 group-hover:text-socal-ocean-700 transition-colors">
              See how brands allocate across categories →
            </h3>
            <Text className="text-socal-stone-400 mt-2 text-sm">
              Who focuses on bottoms? Who leads in outerwear?
            </Text>
          </Card>
        </Link>

        <Link href="/categories" className="group">
          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft hover:border-socal-ocean-300 transition-colors h-full">
            <Text className="text-socal-stone-400 group-hover:text-socal-ocean-600 transition-colors">
              Dive Deeper
            </Text>
            <h3 className="text-socal-stone-700 font-semibold mt-1 group-hover:text-socal-ocean-700 transition-colors">
              Explore by category →
            </h3>
            <Text className="text-socal-stone-400 mt-2 text-sm">
              Bottoms, tops, outerwear, and more
            </Text>
          </Card>
        </Link>

        <Link href="/subcategories" className="group">
          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft hover:border-socal-ocean-300 transition-colors h-full">
            <Text className="text-socal-stone-400 group-hover:text-socal-ocean-600 transition-colors">
              Get Specific
            </Text>
            <h3 className="text-socal-stone-700 font-semibold mt-1 group-hover:text-socal-ocean-700 transition-colors">
              Subcategory battles →
            </h3>
            <Text className="text-socal-stone-400 mt-2 text-sm">
              Joggers vs leggings, tanks vs tees
            </Text>
          </Card>
        </Link>
      </div>

      {/* Data Table - For those who want the details */}
      <details className="group">
        <summary className="cursor-pointer text-socal-stone-500 hover:text-socal-stone-700 transition-colors flex items-center gap-2">
          <span>View detailed brand data</span>
          <span className="text-xs">▼</span>
        </summary>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-socal-sand-200">
                  <th className="text-left py-3 px-4 text-socal-stone-500 font-medium">Brand</th>
                  <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">Men&apos;s</th>
                  <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">Women&apos;s</th>
                  <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">Bottoms</th>
                  <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">Tops</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => {
                  const mensPct = Math.round(((brand.genders?.mens || 0) / brand.total) * 100);
                  const womensPct = Math.round(((brand.genders?.womens || 0) / brand.total) * 100);
                  return (
                    <tr key={brand.slug} className={`border-b border-socal-sand-100 ${brand.slug === 'vuori' ? 'bg-socal-ocean-50' : ''}`}>
                      <td className="py-3 px-4">
                        <Link
                          href={`/brand/${brand.slug}`}
                          className={`hover:text-socal-ocean-600 transition-colors ${brand.slug === 'vuori' ? 'text-socal-ocean-700 font-semibold' : 'text-socal-stone-700'}`}
                        >
                          {brand.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-socal-stone-700">
                        {brand.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-500">
                        {mensPct}%
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-500">
                        {womensPct}%
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-500">
                        {(brand.categories.bottoms || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-500">
                        {(brand.categories.tops || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </details>
    </div>
  );
}
