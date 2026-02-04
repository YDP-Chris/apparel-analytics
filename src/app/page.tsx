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

  return (
    <div className="space-y-12">
      {/* Context: What is this and why should I care? */}
      <div className="max-w-3xl">
        <Text className="text-cyan-400 uppercase tracking-wider text-sm mb-2">
          Competitive Intelligence Report
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
          The Premium Athleisure Landscape
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          We tracked <span className="text-white font-semibold">{totalProducts.toLocaleString()} products</span> across{' '}
          <span className="text-white font-semibold">6 major athleisure brands</span> to understand
          how competitors position their assortments. Here&apos;s what the data reveals.
        </p>
      </div>

      {/* The Big Insight - What's the ONE thing to remember? */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-900/50 border-gray-800 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-gray-400 mb-2">The headline</Text>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Gymshark leads with the largest catalog—
              <span className="text-amber-400">3,581 products</span>
            </h2>
            <p className="text-gray-400">
              That&apos;s <span className="text-white">40x</span> the size of Ten Thousand&apos;s focused 88-product lineup,
              and <span className="text-white">48%</span> larger than Alo Yoga.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-amber-400 text-5xl md:text-6xl font-bold">
              12K+
            </Metric>
            <Text className="text-gray-500">products tracked</Text>
          </div>
        </div>
      </Card>

      {/* Primary Visual: Simple horizontal bar chart */}
      {/* Cole's principle: Let the data speak, remove gridlines and chartjunk */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Catalog Size Comparison
        </h2>
        <Text className="text-gray-400 mb-6">
          Products tracked from each brand&apos;s sitemap
        </Text>

        <Card className="bg-gray-900 border-gray-800 ring-0">
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
        <h2 className="text-xl font-semibold text-white mb-2">
          What This Means
        </h2>
        <Text className="text-gray-400 mb-6">
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
          <Card className="bg-gray-900 border-gray-800 ring-0 hover:border-cyan-800 transition-colors h-full">
            <Text className="text-gray-400 group-hover:text-cyan-400 transition-colors">
              Next: Compare Brands
            </Text>
            <h3 className="text-white font-semibold mt-1 group-hover:text-cyan-300 transition-colors">
              See how brands allocate across categories →
            </h3>
            <Text className="text-gray-500 mt-2 text-sm">
              Who focuses on bottoms? Who leads in outerwear?
            </Text>
          </Card>
        </Link>

        <Link href="/categories" className="group">
          <Card className="bg-gray-900 border-gray-800 ring-0 hover:border-cyan-800 transition-colors h-full">
            <Text className="text-gray-400 group-hover:text-cyan-400 transition-colors">
              Dive Deeper
            </Text>
            <h3 className="text-white font-semibold mt-1 group-hover:text-cyan-300 transition-colors">
              Explore by category →
            </h3>
            <Text className="text-gray-500 mt-2 text-sm">
              Bottoms, tops, outerwear, and more
            </Text>
          </Card>
        </Link>

        <Link href="/subcategories" className="group">
          <Card className="bg-gray-900 border-gray-800 ring-0 hover:border-cyan-800 transition-colors h-full">
            <Text className="text-gray-400 group-hover:text-cyan-400 transition-colors">
              Get Specific
            </Text>
            <h3 className="text-white font-semibold mt-1 group-hover:text-cyan-300 transition-colors">
              Subcategory battles →
            </h3>
            <Text className="text-gray-500 mt-2 text-sm">
              Joggers vs leggings, tanks vs tees
            </Text>
          </Card>
        </Link>
      </div>

      {/* Data Table - For those who want the details */}
      <details className="group">
        <summary className="cursor-pointer text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          <span>View detailed brand data</span>
          <span className="text-xs">▼</span>
        </summary>

        <Card className="bg-gray-900 border-gray-800 ring-0 mt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Brand</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Bottoms</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Tops</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Outerwear</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.slug} className="border-b border-gray-800/50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/brand/${brand.slug}`}
                        className="text-white hover:text-cyan-400 transition-colors"
                      >
                        {brand.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-white">
                      {brand.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {(brand.categories.bottoms || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {(brand.categories.tops || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400">
                      {(brand.categories.outerwear || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </details>
    </div>
  );
}
