'use client';

import { Card, BarChart, Text, Metric, Badge } from '@tremor/react';
import socialData from '@/data/social.json';
import pinterestData from '@/data/pinterest.json';
import grokData from '@/data/grok_insights.json';

interface TrustpilotData {
  rating: number | null;
  total_reviews: number | null;
  recent_reviews: Array<{ title: string; text: string; stars: number | null }>;
  url: string;
  checked_at: string;
}

interface PinterestPin {
  id: string;
  url: string;
  image: string;
  description: string;
}

interface PinterestBrandData {
  name: string;
  queries: Array<{ query: string; pin_count: number }>;
  total_pins: number;
  sample_pins: PinterestPin[];
}

interface PinterestData {
  brands: Record<string, PinterestBrandData>;
  categories: Record<string, { pin_count: number; sample_pins: PinterestPin[] }>;
  generated_at: string;
}

interface YouTubeVideo {
  video_id: string;
  title: string;
  url: string;
  brand: string;
  query: string;
  sentiment: string;
  channel?: string;
  views?: number;
  views_text?: string;
  published?: string;
  length?: string;
}

interface GrokEmail {
  msg_id: string;
  subject: string;
  date: string;
  body_preview: string;
  brand_mentions: Record<string, number>;
  themes: string[];
  fetched_at: string;
}

interface GrokData {
  emails: GrokEmail[];
  brand_mentions: Record<string, number>;
  last_check: string | null;
  generated_at: string | null;
  email_count: number;
}

