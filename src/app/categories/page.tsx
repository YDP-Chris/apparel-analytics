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
        <Text className="text-gr-accent uppercase tracking-wider text-sm mb-2">
          Category Analysis
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-gr-text mb-4">
          Who Leads Each Category?
        </h1>
        <p className="text-gr-muted text-lg leading-relaxed">
          Select a category to see how brands stack up.
          Larger product counts typically indicate strategic priority.
        </p>
      </div>

      {/* Category Selector */}
      <div>
        <Text className="text-gr-muted mb-3">Select a category</Text>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gr-accent text-gr-text'
                  : 'bg-gr-border text-gr-muted hover:bg-gr-border hover:text-gr-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Header */}
      <Card className="bg-gradient-to-r from-gr-accent-soft to-gr-raised border-gr-accent-soft ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-gr-subtle mb-2">
              {formatCategory(selectedCategory)}
            </Text>
            <h2 className="text-2xl md:text-3xl font-bold text-gr-text mb-3">
              {leader?.brand} leads with{' '}
              <span className="text-gr-accent">{leader?.count.toLocaleString()}</span> products
            </h2>
            <p className="text-gr-muted">
              {categoryInfo?.desc}. Across all brands, there are{' '}
              <span className="text-gr-text">{totalInCategory.toLocaleString()}</span> products
              in this category.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-gr-accent text-5xl font-bold">
              {totalInCategory.toLocaleString()}
            </Metric>
            <Text className="text-gr-subtle">total products</Text>
          </div>
        </div>
      </Card>

      {/* Main Chart */}
      <div>
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Brand Comparison: {formatCategory(selectedCategory)}
        </h2>
        <Text className="text-gr-muted mb-6">
          Number of products each brand offers in this category
        </Text>

        <Card className="bg-gr-surface border-gr-border ring-0">
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
        <h2 className="text-xl font-semibold text-gr-text mb-4">
          Detailed Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leaders.map((l, i) => {
            const share = Math.round((l.count / totalInCategory) * 100);
            const isLeader = i === 0;

            return (
              <Card
                key={l.slug}
                className={`ring-0 ${
                  isLeader
                    ? 'bg-gradient-to-br from-gr-accent-soft to-gr-raised border-gr-accent-soft'
                    : 'bg-gr-surface border-gr-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Text className="text-gr-subtle text-sm">
                      {isLeader ? 'Category Leader' : `#${i + 1}`}
                    </Text>
                    <h3 className="text-gr-text font-semibold text-lg mt-1">
                      {l.brand}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isLeader ? 'text-gr-accent' : 'text-gr-text'}`}>
                      {l.count.toLocaleString()}
                    </div>
                    <Text className="text-gr-subtle text-sm">
                      {share}% of market
                    </Text>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gr-subtle">% of brand&apos;s catalog</span>
                    <span className="text-gr-muted">{l.pct}%</span>
                  </div>
                  <div className="h-2 bg-gr-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isLeader ? 'bg-gr-accent-hover' : 'bg-gr-subtle'}`}
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
      <Card className="bg-gr-surface border-gr-border ring-0">
        <h3 className="text-gr-text font-semibold text-lg mb-3">
          Reading the data
        </h3>
        <div className="space-y-3 text-gr-muted">
          <p>
            <span className="text-gr-text">Product count shows investment.</span> More products
            typically means more color/size variations and style options—a signal of strategic priority.
          </p>
          <p>
            <span className="text-gr-text">% of catalog shows focus.</span> A brand with 500 bottoms
            out of 1,000 products is more bottoms-focused than one with 500 out of 3,000.
          </p>
          <p>
            <span className="text-gr-text">Market share shows competitive position.</span> The brand
            with the most products in a category has the most shelf space (digital or physical).
          </p>
        </div>
      </Card>
    </div>
  );
}
