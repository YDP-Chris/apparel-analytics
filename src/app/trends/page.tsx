'use client';

import { useState } from 'react';
import { Card, AreaChart, BarChart, Text, Metric, Badge } from '@tremor/react';
import historyData from '@/data/history.json';
import facebookData from '@/data/facebook.json';

interface Snapshot {
  date: string;
  jobs: Record<string, number>;
  reddit: Record<string, number>;
  trustpilot: Record<string, number>;
  products: Record<string, number>;
}

interface FacebookBrand {
  name: string;
  followers: number | null;
  likes: number | null;
  verified: boolean;
}

const history = historyData as { snapshots: Snapshot[] };
const facebook = facebookData as unknown as { brands: Record<string, FacebookBrand> };

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori', lululemon: 'Lululemon', alo: 'Alo Yoga',
  rhone: 'Rhone', tenthousand: 'Ten Thousand',
  outdoor_voices: 'Outdoor Voices', gymshark: 'Gymshark',
  fabletics: 'Fabletics', athleta: 'Athleta', on_running: 'On Running',
};

const CHARTS = [
  { id: 'reddit', label: 'Reddit Mentions' },
  { id: 'jobs', label: 'Job Postings' },
  { id: 'trustpilot', label: 'Trustpilot Ratings' },
  { id: 'products', label: 'Product Catalog Size' },
];

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

