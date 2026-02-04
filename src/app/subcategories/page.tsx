'use client';

import { useState } from 'react';
import { Card, Text, BarChart, Metric } from '@tremor/react';
import { getSubcategoryLeaders, getMarketAverage, getBrandIndex, formatSubcategory } from '@/lib/data';

/**
 * Subcategory Analysis Page
 * Story: "The Jogger Wars: Who's winning each segment?"
 *
 * SWD Principles:
 * - Focus on the battles that matter
 * - Use indexing to show relative performance
 * - Make comparisons easy
 */

const KEY_SUBCATEGORIES = [
  { id: 'shorts', label: 'Shorts' },
  { id: 'leggings', label: 'Leggings' },
  { id: 'joggers', label: 'Joggers' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'tanks', label: 'Tanks' },
  { id: 'tees', label: 'Tees' },
  { id: 'jackets', label: 'Jackets' },
  { id: 'sweatpants', label: 'Sweatpants' },
];

export default function SubcategoriesPage() {
  const [selectedSubcat, setSelectedSubcat] = useState('shorts');

  const leaders = getSubcategoryLeaders(selectedSubcat);
  const marketAvg = getMarketAverage(selectedSubcat);
  const totalInSubcat = leaders.reduce((sum, l) => sum + l.count, 0);
  const leader = leaders[0];

  // Chart data with market average reference
  const chartData = leaders.map((l) => ({
    name: l.brand,
    Products: l.count,
  }));

  return (
    <div className="space-y-12">
      {/* Context */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Subcategory Battles
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Who&apos;s Winning Each Segment?
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Subcategories are where the real competition happens.
          A brand might lead in bottoms overall but lose the jogger battle.
        </p>
      </div>

      {/* Subcategory Tabs */}
      <div>
        <Text className="text-socal-stone-500 mb-3">Select a subcategory</Text>
        <div className="flex flex-wrap gap-2">
          {KEY_SUBCATEGORIES.map((subcat) => (
            <button
              key={subcat.id}
              onClick={() => setSelectedSubcat(subcat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedSubcat === subcat.id
                  ? 'bg-socal-sage-600 text-white'
                  : 'bg-socal-sand-100 text-socal-stone-500 hover:bg-socal-sand-200 hover:text-socal-stone-700'
              }`}
            >
              {subcat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leader Highlight */}
      <Card className="bg-gradient-to-r from-socal-sage-50 to-socal-sand-50 border-socal-sage-200 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-socal-stone-400 mb-2">
              {formatSubcategory(selectedSubcat)} Leader
            </Text>
            <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
              {leader?.brand} dominates with{' '}
              <span className="text-socal-sage-600">{leader?.count}</span> {formatSubcategory(selectedSubcat).toLowerCase()}
            </h2>
            <p className="text-socal-stone-500">
              Market average is <span className="text-socal-stone-700">{marketAvg}</span> products.
              {leader && (
                <span>
                  {' '}That&apos;s <span className="text-socal-sage-600">{Math.round((leader.count / marketAvg) * 100)}%</span> of
                  the market average.
                </span>
              )}
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-socal-sage-600 text-5xl font-bold">
              {totalInSubcat}
            </Metric>
            <Text className="text-socal-stone-400">total across brands</Text>
          </div>
        </div>
      </Card>

      {/* Main Chart */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          {formatSubcategory(selectedSubcat)} Count by Brand
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Dotted line shows market average ({marketAvg} products)
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={chartData}
            index="name"
            categories={['Products']}
            colors={['emerald']}
            layout="vertical"
            className="h-80"
            showAnimation
            showGridLines={false}
            showLegend={false}
            valueFormatter={(v) => v.toLocaleString()}
          />
          {/* Market average reference */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <div className="w-8 border-t-2 border-dashed border-socal-stone-300" />
            <span className="text-socal-stone-400">Market average: {marketAvg} products</span>
          </div>
        </Card>
      </div>

      {/* Index Cards */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Brand Index vs. Market Average
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          100 = market average. Above 100 = over-indexing, below 100 = under-indexing
        </Text>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {leaders.map((l) => {
            const index = getBrandIndex(l.slug, selectedSubcat);
            const isAboveAvg = index >= 100;

            return (
              <Card
                key={l.slug}
                className={`ring-0 shadow-soft text-center ${
                  isAboveAvg
                    ? 'bg-gradient-to-br from-socal-sage-50 to-socal-sand-50 border-socal-sage-200'
                    : 'bg-white border-socal-sand-100'
                }`}
              >
                <Text className="text-socal-stone-400 text-sm truncate">{l.brand}</Text>
                <div
                  className={`text-3xl font-bold mt-2 ${
                    isAboveAvg ? 'text-socal-sage-600' : 'text-socal-stone-400'
                  }`}
                >
                  {index}
                </div>
                <Text className="text-socal-stone-400 text-xs mt-1">
                  {l.count} products
                </Text>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Subcategory Overview Grid */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-6">
          All Subcategory Leaders at a Glance
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KEY_SUBCATEGORIES.map((subcat) => {
            const subcatLeaders = getSubcategoryLeaders(subcat.id);
            const top = subcatLeaders[0];
            const total = subcatLeaders.reduce((s, l) => s + l.count, 0);

            return (
              <button
                key={subcat.id}
                onClick={() => setSelectedSubcat(subcat.id)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selectedSubcat === subcat.id
                    ? 'bg-socal-sage-50 border-socal-sage-300'
                    : 'bg-white border-socal-sand-100 hover:border-socal-sand-200'
                }`}
              >
                <Text className="text-socal-stone-400 text-sm">{total} products</Text>
                <h3 className="text-socal-stone-700 font-semibold mt-1">{subcat.label}</h3>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-socal-stone-400 text-sm">Leader:</span>
                  <span className="text-socal-sage-600 text-sm font-medium">
                    {top?.brand} ({top?.count})
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Strategic Insight */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-socal-stone-700 font-semibold text-lg mb-3">
          Understanding brand index
        </h3>
        <div className="space-y-3 text-socal-stone-500">
          <p>
            <span className="text-socal-stone-700">Index = (Brand Count / Market Average) × 100.</span>{' '}
            An index of 150 means the brand has 50% more products than average in that subcategory.
          </p>
          <p>
            <span className="text-socal-stone-700">High index = strategic focus.</span>{' '}
            Vuori&apos;s high shorts index (156%) signals this as a key product category for them.
          </p>
          <p>
            <span className="text-socal-stone-700">Low index = potential gap.</span>{' '}
            A brand with 50 index in leggings is half the market average—either intentional
            positioning or a missed opportunity.
          </p>
        </div>
      </Card>
    </div>
  );
}