interface SocialData {
  reddit: {
    mentions_total: number;
    subreddits_checked?: number;
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
  youtube?: {
    videos: YouTubeVideo[];
    video_count: number;
    last_check: string;
  };
  trustpilot?: Record<string, TrustpilotData>;
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
const pinterest = pinterestData as unknown as PinterestData;
const grok = grokData as unknown as GrokData;

const THEME_LABELS: Record<string, string> = {
  product_launch: 'Launch',
  sustainability: 'Sustainability',
  retail: 'Retail',
  partnership: 'Partnership',
  pricing: 'Pricing',
  culture: 'Culture',
};

const THEME_COLORS: Record<string, 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue'> = {
  product_launch: 'rose',
  sustainability: 'emerald',
  retail: 'blue',
  partnership: 'violet',
  pricing: 'amber',
  culture: 'cyan',
};

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

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          className={`text-lg ${
            i < fullStars
              ? 'text-yellow-400'
              : i === fullStars && hasHalf
              ? 'text-yellow-400'
              : 'text-gr-border'
          }`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function SocialPage() {
  const velocity = data.velocity || {};
  const trending = data.trending || [];
  const sentiment = data.sentiment || {};
  const categories = data.trends?.categories || {};
  const trustpilot = data.trustpilot || {};
  const youtube = data.youtube || { videos: [], video_count: 0 };

  // Pinterest data
  const pinterestBrands = pinterest.brands || {};
  const pinterestSorted = Object.entries(pinterestBrands)
    .filter(([, d]) => d.total_pins > 0)
    .sort((a, b) => b[1].total_pins - a[1].total_pins);
  const totalPins = pinterestSorted.reduce((sum, [, d]) => sum + d.total_pins, 0);

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

  // Trustpilot sorted by rating
  const trustpilotSorted = Object.entries(trustpilot)
    .filter(([, d]) => d.rating !== null)
    .sort((a, b) => (b[1].rating || 0) - (a[1].rating || 0));

  // YouTube videos grouped by brand
  const youtubeByBrand: Record<string, YouTubeVideo[]> = {};
  for (const video of youtube.videos || []) {
    if (!youtubeByBrand[video.brand]) {
      youtubeByBrand[video.brand] = [];
    }
    youtubeByBrand[video.brand].push(video);
  }

  const totalMentions = data.reddit?.mentions_total || 0;
  const subredditsChecked = data.reddit?.subreddits_checked || 9;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <Text className="text-gr-accent uppercase tracking-wider text-sm mb-2">
          Social Intelligence
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-gr-text mb-4">
          Social Velocity
        </h1>
        <p className="text-gr-muted text-lg leading-relaxed">
          Track brand mentions across Reddit, YouTube reviews, and Trustpilot ratings.
          Social buzz often precedes product demand.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Reddit Mentions</Text>
          <Metric className="text-gr-text">{totalMentions}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">{subredditsChecked} subreddits</Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">YouTube Videos</Text>
          <Metric className="text-gr-accent">{youtube.video_count || 0}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">Recent reviews/hauls</Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Pinterest Pins</Text>
          <Metric className="text-gr-accent">{totalPins}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">{pinterestSorted.length} brands tracked</Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">X/Twitter Digests</Text>
          <Metric className="text-gr-text">{grok.email_count || 0}</Metric>
          <Text className="text-xs text-gr-subtle mt-1">
            {Object.keys(grok.brand_mentions || {}).length} brands mentioned
          </Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Vuori Rank</Text>
          <Metric className="text-gr-text">
            #{sortedVelocity.findIndex(([b]) => b === 'vuori') + 1 || '-'}
          </Metric>
          <Text className="text-xs text-gr-subtle mt-1">
            {velocity.vuori ? `${velocity.vuori.mentions_7d} mentions/week` : ''}
          </Text>
        </Card>

        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Trustpilot Avg</Text>
          <Metric className="text-gr-text">
            {trustpilotSorted.length > 0
              ? (trustpilotSorted.reduce((sum, [, d]) => sum + (d.rating || 0), 0) / trustpilotSorted.length).toFixed(1)
              : '-'}
          </Metric>
          <Text className="text-xs text-gr-subtle mt-1">{trustpilotSorted.length} brands rated</Text>
        </Card>
      </div>

      {/* Key Insight */}
      {sortedVelocity.length > 0 && (
        <Card className="bg-gradient-to-r from-gr-raised to-gr-accent-soft border-gr-border ring-0 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <Text className="text-gr-subtle mb-2">The Buzz</Text>
              <h2 className="text-2xl md:text-3xl font-bold text-gr-text mb-3">
                <span className="text-gr-accent">{BRAND_NAMES[sortedVelocity[0][0]]}</span>{' '}
                dominates social conversation
              </h2>
              <p className="text-gr-muted">
                With {sortedVelocity[0][1].mentions_per_day} mentions per day,
                {sortedVelocity[0] && sortedVelocity[1] && (
                  <> {Math.round(sortedVelocity[0][1].mentions_7d / sortedVelocity[1][1].mentions_7d * 10) / 10}x more than {BRAND_NAMES[sortedVelocity[1][0]]}</>
                )}.
                High social velocity often signals growing brand awareness.
              </p>
            </div>
            <div className="text-center md:text-right">
              <Metric className="text-gr-accent text-5xl md:text-6xl font-bold">
                {sortedVelocity[0][1].mentions_per_day}
              </Metric>
              <Text className="text-gr-subtle">mentions/day</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Trustpilot Ratings */}
      {trustpilotSorted.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            Trustpilot Ratings
          </h2>
          <Text className="text-gr-muted mb-6">
            Customer satisfaction scores from verified reviews
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trustpilotSorted.map(([brand, tpData]) => (
              <Card key={brand} className="bg-gr-surface border-gr-border ring-0">
                <div className="flex items-center justify-between mb-2">
                  <Badge color={BRAND_COLORS[brand] || 'gray'} size="sm">
                    {BRAND_NAMES[brand] || brand}
                  </Badge>
                  <span className="text-2xl font-bold text-gr-text">
                    {tpData.rating?.toFixed(1)}
                  </span>
                </div>
                <StarRating rating={tpData.rating || 0} />
                <p className="text-xs text-gr-subtle mt-2">
                  {tpData.total_reviews ? `${tpData.total_reviews.toLocaleString()} reviews` : 'Reviews available'}
                </p>
                <a
                  href={tpData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gr-accent hover:underline mt-1 block"
                >
                  View on Trustpilot →
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pinterest Visual Trends */}
      {pinterestSorted.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            Pinterest Visual Trends
          </h2>
          <Text className="text-gr-muted mb-6">
            Trending pins and outfit inspiration for tracked brands
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pinterestSorted.map(([brand, brandData]) => (
              <Card key={brand} className="bg-gr-surface border-gr-border ring-0">
                <div className="flex items-center justify-between mb-4">
                  <Badge color={BRAND_COLORS[brand] || 'gray'} size="sm">
                    {brandData.name}
                  </Badge>
                  <span className="text-sm font-medium text-gr-muted">
                    {brandData.total_pins} pins
                  </span>
                </div>

                {/* Pin Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {brandData.sample_pins.slice(0, 6).map((pin) => (
                    <a
                      key={pin.id}
                      href={pin.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden bg-gr-border hover:opacity-80 transition-opacity"
                    >
                      {pin.image && (
                        <img
                          src={pin.image}
                          alt={pin.description || 'Pinterest pin'}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </a>
                  ))}
                </div>

                <p className="text-xs text-gr-subtle">
                  Search: &quot;{brandData.queries[0]?.query}&quot;
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* X/Twitter Insights */}
      {(grok.emails?.length > 0 || Object.keys(grok.brand_mentions || {}).length > 0) && (
        <div>
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            X/Twitter Insights
          </h2>
          <Text className="text-gr-muted mb-6">
            Brand intelligence from Grok&apos;s daily X/Twitter digests
          </Text>

          {/* Brand mention counts */}
          {Object.keys(grok.brand_mentions || {}).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              {Object.entries(grok.brand_mentions)
                .sort((a, b) => b[1] - a[1])
                .map(([brand, count]) => (
                  <Card key={brand} className="bg-gr-surface border-gr-border ring-0 text-center">
                    <Badge color={BRAND_COLORS[brand] || 'gray'} size="sm">
                      {BRAND_NAMES[brand] || brand}
                    </Badge>
                    <Metric className="text-gr-text mt-2 text-2xl">{count}</Metric>
                    <Text className="text-xs text-gr-subtle">mentions</Text>
                  </Card>
                ))}
            </div>
          )}

          {/* Recent email digests */}
          <div className="space-y-4">
            {grok.emails?.slice(0, 5).map((email) => (
              <Card key={email.msg_id} className="bg-gr-surface border-gr-border ring-0">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="font-medium text-gr-text line-clamp-1">
                      {email.subject}
                    </h3>
                    <Text className="text-xs text-gr-subtle mt-1">
                      {email.date ? new Date(email.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                      }) : 'Unknown date'}
                    </Text>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                    {email.themes?.map((theme) => (
                      <Badge key={theme} color={THEME_COLORS[theme] || 'gray'} size="sm">
                        {THEME_LABELS[theme] || theme}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gr-muted line-clamp-4 whitespace-pre-line">
                  {email.body_preview?.slice(0, 500)}
                </p>
                {Object.keys(email.brand_mentions || {}).length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {Object.entries(email.brand_mentions)
                      .sort((a, b) => b[1] - a[1])
                      .map(([brand, count]) => (
                        <span key={brand} className="text-xs text-gr-subtle">
                          {BRAND_NAMES[brand] || brand} ({count})
                        </span>
                      ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Velocity Chart */}
      <div>
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Brand Mention Velocity
        </h2>
        <Text className="text-gr-muted mb-6">
          Reddit mentions in the last 7 days across {subredditsChecked} subreddits
        </Text>

        <Card className="bg-gr-surface border-gr-border ring-0">
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
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Sentiment Analysis
        </h2>
        <Text className="text-gr-muted mb-6">
          Positive vs negative mentions based on keyword analysis
        </Text>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sentimentData.slice(0, 8).map((brand) => (
            <Card key={brand.slug} className="bg-gr-surface border-gr-border ring-0">
              <Badge color={BRAND_COLORS[brand.slug] || 'gray'} size="sm">
                {brand.brand}
              </Badge>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gr-success">Positive</span>
                  <span className="font-medium">{brand.positive}%</span>
                </div>
                <div className="w-full bg-gr-raised rounded-full h-2">
                  <div
                    className="bg-gr-success h-2 rounded-full"
                    style={{ width: `${brand.positive}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gr-accent">Negative</span>
                  <span className="font-medium">{brand.negative}%</span>
                </div>
                <div className="w-full bg-gr-raised rounded-full h-2">
                  <div
                    className="bg-gr-accent h-2 rounded-full"
                    style={{ width: `${brand.negative}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-gr-subtle mt-2">{brand.total} mentions</p>
            </Card>
          ))}
        </div>
      </div>

      {/* YouTube Reviews */}
      {youtube.video_count > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            YouTube Reviews & Hauls
          </h2>
          <Text className="text-gr-muted mb-6">
            Recent video content featuring tracked brands
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(youtubeByBrand).slice(0, 4).map(([brand, videos]) => (
              <Card key={brand} className="bg-gr-surface border-gr-border ring-0">
                <Badge color={BRAND_COLORS[brand] || 'gray'} size="sm" className="mb-3">
                  {BRAND_NAMES[brand] || brand}
                </Badge>
                <div className="space-y-3">
                  {videos.slice(0, 3).map((video) => (
                    <div key={video.video_id} className="border-b border-gr-border pb-2 last:border-0">
                      <a
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-gr-text hover:text-gr-accent font-medium line-clamp-2"
                      >
                        {video.title}
                      </a>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gr-subtle">
                        {video.channel && <span>{video.channel}</span>}
                        {video.views_text && <span>• {video.views_text}</span>}
                        {video.published && <span>• {video.published}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gr-subtle mt-3">
                  {videos.length} videos found
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Category Trends */}
      {categoryData.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gr-text mb-2">
            Category Search Interest
          </h2>
          <Text className="text-gr-muted mb-6">
            Google Trends data for athleisure categories (0-100 scale)
          </Text>

          <Card className="bg-gr-surface border-gr-border ring-0">
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
        <h2 className="text-xl font-semibold text-gr-text mb-2">
          Trending Discussions
        </h2>
        <Text className="text-gr-muted mb-6">
          Recent Reddit posts mentioning tracked brands
        </Text>

        <div className="space-y-3">
          {trending.slice(0, 8).map((post, i) => (
            <Card key={i} className="bg-gr-surface border-gr-border ring-0">
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
                    className="text-gr-text hover:text-gr-accent font-medium line-clamp-2"
                  >
                    {post.title}
                  </a>
                  <p className="text-xs text-gr-subtle mt-1">
                    r/{post.subreddit} •{' '}
                    <span className={
                      post.sentiment === 'positive' ? 'text-gr-success' :
                      post.sentiment === 'negative' ? 'text-gr-accent' :
                      'text-gr-subtle'
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
      <Card className="bg-gr-raised border-gr-border ring-0">
        <div className="flex items-start gap-4">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="font-semibold text-gr-text">About This Data</h3>
            <p className="text-sm text-gr-muted mt-1">
              Social mentions are tracked via Reddit RSS feeds from {subredditsChecked} subreddits including
              r/lululemon, r/Gymshark, r/running, r/xxfitness, r/crossfit, r/Peloton, r/tennis, and more.
              YouTube videos are discovered via search. Trustpilot ratings are scraped from public review pages.
              Pinterest pins are collected using browser automation to capture visual trends.
              X/Twitter insights are extracted from Grok&apos;s daily digest emails.
              Sentiment is estimated using keyword analysis. Data updates every 4 hours.
            </p>
            {data.generated_at && (
              <p className="text-xs text-gr-subtle mt-2">
                Last updated: {new Date(data.generated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
