import { Card, Text, Metric, Badge } from '@tremor/react';
import { getRecentLaunches, getData } from '@/lib/data';
import { BRAND_COLORS } from '@/lib/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface BrandLaunchesPageProps {
  params: Promise<{ brandSlug: string }>;
}

// Generate static params for all brands
export async function generateStaticParams() {
  const data = getData();
  return Object.keys(data.brands).map((brandSlug) => ({ brandSlug }));
}

export default async function BrandLaunchesPage({ params }: BrandLaunchesPageProps) {
  const { brandSlug } = await params;

  // Get all launches for this brand
  const allLaunches = getRecentLaunches();
  const brandLaunches = allLaunches.filter(l => l.brandSlug === brandSlug);

  if (brandLaunches.length === 0) {
    // Check if brand exists at all
    const data = getData();
    if (!data.brands[brandSlug]) {
      notFound();
    }

    return (
      <div className="space-y-8">
        <div>
          <Link href="/launches" className="text-gr-accent hover:text-gr-accent text-sm">
            ← Back to Launch Calendar
          </Link>
        </div>
        <Card className="bg-gr-surface border-gr-border ring-0">
          <p className="text-gr-subtle text-center py-8">
            No recent launches found for {data.brands[brandSlug]?.name || brandSlug}.
            Check back after the next sitemap scan.
          </p>
        </Card>
      </div>
    );
  }

  const brandName = brandLaunches[0].brand;
  const totalProducts = brandLaunches.reduce((sum, l) => sum + l.count, 0);
  const totalDays = brandLaunches.length;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format category for display
  const formatCategory = (cat: string) => {
    if (cat === 'sports_bras') return 'Sports Bras';
    if (cat === 'other') return '';
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div>
        <Link href="/launches" className="text-gr-accent hover:text-gr-accent text-sm">
          ← Back to Launch Calendar
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Badge
          color={(BRAND_COLORS[brandSlug] || 'gray') as 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'}
          size="lg"
        >
          {brandName}
        </Badge>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gr-text">
            New Launches
          </h1>
          <Text className="text-gr-muted">
            {totalProducts} products across {totalDays} {totalDays === 1 ? 'day' : 'days'}
          </Text>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Total New Products</Text>
          <Metric className="text-gr-text">{totalProducts}</Metric>
        </Card>
        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Latest Launch</Text>
          <Metric className="text-gr-text text-xl">
            {brandLaunches[0]?.date || 'N/A'}
          </Metric>
        </Card>
        <Card className="bg-gr-surface border-gr-border ring-0">
          <Text className="text-gr-subtle">Avg per Day</Text>
          <Metric className="text-gr-text">
            {Math.round(totalProducts / totalDays)}
          </Metric>
        </Card>
      </div>

      {/* Launches by Date */}
      {brandLaunches
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((launch) => (
          <Card key={launch.date} className="bg-gr-surface border-gr-border ring-0">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gr-border">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <h2 className="font-semibold text-gr-text">{formatDate(launch.date)}</h2>
                  <Text className="text-gr-subtle text-sm">
                    {launch.count} new products
                  </Text>
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="space-y-2">
              {launch.products.map((product, i) => (
                <a
                  key={i}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-gr-raised rounded-lg border border-gr-border hover:border-gr-accent-soft transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-gr-text group-hover:text-gr-accent transition-colors truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {formatCategory(product.category) && (
                        <span className="text-xs text-gr-subtle bg-gr-border px-2 py-0.5 rounded">
                          {formatCategory(product.category)}
                        </span>
                      )}
                      <span className="text-xs text-gr-subtle bg-gr-border px-2 py-0.5 rounded">
                        {product.gender}
                      </span>
                    </div>
                  </div>
                  <span className="text-gr-subtle group-hover:text-gr-accent transition-colors ml-2">
                    →
                  </span>
                </a>
              ))}

              {launch.count > launch.products.length && (
                <p className="text-sm text-gr-subtle text-center py-2">
                  Showing {launch.products.length} of {launch.count} products
                </p>
              )}
            </div>
          </Card>
        ))}

      {/* Back link at bottom */}
      <div className="pt-4">
        <Link href="/launches" className="text-gr-accent hover:text-gr-accent">
          ← Back to Launch Calendar
        </Link>
      </div>
    </div>
  );
}
