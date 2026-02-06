'use client';

import { Card, BarChart, AreaChart, Text, Metric, Badge } from '@tremor/react';
import { getRecentLaunches, getLaunchSummary, getLaunchVelocity } from '@/lib/data';
import { BRAND_COLORS } from '@/lib/types';
import Link from 'next/link';

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori',
  lululemon: 'Lululemon',
  alo: 'Alo Yoga',
  gymshark: 'Gymshark',
  outdoor_voices: 'Outdoor Voices',
  tenthousand: 'Ten Thousand',
  on_running: 'On Running',
};

export default function LaunchCalendarPage() {
  // Get recent launches from sitemap tracking (all brands)
  const recentLaunches = getRecentLaunches();
  const launchSummary = getLaunchSummary();
  const launchVelocity = getLaunchVelocity();

  // Group launches by date for display
  const launchesByDate: Record<string, typeof recentLaunches> = {};
  for (const launch of recentLaunches) {
    if (!launchesByDate[launch.date]) {
      launchesByDate[launch.date] = [];
    }
    launchesByDate[launch.date].push(launch);
  }

  // Build velocity chart data from launchVelocity (all brands, all days)
  // Get all unique dates across all brands, excluding initial load dates
  const allDates = new Set<string>();
  const brandInitialDates: Record<string, string> = {};

  // Find initial date for each brand (earliest date with most products)
  for (const [brandSlug, dates] of Object.entries(launchVelocity)) {
    let maxCount = 0;
    let initialDate = '';
    for (const [date, count] of Object.entries(dates)) {
      if (count > maxCount) {
        maxCount = count;
        initialDate = date;
      }
    }
    brandInitialDates[brandSlug] = initialDate;

    // Add non-initial dates
    for (const date of Object.keys(dates)) {
      if (date !== initialDate) {
        allDates.add(date);
      }
    }
  }

  // Build chart data
  const velocityChartData = Array.from(allDates)
    .sort()
    .map(date => {
      const row: Record<string, string | number> = { date };
      for (const [brandSlug, dates] of Object.entries(launchVelocity)) {
        if (date !== brandInitialDates[brandSlug]) {
          row[BRAND_NAMES[brandSlug] || brandSlug] = dates[date] || 0;
        }
      }
      return row;
    });

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
                        <Link
                          key={launch.brandSlug}
                          href={`/launches/${launch.brandSlug}`}
                          className="p-4 bg-socal-sand-50 rounded-lg border border-socal-sand-100 hover:border-socal-ocean-300 hover:bg-socal-ocean-50 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              color={(BRAND_COLORS[launch.brandSlug] || 'gray') as 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'}
                              size="sm"
                            >
                              {launch.brand}
                            </Badge>
                            <span className="text-lg font-bold text-socal-stone-800 group-hover:text-socal-ocean-700 transition-colors">
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
                              {launch.count > 3 && (
                                <div className="text-xs text-socal-ocean-500 group-hover:text-socal-ocean-600 font-medium">
                                  View all {launch.count} →
                                </div>
                              )}
                            </div>
                          )}
                        </Link>
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

      {/* Launch Trends Over Time - All Brands */}
      {velocityChartData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
            Launch Trends by Day
          </h2>
          <Text className="text-socal-stone-500 mb-6">
            Daily new product launches across all tracked brands (excluding initial catalog loads)
          </Text>

          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <AreaChart
              data={velocityChartData}
              index="date"
              categories={Object.values(BRAND_NAMES)}
              colors={['cyan', 'rose', 'violet', 'amber', 'emerald', 'blue', 'orange']}
              className="h-80"
              showAnimation
              showGridLines={false}
              valueFormatter={(v) => v.toString()}
            />
          </Card>

          <Card className="bg-socal-sand-50 border-socal-sand-200 ring-0 mt-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-semibold text-socal-stone-700">How This Works</h3>
                <p className="text-sm text-socal-stone-500 mt-1">
                  We monitor brand sitemaps and detect when new product URLs appear. The &quot;first seen&quot; date
                  becomes the launch date. Initial catalog loads are excluded to show only genuine new products.
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
