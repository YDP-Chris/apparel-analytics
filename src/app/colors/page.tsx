import { getColorMix, getBrands, formatColor } from '@/lib/data';
import { COLOR_FAMILY_COLORS } from '@/lib/types';

export const metadata = {
  title: 'Color Analysis | Apparel Intel',
  description: 'Color mix breakdown by brand',
};

export default function ColorsPage() {
  const colorMix = getColorMix();
  const brands = getBrands();

  // Calculate industry totals by color
  const colorTotals: Record<string, number> = {};
  for (const brand of brands) {
    for (const [color, count] of Object.entries(brand.colors || {})) {
      colorTotals[color] = (colorTotals[color] || 0) + count;
    }
  }

  const sortedColors = Object.entries(colorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🎨 Color Analysis</h1>
          <p className="text-gray-400">
            How brands use color across their product catalogs
          </p>
        </div>

        {/* Industry Color Distribution */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Industry Color Distribution</h2>
          <p className="text-gray-400 text-sm mb-6">
            Total products by color family across all brands
          </p>
          <div className="flex flex-wrap gap-4">
            {sortedColors.map(([color, count]) => (
              <div key={color} className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-lg mb-2 border border-gray-700"
                  style={{ backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280' }}
                />
                <span className="text-sm font-medium">{formatColor(color)}</span>
                <span className="text-xs text-gray-500">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Color Mix by Brand */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Color Mix by Brand</h2>
          <p className="text-gray-400 text-sm mb-6">
            Percentage of each brand&apos;s catalog by color family
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Brand</th>
                  {['black', 'white', 'gray', 'blue', 'navy', 'green', 'heather'].map((color) => (
                    <th key={color} className="text-right py-3 px-4 font-medium text-gray-400">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: COLOR_FAMILY_COLORS[color] }}
                        />
                        {formatColor(color)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {colorMix.map((row) => (
                  <tr key={row.brand} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-3 px-4 font-medium">{row.brand}</td>
                    <td className="py-3 px-4 text-right">{row.black > 0 ? `${row.black}%` : '-'}</td>
                    <td className="py-3 px-4 text-right">{row.white > 0 ? `${row.white}%` : '-'}</td>
                    <td className="py-3 px-4 text-right">{row.gray > 0 ? `${row.gray}%` : '-'}</td>
                    <td className="py-3 px-4 text-right">{row.blue > 0 ? `${row.blue}%` : '-'}</td>
                    <td className="py-3 px-4 text-right">{row.navy > 0 ? `${row.navy}%` : '-'}</td>
                    <td className="py-3 px-4 text-right">{row.green > 0 ? `${row.green}%` : '-'}</td>
                    <td className="py-3 px-4 text-right">{row.heather > 0 ? `${row.heather}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Brand Color Profiles */}
        <h2 className="text-xl font-semibold mb-4">Brand Color Profiles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => {
            const sortedBrandColors = Object.entries(brand.colors || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6);

            return (
              <div key={brand.slug} className="bg-gray-900 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{brand.name}</h3>
                  <span className="text-sm text-gray-500">
                    {brand.colorCoverage}% coverage
                  </span>
                </div>

                {/* Color bar */}
                <div className="flex h-8 rounded-lg overflow-hidden mb-4">
                  {sortedBrandColors.map(([color, count]) => {
                    const pct = (count / brand.total) * 100;
                    return (
                      <div
                        key={color}
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280',
                          minWidth: pct > 0 ? '4px' : '0',
                        }}
                        title={`${formatColor(color)}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                  {/* Remaining (no color data) */}
                  {brand.colorCoverage < 100 && (
                    <div
                      className="h-full bg-gray-800"
                      style={{ width: `${100 - brand.colorCoverage}%` }}
                      title="No color data"
                    />
                  )}
                </div>

                {/* Color breakdown */}
                <div className="space-y-2">
                  {sortedBrandColors.map(([color, count]) => {
                    const pct = (count / brand.total) * 100;
                    return (
                      <div key={color} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280' }}
                          />
                          <span>{formatColor(color)}</span>
                        </div>
                        <span className="text-gray-400">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* Insights */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <p className="text-xs text-gray-500">
                    {brand.avgColorsPerStyle.toFixed(1)} colors/style avg •{' '}
                    {brand.uniqueStyles} unique styles
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Key Insights */}
        <div className="bg-gray-900 rounded-xl p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">💡 Key Insights</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {brands
              .filter((b) => b.colorCoverage > 20)
              .map((brand) => {
                const neutrals = (brand.colors?.['black'] || 0) + (brand.colors?.['white'] || 0) + (brand.colors?.['gray'] || 0) + (brand.colors?.['navy'] || 0);
                const neutralPct = (neutrals / brand.total) * 100;

                let insight = '';
                if (neutralPct > 60) {
                  insight = `Plays it safe with ${neutralPct.toFixed(0)}% neutrals`;
                } else if (neutralPct < 35) {
                  insight = `Bold palette - only ${neutralPct.toFixed(0)}% neutrals`;
                } else if ((brand.colors?.['heather'] || 0) / brand.total > 0.1) {
                  insight = `Performance-focused with ${((brand.colors?.['heather'] || 0) / brand.total * 100).toFixed(0)}% heather variants`;
                } else {
                  return null;
                }

                return (
                  <div key={brand.slug} className="p-4 bg-gray-800/50 rounded-lg">
                    <span className="font-medium">{brand.name}:</span>{' '}
                    <span className="text-gray-300">{insight}</span>
                  </div>
                );
              })
              .filter(Boolean)}
          </div>
        </div>
      </div>
    </div>
  );
}
