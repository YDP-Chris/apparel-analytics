'use client';

import { Card, BarChart, AreaChart, Text, Metric, Badge } from '@tremor/react';
import { getRecentLaunches, getLaunchSummary } from '@/lib/data';
import { BRAND_COLORS } from '@/lib/types';
import launchData from '@/data/launch_calendar.json';
import Link from 'next/link';

interface LaunchCalendarData {
  generated_at: string;
  total_products: number;
  date_range: { start: string; end: string };
  velocity: {
    weekly: Record<string, { mean: number; stdev: number; max: number; total: number; periods_active: number }>;
    monthly: Record<string, { mean: number; stdev: number; max: number; total: number; periods_active: number }>;
  };
  spikes: {
    weekly: Array<{ period: string; brand: string; count: number; mean: number; multiple: number; top_types: Array<[string, number]> }>;
    monthly: Array<{ period: string; brand: string; count: number; mean: number; multiple: number; top_types: Array<[string, number]> }>;
  };
  timeline: {
    weekly: Array<{ week: string; total: number; by_brand: Record<string, number> }>;
    monthly: Array<{ month: string; total: number; by_brand: Record<string, number> }>;
  };
  brand_names: Record<string, string>;
}

const historicalData = launchData as unknown as LaunchCalendarData;

export default function LaunchCalendarPage() {
  // Get recent launches from sitemap tracking (all brands)
  const recentLaunches = getRecentLaunches();
  const launchSummary = getLaunchSummary();

  // Group launches by date for display
  const launchesByDate: Record<string, typeof recentLaunches> = {};
  for (const launch of recentLaunches) {
    if (!launchesByDate[launch.date]) {
      launchesByDate[launch.date] = [];
    }
    launchesByDate[launch.date].push(launch);
  }

  // Historical data for Shopify brands
  const shopifyBrands = ['outdoor_voices', 'tenthousand'];
  const monthlyData = historicalData.timeline.monthly
    .filter(m => shopifyBrands.some(b => (m.by_brand[b] || 0) > 0))
    .map(m => ({
      month: m.month,
      'Outdoor Voices': m.by_brand['outdoor_voices'] || 0,
      'Ten Thousand': m.by_brand['tenthousand'] || 0,
    }));

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Competitive Intelligence
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Launch Calendar
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Track when competitors drop new products. Data sourced from sitemap monitoring -
          we detect new products as soon as they appear on brand websites.
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">New Products</Text>
          <Metric className="text-socal-stone-800">{launchSummary.totalNewProducts.toLocaleString()}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">since tracking started</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Latest Data</Text>
          <Metric className="text-socal-stone-800 text-2xl">{launchSummary.latestDate || 'N/A'}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">most recent update</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Most Active</Text>
          <Metric className="text-socal-stone-800 text-2xl">{launchSummary.byBrand[0]?.brand || 'N/A'}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">{launchSummary.byBrand[0]?.count || 0} new products</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Brands Tracked</Text>
          <Metric className="text-socal-stone-800">{launchSummary.byBrand.length}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">with new products</Text>
        </Card>
      </div>

      {/* Recent Launches - All Brands */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Recent Launches
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          New products detected from sitemap monitoring (all brands)
        </Text>

        {Object.keys(launchesByDate).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(launchesByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 5)
              .map(([date, launches]) => (
                <Card key={date} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📅</span>
                    <div>
                      <h3 className="font-semibold text-socal-stone-800">{formatDate(date)}</h3>
                      <Text className="text-socal-stone-400 text-sm">
                        {launches.reduce((sum, l) => sum + l.count, 0)} new products across {launches.length} brands
                      </Text>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {launches
                      .sort((a, b) => b.count - a.count)
                      .map((launch) => (
                        <div
                          key={launch.brandSlug}
                          className="p-4 bg-socal-sand-50 rounded-lg border border-socal-sand-100"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              color={(BRAND_COLORS[launch.brandSlug] || 'gray') as 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'}
                              size="sm"
                            >
                              {launch.brand}
                            </Badge>
                            <span className="text-lg font-bold text-socal-stone-800">
                              {launch.count}
                            </span>
                          </div>

                          {launch.products.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {launch.products.slice(0, 3).map((product, i) => (
                                <div key={i} className="text-xs text-socal-stone-500 truncate">
                                  <span className="text-socal-stone-400">
                                    {product.category === 'other' ? '' : `[${product.category}] `}
                                  </span>
                                  {product.name}
                                </div>
                              ))}
                              {launch.products.length > 3 && (
                                <div className="text-xs text-socal-stone-400">
                                  +{launch.products.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <p className="text-socal-stone-400 text-center py-8">
              No recent launches detected yet. Data will populate as we track products over time.
            </p>
          </Card>
        )}
      </div>

      {/* Launch Velocity by Brand */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Launch Velocity by Brand
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Total new products since tracking began
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={launchSummary.byBrand.map(b => ({
              brand: b.brand,
              'New Products': b.count,
            }))}
            index="brand"
            categories={['New Products']}
            colors={['cyan']}
            className="h-64"
            showAnimation
            showGridLines={false}
            layout="vertical"
            valueFormatter={(v) => v.toLocaleString()}
          />
        </Card>
      </div>

      {/* Historical Data (Shopify brands) */}
      {monthlyData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
            Historical Launch Patterns
          </h2>
          <Text className="text-socal-stone-500 mb-6">
            Monthly product launches from Shopify stores (with Shopify-provided created_at dates)
          </Text>

          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <AreaChart
              data={monthlyData}
              index="month"
              categories={['Outdoor Voices', 'Ten Thousand']}
              colors={['emerald', 'blue']}
              className="h-72"
              showAnimation
              showGridLines={false}
              valueFormatter={(v) => v.toString()}
            />
          </Card>

          <Card className="bg-socal-sand-50 border-socal-sand-200 ring-0 mt-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-semibold text-socal-stone-700">Shopify vs Sitemap Data</h3>
                <p className="text-sm text-socal-stone-500 mt-1">
                  Shopify stores provide actual product creation dates via their API. For other brands,
                  we use &quot;first seen&quot; dates from sitemap monitoring. Both methods accurately capture
                  when products became available to customers.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/vuori" className="group">
          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft hover:border-socal-ocean-300 transition-colors h-full">
            <Text className="text-socal-stone-400 group-hover:text-socal-ocean-600 transition-colors">
              Related
            </Text>
            <h3 className="text-socal-stone-700 font-semibold mt-1 group-hover:text-socal-ocean-700 transition-colors">
              Vuori Competitive Scorecard →
            </h3>
            <Text className="text-socal-stone-400 mt-2 text-sm">
              How does Vuori stack up against the competition?
            </Text>
          </Card>
        </Link>

        <Link href="/brands" className="group">
          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft hover:border-socal-ocean-300 transition-colors h-full">
            <Text className="text-socal-stone-400 group-hover:text-socal-ocean-600 transition-colors">
              Explore
            </Text>
            <h3 className="text-socal-stone-700 font-semibold mt-1 group-hover:text-socal-ocean-700 transition-colors">
              Brand Comparison →
            </h3>
            <Text className="text-socal-stone-400 mt-2 text-sm">
              See category mix across all tracked brands
            </Text>
          </Card>
        </Link>
      </div>
    </div>
  );
}
