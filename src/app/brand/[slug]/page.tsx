import { Card, Text, Metric } from '@tremor/react';
import { getBrand, getBrands, formatCategory, formatSubcategory, getMarketAverage, getBrandIndex, getData } from '@/lib/data';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BrandCategoryDonut, BrandSubcategoryBar } from '@/components/charts/BrandCharts';

/**
 * Brand Detail Page
 * Story: "Deep dive into [Brand]: What do they prioritize?"
 *
 * SWD Principles:
 * - Tell the brand's story through their data
 * - Compare to market to give context
 * - Highlight what makes them unique
 */

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const data = getData();
  return Object.keys(data.brands).map((slug) => ({ slug }));
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = getBrand(slug);

  if (!brand) {
    notFound();
  }

  const allBrands = getBrands();

  // Category breakdown for donut
  const categoryData = Object.entries(brand.categories)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({
      name: formatCategory(cat),
      value: count,
    }));

  // Top subcategories for bar chart
  const topSubcats = Object.entries(brand.subcategories)
    .filter(([k]) => k !== 'other')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([subcat, count]) => ({
      name: formatSubcategory(subcat),
      Products: count,
    }));

  // Calculate rank
  const sortedBySize = allBrands.sort((a, b) => b.total - a.total);
  const rank = sortedBySize.findIndex((b) => b.slug === slug) + 1;

  // Find what they're strong in (high index subcategories)
  const strongSubcats = Object.entries(brand.subcategories)
    .filter(([k]) => k !== 'other')
    .map(([subcat, count]) => ({
      subcat,
      count,
      index: getBrandIndex(slug, subcat),
    }))
    .filter((s) => s.index > 120)
    .sort((a, b) => b.index - a.index)
    .slice(0, 3);

  // Find gaps (low index)
  const gaps = Object.entries(brand.subcategories)
    .filter(([k]) => k !== 'other')
    .map(([subcat, count]) => ({
      subcat,
      count,
      index: getBrandIndex(slug, subcat),
      avg: getMarketAverage(subcat),
    }))
    .filter((s) => s.index < 80 && s.avg > 50)
    .sort((a, b) => a.index - b.index)
    .slice(0, 3);

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/brands"
          className="text-socal-stone-400 hover:text-socal-ocean-600 transition-colors text-sm"
        >
          ← Back to Brand Comparison
        </Link>
      </div>

      {/* Brand Header */}
      <div className="flex flex-col md:flex-row md:items-end gap-6">
        <div className="flex-1">
          <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
            Brand Deep Dive
          </Text>
          <h1 className="text-4xl font-bold text-socal-stone-800 mb-2">{brand.name}</h1>
          <p className="text-socal-stone-500 text-lg">
            #{rank} by catalog size with{' '}
            <span className="text-socal-stone-700 font-semibold">
              {brand.total.toLocaleString()}
            </span>{' '}
            products tracked
          </p>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <Metric className="text-socal-ocean-600 text-4xl font-bold">
              {brand.total.toLocaleString()}
            </Metric>
            <Text className="text-socal-stone-400">Products</Text>
          </div>
          <div className="text-center">
            <Metric className="text-socal-stone-700 text-4xl font-bold">#{rank}</Metric>
            <Text className="text-socal-stone-400">Rank</Text>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Categories</Text>
          <div className="text-2xl font-bold text-socal-stone-700 mt-1">
            {Object.keys(brand.categories).filter((k) => brand.categories[k] > 0).length}
          </div>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Subcategories</Text>
          <div className="text-2xl font-bold text-socal-stone-700 mt-1">
            {Object.keys(brand.subcategories).filter((k) => brand.subcategories[k] > 0).length}
          </div>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Top Category</Text>
          <div className="text-2xl font-bold text-socal-stone-700 mt-1">
            {formatCategory(
              Object.entries(brand.categories).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
            )}
          </div>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Bottoms %</Text>
          <div className="text-2xl font-bold text-socal-stone-700 mt-1">
            {Math.round(((brand.categories.bottoms || 0) / brand.total) * 100)}%
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-socal-stone-700 font-semibold text-lg mb-4">
            Category Breakdown
          </h3>
          <BrandCategoryDonut data={categoryData} />
        </Card>

        {/* Top Subcategories */}
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-socal-stone-700 font-semibold text-lg mb-4">
            Top Subcategories
          </h3>
          <BrandSubcategoryBar data={topSubcats} />
        </Card>
      </div>

      {/* Strengths and Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="bg-gradient-to-br from-socal-sage-50 to-socal-sand-50 border-socal-sage-200 ring-0 shadow-soft">
          <h3 className="text-socal-stone-700 font-semibold text-lg mb-4">
            Where {brand.name} Over-Indexes
          </h3>
          {strongSubcats.length > 0 ? (
            <div className="space-y-4">
              {strongSubcats.map((s) => (
                <div key={s.subcat}>
                  <div className="flex justify-between items-center">
                    <span className="text-socal-stone-700">{formatSubcategory(s.subcat)}</span>
                    <span className="text-socal-sage-600 font-bold">{s.index}%</span>
                  </div>
                  <div className="flex justify-between text-sm text-socal-stone-400 mt-1">
                    <span>{s.count} products</span>
                    <span>vs {getMarketAverage(s.subcat)} avg</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-socal-stone-400">
              No significant over-indexing detected (&gt;120% of market average)
            </Text>
          )}
        </Card>

        {/* Gaps */}
        <Card className="bg-gradient-to-br from-socal-sunset-50 to-socal-sand-50 border-socal-sunset-200 ring-0 shadow-soft">
          <h3 className="text-socal-stone-700 font-semibold text-lg mb-4">
            Where {brand.name} Under-Indexes
          </h3>
          {gaps.length > 0 ? (
            <div className="space-y-4">
              {gaps.map((g) => (
                <div key={g.subcat}>
                  <div className="flex justify-between items-center">
                    <span className="text-socal-stone-700">{formatSubcategory(g.subcat)}</span>
                    <span className="text-socal-sunset-500 font-bold">{g.index}%</span>
                  </div>
                  <div className="flex justify-between text-sm text-socal-stone-400 mt-1">
                    <span>{g.count} products</span>
                    <span>vs {g.avg} avg</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-socal-stone-400">
              No significant gaps detected (&lt;80% of market average)
            </Text>
          )}
        </Card>
      </div>

      {/* Full Subcategory Table */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-socal-stone-700 font-semibold text-lg mb-4">
          All Subcategories
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-socal-sand-200">
                <th className="text-left py-3 px-4 text-socal-stone-500 font-medium">
                  Subcategory
                </th>
                <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">
                  Products
                </th>
                <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">
                  % of Catalog
                </th>
                <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">
                  Market Avg
                </th>
                <th className="text-right py-3 px-4 text-socal-stone-500 font-medium">
                  Index
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(brand.subcategories)
                .filter(([k]) => k !== 'other')
                .sort((a, b) => b[1] - a[1])
                .map(([subcat, count]) => {
                  const pct = Math.round((count / brand.total) * 1000) / 10;
                  const avg = getMarketAverage(subcat);
                  const index = getBrandIndex(slug, subcat);

                  return (
                    <tr key={subcat} className="border-b border-socal-sand-100">
                      <td className="py-3 px-4 text-socal-stone-700">
                        {formatSubcategory(subcat)}
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-600">
                        {count}
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-400">
                        {pct}%
                      </td>
                      <td className="py-3 px-4 text-right text-socal-stone-400">
                        {avg}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={
                            index >= 120
                              ? 'text-socal-sage-600'
                              : index <= 80
                              ? 'text-socal-sunset-500'
                              : 'text-socal-stone-400'
                          }
                        >
                          {index}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
