import productsData from '@/data/products.json';
import { DashboardData, BrandData, VuoriScorecard, ColorMixRow, LaunchData, BRAND_ORDER } from './types';

export function getData(): DashboardData {
  return productsData as unknown as DashboardData;
}

export function getBrands(): BrandData[] {
  const data = getData();
  return BRAND_ORDER
    .filter((slug) => data.brands[slug])
    .map((slug) => data.brands[slug]);
}

export function getBrand(slug: string): BrandData | null {
  const data = getData();
  return data.brands[slug] || null;
}

export function getMarketAverage(subcategory: string): number {
  const data = getData();
  const counts = data.bySubcategory[subcategory] || {};
  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
  return Math.round(total / Object.keys(data.brands).length);
}

export function getBrandIndex(brandSlug: string, subcategory: string): number {
  const data = getData();
  const brand = data.brands[brandSlug];
  if (!brand) return 0;

  const brandCount = brand.subcategories[subcategory] || 0;
  const avgCount = getMarketAverage(subcategory);

  if (avgCount === 0) return 0;
  return Math.round((brandCount / avgCount) * 100);
}

export function getSubcategoryLeaders(subcategory: string): Array<{ brand: string; slug: string; count: number; pct: number }> {
  const data = getData();
  const counts = data.bySubcategory[subcategory] || {};

  return Object.entries(counts)
    .map(([slug, count]) => {
      const brand = data.brands[slug];
      return {
        brand: brand?.name || slug,
        slug,
        count,
        pct: brand ? Math.round((count / brand.total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getCategoryLeaders(category: string): Array<{ brand: string; slug: string; count: number; pct: number }> {
  const data = getData();
  const counts = data.byCategory[category] || {};

  return Object.entries(counts)
    .map(([slug, count]) => {
      const brand = data.brands[slug];
      return {
        brand: brand?.name || slug,
        slug,
        count,
        pct: brand ? Math.round((count / brand.total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getTopSubcategories(limit = 10): string[] {
  const data = getData();
  const totals: Record<string, number> = {};

  for (const [subcat, counts] of Object.entries(data.bySubcategory)) {
    totals[subcat] = Object.values(counts).reduce((sum, c) => sum + c, 0);
  }

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([subcat]) => subcat);
}

export function formatSubcategory(subcat: string): string {
  return subcat
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatCategory(cat: string): string {
  if (cat === 'sports_bras') return 'Sports Bras';
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function getColorMix(): ColorMixRow[] {
  const data = getData();
  return data.colorMix || [];
}

export function getVuoriScorecard(): VuoriScorecard {
  const data = getData();
  return data.vuoriScorecard || { leading: [], lagging: [], alerts: [] };
}

export function getColorLeaders(colorFamily: string): Array<{ brand: string; slug: string; count: number; pct: number }> {
  const data = getData();
  const counts = data.byColor?.[colorFamily] || {};

  return Object.entries(counts)
    .map(([slug, count]) => {
      const brand = data.brands[slug];
      return {
        brand: brand?.name || slug,
        slug,
        count,
        pct: brand ? Math.round((count / brand.total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function getBrandColorDepth(): Array<{ brand: string; slug: string; avgColors: number; uniqueStyles: number; coverage: number }> {
  const data = getData();
  return BRAND_ORDER
    .filter((slug) => data.brands[slug])
    .map((slug) => {
      const brand = data.brands[slug];
      return {
        brand: brand.name,
        slug,
        avgColors: brand.avgColorsPerStyle,
        uniqueStyles: brand.uniqueStyles,
        coverage: brand.colorCoverage,
      };
    })
    .sort((a, b) => b.avgColors - a.avgColors);
}

export function formatColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

export function getRecentLaunches(): LaunchData[] {
  const data = getData();
  return data.recentLaunches || [];
}

export function getLaunchVelocity(): Record<string, Record<string, number>> {
  const data = getData();
  return data.launchVelocity || {};
}

export function getLaunchSummary(): {
  totalNewProducts: number;
  byBrand: Array<{ brand: string; brandSlug: string; count: number }>;
  latestDate: string;
} {
  const launches = getRecentLaunches();

  // Group by brand
  const brandCounts: Record<string, { brand: string; count: number }> = {};
  let latestDate = '';

  for (const launch of launches) {
    if (!brandCounts[launch.brandSlug]) {
      brandCounts[launch.brandSlug] = { brand: launch.brand, count: 0 };
    }
    brandCounts[launch.brandSlug].count += launch.count;

    if (launch.date > latestDate) {
      latestDate = launch.date;
    }
  }

  const byBrand = Object.entries(brandCounts)
    .map(([brandSlug, { brand, count }]) => ({ brand, brandSlug, count }))
    .sort((a, b) => b.count - a.count);

  const totalNewProducts = byBrand.reduce((sum, b) => sum + b.count, 0);

  return { totalNewProducts, byBrand, latestDate };
}
