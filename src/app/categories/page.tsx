'use client';

import { useState } from 'react';
import { Card, Text, BarChart, Metric } from '@tremor/react';
import { formatCategory, getCategoryLeaders } from '@/lib/data';

/**
 * Category Deep Dive Page
 * Story: "Within each category, who leads and by how much?"
 *
 * SWD Principles:
 * - Let the user select their focus area
 * - Show relative comparisons, not just absolute numbers
 * - Provide context for what the numbers mean
 */

const CATEGORIES = [
  { id: 'bottoms', label: 'Bottoms', desc: 'Leggings, joggers, shorts, pants, skirts' },
  { id: 'tops', label: 'Tops', desc: 'Tees, tanks, long sleeves, crop tops' },
  { id: 'outerwear', label: 'Outerwear', desc: 'Hoodies, jackets, pullovers, quarter zips' },
  { id: 'sports_bras', label: 'Sports Bras', desc: 'Performance and lifestyle bras' },
  { id: 'dresses', label: 'Dresses', desc: 'Tennis dresses, athletic dresses' },
  { id: 'accessories', label: 'Accessories', desc: 'Socks, hats, bags, etc.' },
];

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState('bottoms');

  const leaders = getCategoryLeaders(selectedCategory);
  const totalInCategory = leaders.reduce((sum, l) => sum + l.count, 0);
  const leader = leaders[0];
  const categoryInfo = CATEGORIES.find((c) => c.id === selectedCategory);

  // Prepare chart data
  const chartData = leaders.map((l) => ({
    name: l.brand,
    Products: l.count,
  }));

  return (
    <div className="space-y-12">
      {/* Context */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Category Analysis
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Who Leads Each Category?
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Select a category to see how brands stack up.
          Larger product counts typically indicate strategic priority.
        </p>
      </div>

      {/* Category Selector */}
      <div>
        <Text className="text-socal-stone-500 mb-3">Select a category</Text>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-socal-ocean-600 text-white'
                  : 'bg-socal-sand-100 text-socal-stone-500 hover:bg-socal-sand-200 hover:text-socal-stone-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Header */}
      <Card className="bg-gradient-to-r from-socal-ocean-50 to-socal-sand-50 border-socal-ocean-200 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-socal-stone-400 mb-2">
              {formatCategory(selectedCategory)}
            </Text>
            <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
              {leader?.brand} leads with{' '}
              <span className="text-socal-ocean-600">{leader?.count.toLocaleString()}</span> products
            </h2>
            <p className="text-socal-stone-500">
              {categoryInfo?.desc}. Across all brands, there are{' '}
              <span className="text-socal-stone-700">{totalInCategory.toLocaleString()}</span> products
              in this category.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-socal-ocean-600 text-5xl font-bold">
              {totalInCategory.toLocaleString()}
            </Metric>
            <Text className="text-socal-stone-400">total products</Text>
          </div>
        </div>
      </Card>

      {/* Main Chart */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Brand Comparison: {formatCategory(selectedCategory)}
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Number of products each brand offers in this category
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={chartData}
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

      {/* Detailed Breakdown */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-4">
          Detailed Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaders.map((l, i) => {
            const share = Math.round((l.count / totalInCategory) * 100);
            const isLeader = i === 0;

            return (
              <Card
                key={l.slug}
                className={`ring-0 shadow-soft ${
                  isLeader
                    ? 'bg-gradient-to-br from-socal-ocean-50 to-socal-sand-50 border-socal-ocean-200'
                    : 'bg-white border-socal-sand-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Text className="text-socal-stone-400 text-sm">
                      {isLeader ? 'Category Leader' : `#${i + 1}`}
                    </Text>
                    <h3 className="text-socal-stone-700 font-semibold text-lg mt-1">
                      {l.brand}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isLeader ? 'text-socal-ocean-600' : 'text-socal-stone-700'}`}>
                      {l.count.toLocaleString()}
                    </div>
                    <Text className="text-socal-stone-400 text-sm">
                      {share}% of market
                    </Text>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-socal-stone-400">% of brand&apos;s catalog</span>
                    <span className="text-socal-stone-600">{l.pct}%</span>
                  </div>
                  <div className="h-2 bg-socal-sand-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isLeader ? 'bg-socal-ocean-500' : 'bg-socal-stone-300'}`}
                      style={{ width: `${Math.min(l.pct * 2, 100)}%` }}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-socal-stone-700 font-semibold text-lg mb-3">
          Reading the data
        </h3>
        <div className="space-y-3 text-socal-stone-500">
          <p>
            <span className="text-socal-stone-700">Product count shows investment.</span> More products
            typically means more color/size variations and style options—a signal of strategic priority.
          </p>
          <p>
            <span className="text-socal-stone-700">% of catalog shows focus.</span> A brand with 500 bottoms
            out of 1,000 products is more bottoms-focused than one with 500 out of 3,000.
          </p>
          <p>
            <span className="text-socal-stone-700">Market share shows competitive position.</span> The brand
            with the most products in a category has the most shelf space (digital or physical).
          </p>
        </div>
      </Card>
    </div>
  );
}
