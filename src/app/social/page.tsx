'use client';

import { Card, BarChart, Text, Metric, Badge } from '@tremor/react';
import socialData from '@/data/social.json';

interface SocialData {
  reddit: {
    mentions_total: number;
    posts: Array<{
      brand: string;
      subreddit: string;
      title: string;
      url: string;
      date: string;
      sentiment: string;
    }>;
    last_check: string;
  };
  velocity: Record<string, { mentions_7d: number; mentions_per_day: number }>;
  trending: Array<{
    brand: string;
    subreddit: string;
    title: string;
    url: string;
    sentiment: string;
  }>;
  sentiment: Record<string, { positive: number; negative: number; neutral: number }>;
  trends: {
    brands: Record<string, { current: number; wow_change: number | null; mom_change: number | null }>;
    categories: Record<string, { current: number; wow_change: number | null; mom_change: number | null }>;
  };
  generated_at: string;
}

const data = socialData as unknown as SocialData;

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori',
  lululemon: 'Lululemon',
  alo: 'Alo Yoga',
  gymshark: 'Gymshark',
  outdoor_voices: 'Outdoor Voices',
  tenthousand: 'Ten Thousand',
  rhone: 'Rhone',
  on_running: 'On Running',
};

const BRAND_COLORS: Record<string, 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'> = {
  vuori: 'cyan',
  lululemon: 'rose',
  alo: 'violet',
  gymshark: 'amber',
  outdoor_voices: 'emerald',
  tenthousand: 'blue',
  on_running: 'orange',
  rhone: 'gray',
};

