/**
 * Data preprocessing script
 * Transforms competitive-intel state.json into optimized dashboard format
 *
 * Run with: npx tsx scripts/prepare-data.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface Product {
  url: string;
  first_seen: string;
  gender: string;
  category: string;
  subcategory: string;
}

interface StateJson {
  sitemap_products: Record<string, Record<string, Product>>;
}

interface BrandData {
  name: string;
  slug: string;
  total: number;
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  genders: Record<string, number>;
}

interface Insight {
  type: 'leader' | 'gap' | 'trend' | 'comparison';
  metric: string;
  text: string;
  brand?: string;
  value?: number;
}

interface DashboardData {
  brands: Record<string, BrandData>;
  totals: {
    products: number;
    brands: number;
    categories: number;
    subcategories: number;
  };
  byCategory: Record<string, Record<string, number>>;
  bySubcategory: Record<string, Record<string, number>>;
  categoryMix: Array<{
    brand: string;
    bottoms: number;
    tops: number;
    outerwear: number;
    dresses: number;
    sports_bras: number;
    accessories: number;
    other: number;
  }>;
  insights: Insight[];
  generated_at: string;
}

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori',
  lululemon: 'Lululemon',
  alo: 'Alo Yoga',
  gymshark: 'Gymshark',
  outdoor_voices: 'Outdoor Voices',
  tenthousand: 'Ten Thousand',
};

const CATEGORY_ORDER = ['bottoms', 'tops', 'outerwear', 'dresses', 'sports_bras', 'accessories', 'other'];

function loadStateJson(): StateJson {
  const statePath = path.join(__dirname, '../../..', 'competitive-intel/data/state.json');
  console.log(`Loading state from: ${statePath}`);
  const content = fs.readFileSync(statePath, 'utf-8');
  return JSON.parse(content);
}

function processProducts(state: StateJson): DashboardData {
  const brands: Record<string, BrandData> = {};
  const byCategory: Record<string, Record<string, number>> = {};
  const bySubcategory: Record<string, Record<string, number>> = {};
  const allCategories = new Set<string>();
  const allSubcategories = new Set<string>();

  // Process each brand
  for (const [brandSlug, products] of Object.entries(state.sitemap_products)) {
    const brandName = BRAND_NAMES[brandSlug] || brandSlug;
    const productList = Object.values(products);

    const categories: Record<string, number> = {};
    const subcategories: Record<string, number> = {};
    const genders: Record<string, number> = {};

    for (const product of productList) {
      const cat = product.category || 'other';
      const subcat = product.subcategory || 'other';
      const gender = product.gender || 'unisex';

      categories[cat] = (categories[cat] || 0) + 1;
      subcategories[subcat] = (subcategories[subcat] || 0) + 1;
      genders[gender] = (genders[gender] || 0) + 1;

      allCategories.add(cat);
      allSubcategories.add(subcat);

      // Aggregate by category
      if (!byCategory[cat]) byCategory[cat] = {};
      byCategory[cat][brandSlug] = (byCategory[cat][brandSlug] || 0) + 1;

      // Aggregate by subcategory
      if (!bySubcategory[subcat]) bySubcategory[subcat] = {};
      bySubcategory[subcat][brandSlug] = (bySubcategory[subcat][brandSlug] || 0) + 1;
    }

    brands[brandSlug] = {
      name: brandName,
      slug: brandSlug,
      total: productList.length,
      categories,
      subcategories,
      genders,
    };
  }

  // Calculate category mix (percentages)
  const categoryMix = Object.entries(brands)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([slug, brand]) => {
      const total = brand.total;
      const mix: Record<string, number> = { brand: brand.name } as any;
      for (const cat of CATEGORY_ORDER) {
        mix[cat] = Math.round(((brand.categories[cat] || 0) / total) * 1000) / 10;
      }
      return mix as any;
    });

  // Calculate totals
  const totalProducts = Object.values(brands).reduce((sum, b) => sum + b.total, 0);

  // Generate insights
  const insights = generateInsights(brands, byCategory, bySubcategory, totalProducts);

  return {
    brands,
    totals: {
      products: totalProducts,
      brands: Object.keys(brands).length,
      categories: allCategories.size,
      subcategories: allSubcategories.size,
    },
    byCategory,
    bySubcategory,
    categoryMix,
    insights,
    generated_at: new Date().toISOString(),
  };
}

function generateInsights(
  brands: Record<string, BrandData>,
  byCategory: Record<string, Record<string, number>>,
  bySubcategory: Record<string, Record<string, number>>,
  totalProducts: number
): Insight[] {
  const insights: Insight[] = [];
  const brandCount = Object.keys(brands).length;

  // Find leaders by subcategory
  const keySubcategories = ['shorts', 'leggings', 'joggers', 'hoodies', 'tanks'];
  for (const subcat of keySubcategories) {
    const counts = bySubcategory[subcat] || {};
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [leader, count] = sorted[0];
      const brandData = brands[leader];
      const pctOfCatalog = Math.round((count / brandData.total) * 1000) / 10;

      // Calculate market average
      const totalInSubcat = Object.values(counts).reduce((s, c) => s + c, 0);
      const avgCount = totalInSubcat / brandCount;
      const indexVsMarket = Math.round((count / avgCount) * 100);

      if (indexVsMarket > 120) {
        insights.push({
          type: 'leader',
          metric: subcat,
          brand: brandData.name,
          value: count,
          text: `${brandData.name} leads ${subcat} with ${count} products (${pctOfCatalog}% of catalog, ${indexVsMarket}% vs market avg)`,
        });
      }
    }
  }

  // Find gaps (brands under-indexing)
  for (const [slug, brand] of Object.entries(brands)) {
    // Check for tennis dresses
    const dressCount = brand.subcategories['dresses'] || 0;
    const tennisDressCount = brand.subcategories['tennis_dresses'] || 0;

    if (brand.total > 500 && tennisDressCount < 10) {
      insights.push({
        type: 'gap',
        metric: 'tennis_dresses',
        brand: brand.name,
        value: tennisDressCount,
        text: `${brand.name} has minimal tennis dress presence (${tennisDressCount} products, ${Math.round((tennisDressCount / brand.total) * 1000) / 10}%)`,
      });
    }
  }

  // Find catalog size comparisons
  const sortedBySize = Object.entries(brands).sort((a, b) => b[1].total - a[1].total);
  const largest = sortedBySize[0];
  const smallest = sortedBySize[sortedBySize.length - 1];

  insights.push({
    type: 'comparison',
    metric: 'catalog_size',
    text: `${largest[1].name} has ${Math.round(largest[1].total / smallest[1].total)}x the catalog of ${smallest[1].name} (${largest[1].total.toLocaleString()} vs ${smallest[1].total.toLocaleString()} products)`,
  });

  // Bottoms-focused brands
  for (const [slug, brand] of Object.entries(brands)) {
    const bottomsPct = ((brand.categories['bottoms'] || 0) / brand.total) * 100;
    if (bottomsPct > 40) {
      insights.push({
        type: 'trend',
        metric: 'bottoms_focus',
        brand: brand.name,
        value: Math.round(bottomsPct),
        text: `${brand.name} is bottoms-focused: ${Math.round(bottomsPct)}% of catalog in bottoms category`,
      });
    }
  }

  return insights.slice(0, 8); // Limit to top 8 insights
}

function main() {
  console.log('Preparing dashboard data...\n');

  const state = loadStateJson();
  const data = processProducts(state);

  // Log summary
  console.log(`\n=== Summary ===`);
  console.log(`Total products: ${data.totals.products.toLocaleString()}`);
  console.log(`Brands: ${data.totals.brands}`);
  console.log(`Categories: ${data.totals.categories}`);
  console.log(`Subcategories: ${data.totals.subcategories}`);
  console.log(`\nInsights generated: ${data.insights.length}`);

  // Write output
  const outputPath = path.join(__dirname, '../data/products.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nData written to: ${outputPath}`);
}

main();
