'use client';

import { Card, BarChart, AreaChart, Text, Metric, Badge } from '@tremor/react';
import { getRecentLaunches, getLaunchSummary, getLaunchVelocity, getComebacks } from '@/lib/data';
import { BRAND_COLORS, ComebackEntry } from '@/lib/types';
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
  const comebackData = getComebacks();

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
        <Text className="text-gr-accent uppercase tracking-wider text-sm mb-2">
          Competitive Intelligence
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-gr-text mb-4">
          Launch Calendar
        </h1>
        <p className="text-gr-muted text-lg leading-relaxed">
          Track when competitors drop new products. Data sourced from sitemap monitoring -
          we detect new products as soon as they appear on brand websites.
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">New Products</Text>
          <Metric className="text-gr-text">{launchSummary.totalNewProducts.toLocaleString()}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">since tracking started</Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Latest Data</Text>
          <Metric className="text-gr-text text-2xl">{launchSummary.latestDate || 'N/A'}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">most recent update</Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Most Active</Text>
          <Metric className="text-gr-text text-2xl">{launchSummary.byBrand[0]?.brand || 'N/A'}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">{launchSummary.byBrand[0]?.count || 0} new products</Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Brands Tracked</Text>
          <Metric className="text-gr-text">{launchSummary.byBrand.length}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">with new products</Text>
        </Card>
      </div>

      {/* Recent Launches - All Brands */}
      <div>
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Recent Launches
        </h2>
        <Text className="text-gr-muted mb-6">
          New products detected from sitemap monitoring (all brands)
        </Text>

        {Object.keys(launchesByDate).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(launchesByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 5)
              .map(([date, launches]) => (
                <Card key={date} className="bg-gr-surface border-gr-border ring-0">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📅</span>
                    <div>
                      <h3 className="font-semibold text-gr-text">{formatDate(date)}</h3>
                      <Text className="text-gr-subtle text-sm">
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
                          className="p-4 bg-gr-raised rounded-lg border border-gr-border hover:border-gr-accent-soft hover:bg-gr-accent-soft transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              color={(BRAND_COLORS[launch.brandSlug] || 'gray') as 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'}
                              size="sm"
                            >
                              {launch.brand}
                            </Badge>
                            <span className="text-lg font-bold text-gr-text group-hover:text-gr-accent transition-colors">
                              {launch.count}
                            </span>
                          </div>

                          {launch.products.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {launch.products.slice(0, 3).map((product, i) => (
                                <div key={i} className="text-xs text-gr-muted truncate">
                                  <span className="text-gr-subtle">
                                    {product.category === 'other' ? '' : `[${product.category}] `}
                                  </span>
                                  {product.name}
                                </div>
                              ))}
                              {launch.count > 3 && (
                                <div className="text-xs text-gr-accent-hover group-hover:text-gr-accent font-medium">
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
          <Card className="bg-gr-surface border-gr-border ring-0">
            <p className="text-gr-subtle text-center py-8">
              No recent launches detected yet. Data will populate as we track products over time.
            </p>
          </Card>
        )}
      </div>

      {/* Launch Velocity by Brand */}
      <div>
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Launch Velocity by Brand
        </h2>
        <Text className="text-gr-muted mb-6">
          Total new products since tracking began
        </Text>

        <Card className="bg-gr-surface border-gr-border ring-0">
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
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            Launch Trends by Day
          </h2>
          <Text className="text-gr-muted mb-6">
            Daily new product launches across all tracked brands (excluding initial catalog loads)
          </Text>

          <Card className="bg-gr-surface border-gr-border ring-0">
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

          <Card className="bg-gr-raised border-gr-border ring-0 mt-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="font-semibold text-gr-text">How This Works</h3>
                <p className="text-sm text-gr-muted mt-1">
                  We monitor brand sitemaps and detect when new product URLs appear. The &quot;first seen&quot; date
                  becomes the launch date. Initial catalog loads are excluded to show only genuine new products.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Comeback Products */}
      {comebackData.comebacks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            Comeback Products
          </h2>
          <Text className="text-gr-muted mb-6">
            Products that disappeared from brand sitemaps and then returned — signals restocking, seasonal rotation, or demand.
          </Text>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-gr-surface border-gr-border ring-0">
              <Text className="text-gr-subtle">Total Comebacks</Text>
              <Metric className="text-gr-text">{comebackData.summary.total}</Metric>
            </Card>
            <Card className="bg-gr-surface border-gr-border ring-0">
              <Text className="text-gr-subtle">Avg Days Gone</Text>
              <Metric className="text-gr-text">{comebackData.summary.avg_days_gone}</Metric>
            </Card>
            <Card className="bg-gr-surface border-gr-border ring-0">
              <Text className="text-gr-subtle">Most Active Brand</Text>
              <Metric className="text-gr-text text-2xl">
                {Object.entries(comebackData.summary.by_brand).sort(([,a], [,b]) => b - a)[0]?.[0]
                  ? BRAND_NAMES[Object.entries(comebackData.summary.by_brand).sort(([,a], [,b]) => b - a)[0][0]]
                    || Object.entries(comebackData.summary.by_brand).sort(([,a], [,b]) => b - a)[0][0]
                  : 'N/A'}
              </Metric>
            </Card>
          </div>

          {/* Comeback Table */}
          <Card className="bg-gr-surface border-gr-border ring-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gr-border">
                    <th className="text-left py-3 px-4 text-gr-subtle font-medium">Brand</th>
                    <th className="text-left py-3 px-4 text-gr-subtle font-medium">Product</th>
                    <th className="text-left py-3 px-4 text-gr-subtle font-medium">Category</th>
                    <th className="text-right py-3 px-4 text-gr-subtle font-medium">Days Gone</th>
                    <th className="text-left py-3 px-4 text-gr-subtle font-medium">Removed</th>
                    <th className="text-left py-3 px-4 text-gr-subtle font-medium">Returned</th>
                  </tr>
                </thead>
                <tbody>
                  {comebackData.comebacks
                    .slice()
                    .reverse()
                    .slice(0, 20)
                    .map((cb: ComebackEntry, i: number) => {
                      const daysColor = cb.days_gone < 7
                        ? 'text-emerald-600 bg-emerald-50'
                        : cb.days_gone <= 30
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-gr-danger bg-gr-bg';
                      const daysLabel = cb.days_gone < 7
                        ? 'Quick restock'
                        : cb.days_gone <= 30
                        ? 'Rotation'
                        : 'Seasonal';
                      const productName = cb.product_name || cb.url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown';
                      const formatShortDate = (d: string) => {
                        if (!d) return '—';
                        try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
                        catch { return d.slice(0, 10); }
                      };

                      return (
                        <tr key={i} className="border-b border-gr-raised hover:bg-gr-raised">
                          <td className="py-3 px-4">
                            <Badge
                              color={(BRAND_COLORS[cb.brand] || 'gray') as 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'}
                              size="sm"
                            >
                              {BRAND_NAMES[cb.brand] || cb.brand}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gr-text max-w-[200px] truncate" title={productName}>
                            {productName}
                          </td>
                          <td className="py-3 px-4 text-gr-muted capitalize">
                            {cb.subcategory || cb.category || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${daysColor}`}>
                              {cb.days_gone}d · {daysLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gr-subtle text-xs">{formatShortDate(cb.removed_at)}</td>
                          <td className="py-3 px-4 text-gr-subtle text-xs">{formatShortDate(cb.returned_at)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {comebackData.comebacks.length > 20 && (
              <div className="text-center py-3 text-sm text-gr-subtle">
                Showing 20 of {comebackData.comebacks.length} comebacks
              </div>
            )}
          </Card>

          <Card className="bg-gr-raised border-gr-border ring-0 mt-4">
            <div className="flex items-start gap-4">
              <span className="text-2xl">🔄</span>
              <div>
                <h3 className="font-semibold text-gr-text">What Are Comebacks?</h3>
                <p className="text-sm text-gr-muted mt-1">
                  A comeback is when a product disappears from a brand&apos;s sitemap and later returns.
                  Quick restocks (&lt;7 days) suggest high demand. Rotations (7-30 days) indicate planned assortment changes.
                  Seasonal returns (30+ days) reveal cyclical patterns.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/vuori" className="group">
          <Card className="bg-gr-surface border-gr-border ring-0 hover:border-gr-accent-soft transition-colors h-full">
            <Text className="text-gr-subtle group-hover:text-gr-accent transition-colors">
              Related
            </Text>
            <h3 className="text-gr-text font-semibold mt-1 group-hover:text-gr-accent transition-colors">
              Vuori Competitive Scorecard →
            </h3>
            <Text className="text-gr-subtle mt-2 text-sm">
              How does Vuori stack up against the competition?
            </Text>
          </Card>
        </Link>

        <Link href="/brands" className="group">
          <Card className="bg-gr-surface border-gr-border ring-0 hover:border-gr-accent-soft transition-colors h-full">
            <Text className="text-gr-subtle group-hover:text-gr-accent transition-colors">
              Explore
            </Text>
            <h3 className="text-gr-text font-semibold mt-1 group-hover:text-gr-accent transition-colors">
              Brand Comparison →
            </h3>
            <Text className="text-gr-subtle mt-2 text-sm">
              See category mix across all tracked brands
            </Text>
          </Card>
        </Link>
      </div>
    </div>
  );
}