export default function TrendsPage() {
  const [activeChart, setActiveChart] = useState('reddit');
  const snapshots = history.snapshots || [];

  // Get all brands from latest snapshot (excluding _total)
  const latestSnapshot = snapshots[snapshots.length - 1] || {};
  const getBrands = (key: string) => {
    const data = latestSnapshot[key as keyof Snapshot] as Record<string, number> || {};
    return Object.keys(data).filter(b => b !== '_total' && BRAND_NAMES[b]);
  };

  // Build chart data for selected metric
  const buildChartData = (metric: string) => {
    return snapshots.map(s => {
      const values = s[metric as keyof Snapshot] as Record<string, number> || {};
      const row: Record<string, string | number> = { date: formatDate(s.date) };
      for (const [brand, val] of Object.entries(values)) {
        if (brand !== '_total' && BRAND_NAMES[brand]) {
          row[BRAND_NAMES[brand]] = val;
        }
      }
      return row;
    });
  };

  const chartData = buildChartData(activeChart);
  const brands = getBrands(activeChart).map(b => BRAND_NAMES[b]);

  // Calculate momentum (latest vs first snapshot)
  const calcMomentum = (metric: string, brand: string) => {
    if (snapshots.length < 7) return null;
    const latest = (snapshots[snapshots.length - 1][metric as keyof Snapshot] as Record<string, number>)?.[brand] || 0;
    const weekAgo = (snapshots[Math.max(0, snapshots.length - 8)][metric as keyof Snapshot] as Record<string, number>)?.[brand] || 0;
    if (weekAgo === 0) return null;
    return Math.round(((latest - weekAgo) / weekAgo) * 100);
  };

  // Facebook followers chart data
  const fbData = Object.entries(facebook.brands || {})
    .filter(([, d]) => d.followers && d.followers > 0)
    .map(([slug, d]) => ({
      brand: d.name || BRAND_NAMES[slug] || slug,
      Followers: d.followers || 0,
    }))
    .sort((a, b) => b.Followers - a.Followers);

  // Trustpilot current ratings as bar chart
  const trustpilotCurrent = Object.entries(
    (latestSnapshot.trustpilot as Record<string, number>) || {}
  )
    .filter(([b]) => BRAND_NAMES[b])
    .map(([brand, rating]) => ({
      brand: BRAND_NAMES[brand],
      Rating: typeof rating === 'number' ? rating : 0,
    }))
    .sort((a, b) => b.Rating - a.Rating);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Competitive Momentum
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Trends Over Time
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          {snapshots.length} days of daily snapshots tracking competitive signals across
          Reddit velocity, job postings, review ratings, and catalog size.
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Days Tracked</Text>
          <Metric className="text-socal-stone-800">{snapshots.length}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">
            {snapshots.length > 0 ? `${formatDate(snapshots[0].date)} - ${formatDate(snapshots[snapshots.length - 1].date)}` : ''}
          </Text>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Reddit Total (7d)</Text>
          <Metric className="text-socal-stone-800">
            {((latestSnapshot.reddit as Record<string, number>)?._total || 0).toLocaleString()}
          </Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Open Jobs</Text>
          <Metric className="text-socal-stone-800">
            {((latestSnapshot.jobs as Record<string, number>)?._total || 0).toLocaleString()}
          </Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Products Tracked</Text>
          <Metric className="text-socal-stone-800">
            {Object.entries((latestSnapshot.products as Record<string, number>) || {})
              .reduce((sum, [, v]) => sum + v, 0).toLocaleString()}
          </Metric>
        </Card>
      </div>

      {/* Chart Selector */}
      <div>
        <div className="flex gap-2 mb-6 overflow-x-auto" role="tablist">
          {CHARTS.map((chart) => (
            <button
              key={chart.id}
              onClick={() => setActiveChart(chart.id)}
              role="tab"
              aria-selected={activeChart === chart.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeChart === chart.id
                  ? 'bg-socal-ocean-600 text-white'
                  : 'bg-socal-sand-100 text-socal-stone-500 hover:bg-socal-sand-200'
              }`}
            >
              {chart.label}
            </button>
          ))}
        </div>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">
            {CHARTS.find(c => c.id === activeChart)?.label} Over Time
          </h3>
          <AreaChart
            data={chartData}
            index="date"
            categories={brands}
            colors={['cyan', 'rose', 'violet', 'amber', 'emerald', 'blue', 'orange', 'gray']}
            className="h-80"
            showAnimation
            showGridLines={false}
            valueFormatter={(v) => activeChart === 'trustpilot' ? v.toFixed(1) : v.toLocaleString()}
          />
        </Card>
      </div>

      {/* Momentum Cards */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-4">7-Day Momentum</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {getBrands(activeChart).map(brand => {
            const momentum = calcMomentum(activeChart, brand);
            const latest = (latestSnapshot[activeChart as keyof Snapshot] as Record<string, number>)?.[brand] || 0;
            return (
              <Card key={brand} className="bg-white border-socal-sand-100 ring-0 shadow-soft p-4">
                <Badge color={momentum !== null && momentum > 0 ? 'emerald' : momentum !== null && momentum < 0 ? 'rose' : 'gray'} size="xs">
                  {momentum !== null ? `${momentum > 0 ? '+' : ''}${momentum}%` : '--'}
                </Badge>
                <p className="text-sm font-medium text-socal-stone-700 mt-2">{BRAND_NAMES[brand]}</p>
                <p className="text-lg font-bold text-socal-stone-800">
                  {activeChart === 'trustpilot' ? latest.toFixed(1) : latest.toLocaleString()}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trustpilot Current Ratings */}
      {trustpilotCurrent.length > 0 && (
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">
            Current Trustpilot Ratings
          </h3>
          <BarChart
            data={trustpilotCurrent}
            index="brand"
            categories={['Rating']}
            colors={['amber']}
            layout="vertical"
            className="h-64"
            showAnimation
            showGridLines={false}
            valueFormatter={(v) => `${v.toFixed(1)} / 5.0`}
          />
        </Card>
      )}

      {/* Facebook Followers */}
      {fbData.length > 0 && (
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">
            Facebook Followers
          </h3>
          <BarChart
            data={fbData}
            index="brand"
            categories={['Followers']}
            colors={['blue']}
            layout="vertical"
            className="h-64"
            showAnimation
            showGridLines={false}
            valueFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`}
          />
        </Card>
      )}
    </div>
  );
}
