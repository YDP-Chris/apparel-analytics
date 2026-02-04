'use client';

import { BarChart, DonutChart } from '@tremor/react';

interface ChartDataItem {
  name: string;
  value?: number;
  Products?: number;
}

export function BrandCategoryDonut({ data }: { data: ChartDataItem[] }) {
  return (
    <DonutChart
      data={data}
      category="value"
      index="name"
      colors={['blue', 'emerald', 'amber', 'violet', 'rose', 'gray']}
      className="h-64"
      showAnimation
      valueFormatter={(v) => v.toLocaleString()}
    />
  );
}

export function BrandSubcategoryBar({ data }: { data: ChartDataItem[] }) {
  return (
    <BarChart
      data={data}
      index="name"
      categories={['Products']}
      colors={['cyan']}
      layout="vertical"
      className="h-64"
      showAnimation
      showGridLines={false}
      showLegend={false}
      valueFormatter={(v) => v.toLocaleString()}
    />
  );
}
