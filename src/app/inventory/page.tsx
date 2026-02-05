'use client';

import { Card, BarChart, Text, Metric, Badge } from '@tremor/react';
import inventoryData from '@/data/inventory.json';
import selloutData from '@/data/sellouts.json';

interface InventoryProduct {
  handle: string;
  title: string;
  product_type: string;
  any_available: boolean;
  available_count: number;
  total_variants: number;
  availability_pct: number;
  created_at: string;
  checked_at: string;
}

interface InventoryData {
  products: Record<string, InventoryProduct>;
  last_check: string;
}

interface SelloutData {
  sellouts: Array<{
    product_id: string;
    title: string;
    product_type: string;
    detected_at: string;
    days_since_launch?: number;
    is_fast_sellout?: boolean;
  }>;
  restocks: Array<{
    product_id: string;
    title: string;
    detected_at: string;
  }>;
  hot_products: Array<{
    product_id: string;
    title: string;
    days_since_launch: number;
  }>;
}

const inventory = inventoryData as unknown as InventoryData;
const sellouts = selloutData as unknown as SelloutData;

const BRAND_NAMES: Record<string, string> = {
  tenthousand: 'Ten Thousand',
  outdoor_voices: 'Outdoor Voices',
};

export default function InventoryPage() {
  const products = Object.entries(inventory.products);

  // Group by brand
  const byBrand: Record<string, { inStock: number; soldOut: number; total: number }> = {};

  for (const [pid, p] of products) {
    const brand = pid.split(':')[0];
    if (!byBrand[brand]) {
      byBrand[brand] = { inStock: 0, soldOut: 0, total: 0 };
    }
    byBrand[brand].total++;
    if (p.any_available) {
      byBrand[brand].inStock++;
    } else {
      byBrand[brand].soldOut++;
    }
  }

  // Get sold out products
  const soldOutProducts = products
    .filter(([, p]) => !p.any_available)
    .map(([pid, p]) => ({
      brand: BRAND_NAMES[pid.split(':')[0]] || pid.split(':')[0],
      ...p,
    }));

  // Get low stock products (< 30% available)
  const lowStockProducts = products
    .filter(([, p]) => p.any_available && p.availability_pct < 30)
    .map(([pid, p]) => ({
      brand: BRAND_NAMES[pid.split(':')[0]] || pid.split(':')[0],
      ...p,
    }))
    .sort((a, b) => a.availability_pct - b.availability_pct);

  // Chart data
  const stockChartData = Object.entries(byBrand).map(([brand, data]) => ({
    brand: BRAND_NAMES[brand] || brand,
    'In Stock': data.inStock,
    'Sold Out': data.soldOut,
  }));

  const totalProducts = products.length;
  const totalInStock = products.filter(([, p]) => p.any_available).length;
  const totalSoldOut = totalProducts - totalInStock;
  const stockRate = Math.round((totalInStock / totalProducts) * 100);

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Demand Intelligence
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Inventory Tracker
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Monitor product availability to identify high-demand items.
          Sell-outs reveal what customers actually want.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Total Products</Text>
          <Metric className="text-socal-stone-800">{totalProducts}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Shopify stores only</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">In Stock</Text>
          <Metric className="text-socal-sage-600">{totalInStock}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">{stockRate}% availability</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Sold Out</Text>
          <Metric className="text-socal-sunset-600">{totalSoldOut}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Demand signals</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Hot Products</Text>
          <Metric className="text-socal-ocean-600">{sellouts.hot_products.length}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Fast sellouts (&lt;7 days)</Text>
        </Card>
      </div>

      {/* Stock by Brand */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Stock Status by Brand
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Product availability across tracked Shopify stores
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={stockChartData}
            index="brand"
            categories={['In Stock', 'Sold Out']}
            colors={['emerald', 'rose']}
            className="h-64"
            showAnimation
            showGridLines={false}
            stack
          />
        </Card>
      </div>

      {/* Hot Products - Fast Sellouts */}
      {sellouts.hot_products.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🔥</span>
            <h2 className="text-xl font-semibold text-socal-stone-800">
              Hot Products
            </h2>
          </div>
          <Text className="text-socal-stone-500 mb-6">
            Sold out within 7 days of launch - strong demand signals
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sellouts.hot_products.slice(0, 6).map((product, i) => {
              const brand = BRAND_NAMES[product.product_id.split(':')[0]] || product.product_id.split(':')[0];
              return (
                <Card key={i} className="bg-gradient-to-r from-socal-sunset-50 to-socal-sand-50 border-socal-sunset-200 ring-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge color="rose" size="sm">{brand}</Badge>
                      <p className="text-lg font-semibold text-socal-stone-800 mt-2">
                        {product.title}
                      </p>
                      <p className="text-sm text-socal-stone-500 mt-1">
                        Sold out in {product.days_since_launch} days
                      </p>
                    </div>
                    <span className="text-2xl">🔥</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Currently Sold Out */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Currently Sold Out
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Products with zero inventory - indicates high demand or discontinuation
        </Text>

        {soldOutProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {soldOutProducts.slice(0, 12).map((product, i) => (
              <Card key={i} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
                <Badge color="rose" size="sm">{product.brand}</Badge>
                <p className="font-medium text-socal-stone-700 mt-2">{product.title}</p>
                <p className="text-xs text-socal-stone-400 mt-1">
                  {product.product_type || 'Uncategorized'} • 0/{product.total_variants} variants
                </p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-socal-sage-50 border-socal-sage-200 ring-0">
            <p className="text-socal-sage-700 text-center py-4">
              All products currently in stock!
            </p>
          </Card>
        )}
      </div>

      {/* Low Stock Warning */}
      {lowStockProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
            Low Stock Warning
          </h2>
          <Text className="text-socal-stone-500 mb-6">
            Products with less than 30% of variants available - may sell out soon
          </Text>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.slice(0, 9).map((product, i) => (
              <Card key={i} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge color="amber" size="sm">{product.brand}</Badge>
                    <p className="font-medium text-socal-stone-700 mt-2">{product.title}</p>
                    <p className="text-xs text-socal-stone-400 mt-1">
                      {product.available_count}/{product.total_variants} variants left
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-amber-500">
                      {product.availability_pct}%
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Data Quality Note */}
      <Card className="bg-socal-sand-50 border-socal-sand-200 ring-0">
        <div className="flex items-start gap-4">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="font-semibold text-socal-stone-700">About This Data</h3>
            <p className="text-sm text-socal-stone-500 mt-1">
              Inventory tracking is available for <strong>Shopify stores</strong> (Ten Thousand, Outdoor Voices)
              that expose product availability in their API. Data updates every 4 hours.
              Sell-outs are detected when products go from available to unavailable.
            </p>
            {inventory.last_check && (
              <p className="text-xs text-socal-stone-400 mt-2">
                Last updated: {new Date(inventory.last_check).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
