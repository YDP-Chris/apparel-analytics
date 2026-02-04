'use client';

import { useState } from 'react';
import { Card, Text, BarChart, Metric } from '@tremor/react';
import { getBrands, formatCategory, formatSubcategory, formatColor } from '@/lib/data';
import { COLOR_FAMILY_COLORS } from '@/lib/types';

/**
 * Product Mix Page
 * Comprehensive view of brand positioning across all dimensions:
 * - Gender
 * - Category
 * - Subcategory
 * - Color Family
 *
 * SWD Principles:
 * - Let user explore multiple dimensions
 * - Clear visual hierarchy
 * - Consistent comparison framework
 */

type Dimension = 'gender' | 'category' | 'subcategory' | 'color';

const DIMENSIONS: { id: Dimension; label: string; desc: string }[] = [
  { id: 'gender', label: 'Gender', desc: 'Men\'s, Women\'s, Unisex breakdown' },
  { id: 'category', label: 'Category', desc: 'Bottoms, Tops, Outerwear, etc.' },
  { id: 'subcategory', label: 'Subcategory', desc: 'Joggers, Leggings, Hoodies, etc.' },
  { id: 'color', label: 'Color', desc: 'Color family distribution' },
];

export default function MixPage() {
  const [dimension, setDimension] = useState<Dimension>('gender');
  const brands = getBrands();

  // Get all unique values for current dimension
  const getValuesForDimension = (dim: Dimension): string[] => {
    const allValues = new Set<string>();
    brands.forEach((brand) => {
      const data = dim === 'gender' ? brand.genders :
                   dim === 'category' ? brand.categories :
                   dim === 'subcategory' ? brand.subcategories :
                   brand.colors;
      Object.keys(data || {}).forEach((k) => {
        if (k !== 'other' || dim === 'gender') allValues.add(k);
      });
    });

    // Sort by total count across all brands
    return Array.from(allValues).sort((a, b) => {
      const totalA = brands.reduce((sum, brand) => {
        const data = dim === 'gender' ? brand.genders :
                     dim === 'category' ? brand.categories :
                     dim === 'subcategory' ? brand.subcategories :
                     brand.colors;
        return sum + (data?.[a] || 0);
      }, 0);
      const totalB = brands.reduce((sum, brand) => {
        const data = dim === 'gender' ? brand.genders :
                     dim === 'category' ? brand.categories :
                     dim === 'subcategory' ? brand.subcategories :
                     brand.colors;
        return sum + (data?.[b] || 0);
      }, 0);
      return totalB - totalA;
    });
  };

  const values = getValuesForDimension(dimension);

  // Format value label
  const formatValue = (val: string): string => {
    if (dimension === 'gender') {
      return val === 'mens' ? "Men's" : val === 'womens' ? "Women's" : 'Unisex';
    }
    if (dimension === 'category') return formatCategory(val);
    if (dimension === 'subcategory') return formatSubcategory(val);
    return formatColor(val);
  };

  // Calculate totals for headline
  const totalProducts = brands.reduce((sum, b) => sum + b.total, 0);
  const totalStyles = brands.reduce((sum, b) => sum + b.uniqueStyles, 0);

  // Build comparison table data
  const tableData = values.slice(0, 15).map((val) => {
    const row: Record<string, string | number> = { value: formatValue(val) };
    let total = 0;

    brands.forEach((brand) => {
      const data = dimension === 'gender' ? brand.genders :
                   dimension === 'category' ? brand.categories :
                   dimension === 'subcategory' ? brand.subcategories :
                   brand.colors;
      const count = data?.[val] || 0;
      row[brand.slug] = count;
      total += count;
    });

    row.total = total;
    return row;
  });

  // Build stacked bar data (percentage-based)
  const stackedData = brands.map((brand) => {
    const row: Record<string, string | number> = { name: brand.name };
    const data = dimension === 'gender' ? brand.genders :
                 dimension === 'category' ? brand.categories :
                 dimension === 'subcategory' ? brand.subcategories :
                 brand.colors;

    values.slice(0, 8).forEach((val) => {
      const count = data?.[val] || 0;
      row[formatValue(val)] = Math.round((count / brand.total) * 100);
    });

    return row;
  });

  // Top value across all brands
  const topValue = values[0];
  const topTotal = brands.reduce((sum, brand) => {
    const data = dimension === 'gender' ? brand.genders :
                 dimension === 'category' ? brand.categories :
                 dimension === 'subcategory' ? brand.subcategories :
                 brand.colors;
    return sum + (data?.[topValue] || 0);
  }, 0);
  const topPct = Math.round((topTotal / totalProducts) * 100);

  return (
    <div className="space-y-12">
      {/* Context */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Product Mix Analysis
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Compare Brand Positioning
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Explore how <span className="text-socal-stone-700 font-semibold">{brands.length} brands</span> position their{' '}
          <span className="text-socal-stone-700 font-semibold">{totalProducts.toLocaleString()} products</span> across{' '}
          <span className="text-socal-stone-700 font-semibold">{totalStyles.toLocaleString()} unique styles</span>.
          Select a dimension to compare.
        </p>
      </div>

      {/* Dimension Selector */}
      <div>
        <Text className="text-socal-stone-500 mb-3">Select dimension to analyze</Text>
        <div className="flex flex-wrap gap-3">
          {DIMENSIONS.map((dim) => (
            <button
              key={dim.id}
              onClick={() => setDimension(dim.id)}
              className={`px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                dimension === dim.id
                  ? 'bg-socal-ocean-600 text-white shadow-md'
                  : 'bg-white border border-socal-sand-200 text-socal-stone-600 hover:border-socal-ocean-300 hover:text-socal-ocean-700'
              }`}
            >
              <span className="block">{dim.label}</span>
              <span className={`block text-xs mt-0.5 ${dimension === dim.id ? 'text-socal-ocean-100' : 'text-socal-stone-400'}`}>
                {dim.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Key Insight */}
      <Card className="bg-gradient-to-r from-socal-ocean-50 to-socal-sand-50 border-socal-ocean-200 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-socal-stone-400 mb-2">
              Top {dimension === 'gender' ? 'segment' : dimension}
            </Text>
            <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
              <span className="text-socal-ocean-600">{formatValue(topValue)}</span> dominates
              with {topPct}% of all products
            </h2>
            <p className="text-socal-stone-500">
              {topTotal.toLocaleString()} products across all brands.
              See how each brand compares below.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-socal-ocean-600 text-5xl font-bold">
              {topPct}%
            </Metric>
            <Text className="text-socal-stone-400">of total</Text>
          </div>
        </div>
      </Card>

      {/* Stacked Bar Chart - Percentage Mix */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          {dimension === 'gender' ? 'Gender' : dimension === 'category' ? 'Category' : dimension === 'subcategory' ? 'Subcategory' : 'Color'} Mix by Brand
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Percentage of each brand&apos;s catalog (stacked to 100%)
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={stackedData}
            index="name"
            categories={values.slice(0, 8).map(formatValue)}
            colors={dimension === 'color'
              ? values.slice(0, 8).map((v) => {
                  if (v === 'black') return 'slate';
                  if (v === 'white') return 'stone';
                  if (v === 'gray' || v === 'heather') return 'gray';
                  if (v === 'navy') return 'indigo';
                  if (v === 'blue') return 'blue';
                  if (v === 'green') return 'emerald';
                  if (v === 'brown' || v === 'khaki') return 'amber';
                  if (v === 'pink') return 'pink';
                  if (v === 'purple') return 'violet';
                  if (v === 'red' || v === 'rust') return 'red';
                  if (v === 'orange') return 'orange';
                  if (v === 'yellow') return 'yellow';
                  return 'gray';
                })
              : ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'indigo', 'gray']
            }
            layout="vertical"
            stack
            className="h-96"
            showAnimation
            showGridLines={false}
            valueFormatter={(v) => `${v}%`}
          />
        </Card>
      </div>

      {/* Detailed Comparison Table */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Detailed Comparison
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Product counts by {dimension} across all brands
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-socal-sand-200">
                  <th className="text-left py-3 px-4 font-semibold text-socal-stone-700 sticky left-0 bg-white">
                    {dimension === 'gender' ? 'Segment' : formatCategory(dimension)}
                  </th>
                  {brands.map((brand) => (
                    <th
                      key={brand.slug}
                      className={`text-right py-3 px-4 font-medium ${
                        brand.slug === 'vuori' ? 'text-socal-ocean-600 bg-socal-ocean-50' : 'text-socal-stone-500'
                      }`}
                    >
                      {brand.name}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 font-semibold text-socal-stone-700 bg-socal-sand-50">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr
                    key={row.value as string}
                    className={`border-b border-socal-sand-100 ${i === 0 ? 'bg-socal-sage-50' : ''}`}
                  >
                    <td className="py-3 px-4 font-medium text-socal-stone-700 sticky left-0 bg-inherit">
                      <div className="flex items-center gap-2">
                        {dimension === 'color' && (
                          <div
                            className="w-3 h-3 rounded-full border border-socal-sand-200"
                            style={{ backgroundColor: COLOR_FAMILY_COLORS[values[i]] || '#6b7280' }}
                          />
                        )}
                        {row.value}
                      </div>
                    </td>
                    {brands.map((brand) => {
                      const count = row[brand.slug] as number;
                      const pct = Math.round((count / brand.total) * 100);
                      return (
                        <td
                          key={brand.slug}
                          className={`py-3 px-4 text-right ${
                            brand.slug === 'vuori' ? 'bg-socal-ocean-50' : ''
                          }`}
                        >
                          <span className="text-socal-stone-700">{count.toLocaleString()}</span>
                          <span className="text-socal-stone-400 text-xs ml-1">({pct}%)</span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right font-semibold text-socal-stone-700 bg-socal-sand-50">
                      {(row.total as number).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Brand Cards with Dimension Focus */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-6">
          Brand {dimension === 'gender' ? 'Segment' : formatCategory(dimension)} Profiles
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => {
            const data = dimension === 'gender' ? brand.genders :
                         dimension === 'category' ? brand.categories :
                         dimension === 'subcategory' ? brand.subcategories :
                         brand.colors;

            const sorted = Object.entries(data || {})
              .filter(([k]) => k !== 'other' || dimension === 'gender')
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);

            const isVuori = brand.slug === 'vuori';

            return (
              <Card
                key={brand.slug}
                className={`ring-0 shadow-soft ${
                  isVuori
                    ? 'bg-gradient-to-br from-socal-ocean-50 to-white border-socal-ocean-200'
                    : 'bg-white border-socal-sand-100'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg ${isVuori ? 'text-socal-ocean-700' : 'text-socal-stone-700'}`}>
                    {brand.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-socal-sand-100 text-socal-stone-500">
                    {brand.total.toLocaleString()} products
                  </span>
                </div>

                {/* Mini bar visualization */}
                <div className="flex h-4 rounded-lg overflow-hidden mb-4">
                  {sorted.map(([key, count]) => {
                    const pct = (count / brand.total) * 100;
                    let bgColor = 'bg-socal-stone-300';

                    if (dimension === 'color') {
                      const colorMap: Record<string, string> = {
                        black: 'bg-slate-800',
                        white: 'bg-stone-200',
                        gray: 'bg-gray-400',
                        heather: 'bg-gray-300',
                        navy: 'bg-indigo-800',
                        blue: 'bg-blue-500',
                        green: 'bg-emerald-500',
                        brown: 'bg-amber-700',
                        khaki: 'bg-amber-300',
                        pink: 'bg-pink-400',
                        purple: 'bg-violet-500',
                        red: 'bg-red-500',
                        orange: 'bg-orange-500',
                        yellow: 'bg-yellow-400',
                      };
                      bgColor = colorMap[key] || 'bg-gray-400';
                    } else if (dimension === 'gender') {
                      bgColor = key === 'womens' ? 'bg-rose-400' : key === 'mens' ? 'bg-blue-500' : 'bg-violet-400';
                    } else {
                      const idx = sorted.findIndex(([k]) => k === key);
                      const colors = ['bg-socal-ocean-500', 'bg-socal-sage-500', 'bg-socal-sand-400', 'bg-socal-sunset-400', 'bg-socal-stone-300'];
                      bgColor = colors[idx] || 'bg-gray-300';
                    }

                    return (
                      <div
                        key={key}
                        className={`h-full ${bgColor}`}
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? '2px' : '0' }}
                        title={`${formatValue(key)}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Top values */}
                <div className="space-y-2">
                  {sorted.slice(0, 4).map(([key, count]) => {
                    const pct = Math.round((count / brand.total) * 100);
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {dimension === 'color' && (
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: COLOR_FAMILY_COLORS[key] || '#6b7280' }}
                            />
                          )}
                          <span className="text-socal-stone-600">{formatValue(key)}</span>
                        </div>
                        <span className="text-socal-stone-400 font-mono text-xs">
                          {count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Insight */}
      <Card className="bg-gradient-to-br from-socal-ocean-600 to-socal-ocean-800 rounded-2xl p-8 text-white">
        <h2 className="text-xl font-bold mb-4">Reading the Mix</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-socal-ocean-200 text-sm font-medium mb-1">Percentage view</p>
            <p className="text-white">
              Stacked bars show mix regardless of catalog size—compare strategy, not scale.
            </p>
          </div>
          <div>
            <p className="text-socal-ocean-200 text-sm font-medium mb-1">Count view</p>
            <p className="text-white">
              The table shows absolute numbers—useful for understanding market share.
            </p>
          </div>
          <div>
            <p className="text-socal-ocean-200 text-sm font-medium mb-1">Vuori highlight</p>
            <p className="text-white">
              Vuori columns are highlighted throughout to quickly spot competitive position.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
