'use client';

import { Card, BarChart, AreaChart, Text, Metric, Badge } from '@tremor/react';
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

const data = launchData as unknown as LaunchCalendarData;

const BRAND_COLORS: Record<string, string> = {
  vuori: 'cyan',
  lululemon: 'rose',
  alo: 'violet',
  gymshark: 'amber',
  outdoor_voices: 'emerald',
  tenthousand: 'blue',
  on_running: 'orange',
};

export default function LaunchCalendarPage() {
  // Filter to only Shopify brands with real historical data
  const shopifyBrands = ['outdoor_voices', 'tenthousand'];

  // Get monthly timeline for Shopify brands only (real historical data)
  const monthlyData = data.timeline.monthly
    .filter(m => {
      // Only include months where we have real data (not initial scrape)
      const hasShopifyData = shopifyBrands.some(b => (m.by_brand[b] || 0) > 0);
      return hasShopifyData;
    })
    .map(m => ({
      month: m.month,
      'Outdoor Voices': m.by_brand['outdoor_voices'] || 0,
      'Ten Thousand': m.by_brand['tenthousand'] || 0,
    }));

  // Filter spikes to only show meaningful ones (Shopify brands with real dates)
  const meaningfulSpikes = data.spikes.monthly
    .filter(s => shopifyBrands.includes(s.brand) && s.count >= 10)
    .slice(-8);

  // Calculate velocity for brands with real data
  const velocityData = shopifyBrands
    .filter(b => data.velocity.monthly[b])
    .map(brand => ({
      brand: data.brand_names[brand] || brand,
      'Avg Monthly': Math.round(data.velocity.monthly[brand].mean),
      'Max Month': data.velocity.monthly[brand].max,
      'Active Months': data.velocity.monthly[brand].periods_active,
    }));

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
          Track when competitors drop new products. Detect collection launches,
          seasonal pushes, and velocity spikes before they hit the market.
        </p>
      </div>

      {/* Key Insight */}
      <Card className="bg-gradient-to-r from-socal-sand-50 to-socal-ocean-50 border-socal-sand-200 ring-0 p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <Text className="text-socal-stone-400 mb-2">The Pattern</Text>
            <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
              Brands drop big in{' '}
              <span className="text-socal-ocean-600">March</span> and{' '}
              <span className="text-socal-ocean-600">October</span>
            </h2>
            <p className="text-socal-stone-500">
              Spring/Summer and Fall/Winter collection drops create predictable spikes.
              Outdoor Voices dropped 117 products in March 2025. Ten Thousand dropped 73 in October.
            </p>
          </div>
          <div className="text-center md:text-right">
            <Metric className="text-socal-ocean-600 text-5xl md:text-6xl font-bold">
              2
            </Metric>
            <Text className="text-socal-stone-400">major seasons</Text>
          </div>
        </div>
      </Card>

      {/* Monthly Timeline Chart */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Monthly Product Launches
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Historical launch data from Shopify stores (Outdoor Voices, Ten Thousand)
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
      </div>

      {/* Launch Spikes */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Notable Launch Spikes
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          When brands dropped significantly more than their average
        </Text>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meaningfulSpikes.length > 0 ? (
            meaningfulSpikes.map((spike, i) => (
              <Card key={i} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge color={(BRAND_COLORS[spike.brand] || 'gray') as 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'} size="sm">
                      {data.brand_names[spike.brand] || spike.brand}
                    </Badge>
                    <p className="text-2xl font-bold text-socal-stone-800 mt-2">
                      {spike.count} products
                    </p>
                    <p className="text-sm text-socal-stone-400">
                      {spike.period} • {spike.multiple.toFixed(1)}x normal velocity
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl">🚀</span>
                  </div>
                </div>
                {spike.top_types.length > 0 && (
                  <p className="text-xs text-socal-stone-400 mt-3">
                    Top: {spike.top_types.map(t => t[0]).join(', ')}
                  </p>
                )}
              </Card>
            ))
          ) : (
            <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft col-span-2">
              <p className="text-socal-stone-400 text-center py-4">
                No significant spikes detected yet. Data will populate as we track launches over time.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Brand Velocity */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Brand Launch Velocity
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Average and peak monthly product launches
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={velocityData}
            index="brand"
            categories={['Avg Monthly', 'Max Month']}
            colors={['cyan', 'amber']}
            className="h-64"
            showAnimation
            showGridLines={false}
            layout="vertical"
          />
        </Card>
      </div>

      {/* Data Quality Note */}
      <Card className="bg-socal-sand-50 border-socal-sand-200 ring-0">
        <div className="flex items-start gap-4">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="font-semibold text-socal-stone-700">About This Data</h3>
            <p className="text-sm text-socal-stone-500 mt-1">
              Historical launch dates are available for <strong>Shopify stores</strong> (Outdoor Voices, Ten Thousand)
              via their product API. Other brands show &quot;first seen&quot; dates from when we started tracking.
              As we collect data over time, this calendar will become more comprehensive.
            </p>
          </div>
        </div>
      </Card>

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