export default function SocialPage() {
  const velocity = data.velocity || {};
  const trending = data.trending || [];
  const sentiment = data.sentiment || {};
  const categories = data.trends?.categories || {};

  // Sort brands by velocity
  const sortedVelocity = Object.entries(velocity)
    .filter(([, v]) => v.mentions_7d > 0)
    .sort((a, b) => b[1].mentions_7d - a[1].mentions_7d);

  // Chart data for velocity
  const velocityChartData = sortedVelocity.map(([brand, v]) => ({
    brand: BRAND_NAMES[brand] || brand,
    'Mentions (7d)': v.mentions_7d,
  }));

  // Calculate sentiment percentages
  const sentimentData = Object.entries(sentiment)
    .filter(([brand]) => velocity[brand]?.mentions_7d > 0)
    .map(([brand, s]) => {
      const total = s.positive + s.negative + s.neutral;
      return {
        brand: BRAND_NAMES[brand] || brand,
        slug: brand,
        positive: total > 0 ? Math.round((s.positive / total) * 100) : 0,
        negative: total > 0 ? Math.round((s.negative / total) * 100) : 0,
        neutral: total > 0 ? Math.round((s.neutral / total) * 100) : 0,
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Category trends
  const categoryData = Object.entries(categories)
    .map(([cat, d]) => ({
      category: cat.charAt(0).toUpperCase() + cat.slice(1),
      'Search Interest': d.current,
    }))
    .sort((a, b) => b['Search Interest'] - a['Search Interest']);

  const totalMentions = data.reddit?.mentions_total || 0;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Social Intelligence
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Social Velocity
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Track brand mentions across Reddit and search trends.
          Social buzz often precedes product demand.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Total Mentions</Text>
          <Metric className="text-socal-stone-800">{totalMentions}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Last 30 days</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Top Brand</Text>
          <Metric className="text-socal-ocean-600">
            {sortedVelocity[0] ? BRAND_NAMES[sortedVelocity[0][0]] : '-'}
          </Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">
            {sortedVelocity[0] ? `${sortedVelocity[0][1].mentions_7d} mentions/week` : ''}
          </Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Vuori Rank</Text>
          <Metric className="text-socal-stone-800">
            #{sortedVelocity.findIndex(([b]) => b === 'vuori') + 1 || '-'}
          </Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">
            {velocity.vuori ? `${velocity.vuori.mentions_7d} mentions/week` : ''}
          </Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Brands Tracked</Text>
          <Metric className="text-socal-stone-800">{Object.keys(velocity).length}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">via Reddit + Trends</Text>
        </Card>
      </div>

      {/* Key Insight */}
      {sortedVelocity.length > 0 && (
        <Card className="bg-gradient-to-r from-socal-sand-50 to-socal-ocean-50 border-socal-sand-200 ring-0 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <Text className="text-socal-stone-400 mb-2">The Buzz</Text>
              <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
                <span className="text-socal-ocean-600">{BRAND_NAMES[sortedVelocity[0][0]]}</span>{' '}
                dominates social conversation
              </h2>
              <p className="text-socal-stone-500">
                With {sortedVelocity[0][1].mentions_per_day} mentions per day,
                {sortedVelocity[0] && sortedVelocity[1] && (
                  <> {Math.round(sortedVelocity[0][1].mentions_7d / sortedVelocity[1][1].mentions_7d * 10) / 10}x more than {BRAND_NAMES[sortedVelocity[1][0]]}</>
                )}.
                High social velocity often signals growing brand awareness.
              </p>
            </div>
            <div className="text-center md:text-right">
              <Metric className="text-socal-ocean-600 text-5xl md:text-6xl font-bold">
                {sortedVelocity[0][1].mentions_per_day}
              </Metric>
              <Text className="text-socal-stone-400">mentions/day</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Velocity Chart */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Brand Mention Velocity
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Reddit mentions in the last 7 days
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={velocityChartData}
            index="brand"
            categories={['Mentions (7d)']}
            colors={['cyan']}
            className="h-72"
            showAnimation
            showGridLines={false}
            layout="vertical"
          />
        </Card>
      </div>

      {/* Sentiment Analysis */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Sentiment Analysis
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Positive vs negative mentions based on keyword analysis
        </Text>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sentimentData.slice(0, 8).map((brand) => (
            <Card key={brand.slug} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
              <Badge color={BRAND_COLORS[brand.slug] || 'gray'} size="sm">
                {brand.brand}
              </Badge>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-socal-sage-600">Positive</span>
                  <span className="font-medium">{brand.positive}%</span>
                </div>
                <div className="w-full bg-socal-stone-100 rounded-full h-2">
                  <div
                    className="bg-socal-sage-500 h-2 rounded-full"
                    style={{ width: `${brand.positive}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-socal-sunset-600">Negative</span>
                  <span className="font-medium">{brand.negative}%</span>
                </div>
                <div className="w-full bg-socal-stone-100 rounded-full h-2">
                  <div
                    className="bg-socal-sunset-500 h-2 rounded-full"
                    style={{ width: `${brand.negative}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-socal-stone-400 mt-2">{brand.total} mentions</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Category Trends */}
      {categoryData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
            Category Search Interest
          </h2>
          <Text className="text-socal-stone-500 mb-6">
            Google Trends data for athleisure categories (0-100 scale)
          </Text>

          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <BarChart
              data={categoryData}
              index="category"
              categories={['Search Interest']}
              colors={['emerald']}
              className="h-64"
              showAnimation
              showGridLines={false}
              layout="vertical"
            />
          </Card>
        </div>
      )}

      {/* Trending Discussions */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Trending Discussions
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Recent Reddit posts mentioning tracked brands
        </Text>

        <div className="space-y-3">
          {trending.slice(0, 8).map((post, i) => (
            <Card key={i} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <Badge color={BRAND_COLORS[post.brand] || 'gray'} size="sm">
                    {BRAND_NAMES[post.brand] || post.brand}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-socal-stone-700 hover:text-socal-ocean-600 font-medium line-clamp-2"
                  >
                    {post.title}
                  </a>
                  <p className="text-xs text-socal-stone-400 mt-1">
                    r/{post.subreddit} •{' '}
                    <span className={
                      post.sentiment === 'positive' ? 'text-socal-sage-600' :
                      post.sentiment === 'negative' ? 'text-socal-sunset-600' :
                      'text-socal-stone-400'
                    }>
                      {post.sentiment}
                    </span>
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Data Quality Note */}
      <Card className="bg-socal-sand-50 border-socal-sand-200 ring-0">
        <div className="flex items-start gap-4">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="font-semibold text-socal-stone-700">About This Data</h3>
            <p className="text-sm text-socal-stone-500 mt-1">
              Social mentions are tracked via Reddit RSS feeds from r/lululemon, r/Gymshark, r/running,
              r/xxfitness, r/fitness, and r/yoga. Google Trends data provides search interest scores.
              Sentiment is estimated using keyword analysis. Data updates every 4 hours.
            </p>
            {data.generated_at && (
              <p className="text-xs text-socal-stone-400 mt-2">
                Last updated: {new Date(data.generated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
