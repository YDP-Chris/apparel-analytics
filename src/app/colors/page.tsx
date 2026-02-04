import { getColorMix, getBrands, formatColor } from '@/lib/data';
import { COLOR_FAMILY_COLORS } from '@/lib/types';

export const metadata = {
  title: 'Color Analysis | Apparel Intel',
  description: 'Color strategy breakdown across premium athleisure brands',
};

export default function ColorsPage() {
  const colorMix = getColorMix();
  const brands = getBrands();

  // Calculate industry totals by color
  const colorTotals: Record<string, number> = {};
  let totalWithColor = 0;
  for (const brand of brands) {
    for (const [color, count] of Object.entries(brand.colors || {})) {
      colorTotals[color] = (colorTotals[color] || 0) + count;
      totalWithColor += count;
    }
  }

  const sortedColors = Object.entries(colorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Calculate the story: what colors dominate?
  const topThreeColors = sortedColors.slice(0, 3);
  const topThreePct = Math.round((topThreeColors.reduce((s, [, c]) => s + c, 0) / totalWithColor) * 100);

  return (
    <div className="space-y-12">
      {/* Hero: The Color Story */}
      <header className="text-center max-w-3xl mx-auto">
        <p className="text-socal-ocean-600 font-medium text-sm uppercase tracking-wide mb-2">
          Color Strategy Analysis
        </p>
        <h1 className="text-4xl font-bold text-socal-stone-800 mb-4">
          How Brands Use Color
        </h1>
        <p className="text-lg text-socal-stone-500 leading-relaxed">
          <span className="font-semibold text-socal-stone-700">{topThreePct}%</span> of all products
          are {topThreeColors.map(([c]) => formatColor(c)).join(', ')} — the foundation colors of athleisure.
          But strategic differentiation happens in how brands deploy accent colors.
        </p>
      </header>

      {/* Industry Color Distribution */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <h2 className="text-xl font-bold text-socal-stone-800 mb-2">Industry Color Palette</h2>
        <p className="text-socal-stone-500 mb-6">
          Total products by color family across {brands.length} brands
        </p>

        <div className="flex flex-wrap gap-6">
          {sortedColors.map(([color, count], index) => {
            const pct = Math.round((count / totalWithColor) * 100);
            const isTopThree = index < 3;

            return (
              <div key={color} className="flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-xl shadow-soft transition-transform hover:scale-105 ${
                    isTopThree ? 'ring-2 ring-socal-ocean-200 ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280' }}
                />
                <span className="text-sm font-medium text-socal-stone-700 mt-2">{formatColor(color)}</span>
                <span className="text-xs text-socal-stone-400">{count.toLocaleString()}</span>
                <span className={`text-xs font-medium mt-0.5 ${isTopThree ? 'text-socal-ocean-600' : 'text-socal-stone-400'}`}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* The Key Insight */}
      <section className="bg-gradient-to-r from-socal-sand-100 to-socal-ocean-50 rounded-2xl p-8 border border-socal-sand-200">
        <div className="max-w-2xl">
          <p className="text-socal-stone-400 text-sm font-medium uppercase tracking-wide mb-2">Key Insight</p>
          <p className="text-xl text-socal-stone-700 leading-relaxed">
            Neutrals dominate for good reason — they&apos;re versatile and sell.
            But brands differentiate through <span className="font-semibold text-socal-ocean-700">heather</span> (performance),
            <span className="font-semibold text-socal-sage-600"> earth tones</span> (lifestyle),
            and <span className="font-semibold text-socal-sunset-600">bold colors</span> (fashion-forward).
          </p>
        </div>
      </section>

      {/* Color Mix Comparison Table */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <h2 className="text-xl font-bold text-socal-stone-800 mb-2">Brand Color Strategies</h2>
        <p className="text-socal-stone-500 mb-6">
          Percentage of each brand&apos;s catalog by color family
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-socal-sand-200">
                <th className="text-left py-3 px-4 font-semibold text-socal-stone-700">Brand</th>
                {['black', 'white', 'gray', 'blue', 'heather', 'green'].map((color) => (
                  <th key={color} className="text-right py-3 px-4 font-medium text-socal-stone-500">
                    <div className="flex items-center justify-end gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLOR_FAMILY_COLORS[color] }}
                      />
                      {formatColor(color)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colorMix.map((row, index) => (
                <tr
                  key={row.brand}
                  className={`border-b border-socal-sand-100 ${
                    row.brand === 'Vuori' ? 'bg-socal-ocean-50' : index % 2 === 0 ? 'bg-white' : 'bg-socal-stone-50'
                  }`}
                >
                  <td className={`py-4 px-4 font-semibold ${row.brand === 'Vuori' ? 'text-socal-ocean-700' : 'text-socal-stone-700'}`}>
                    {row.brand === 'Vuori' && '→ '}{row.brand}
                  </td>
                  <td className="py-4 px-4 text-right text-socal-stone-600">{row.black > 0 ? `${row.black}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-socal-stone-600">{row.white > 0 ? `${row.white}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-socal-stone-600">{row.gray > 0 ? `${row.gray}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-socal-stone-600">{row.blue > 0 ? `${row.blue}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-socal-stone-600">
                    {row.heather > 0 ? (
                      <span className={row.heather > 10 ? 'font-semibold text-socal-ocean-600' : ''}>
                        {row.heather}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-4 px-4 text-right text-socal-stone-600">{row.green > 0 ? `${row.green}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Brand Color Profiles */}
      <section>
        <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Brand Color Profiles</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brands.map((brand) => {
            const sortedBrandColors = Object.entries(brand.colors || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5);

            const isVuori = brand.slug === 'vuori';

            // Calculate neutral percentage
            const neutrals = (brand.colors?.['black'] || 0) + (brand.colors?.['white'] || 0) +
                           (brand.colors?.['gray'] || 0) + (brand.colors?.['navy'] || 0);
            const neutralPct = brand.total > 0 ? Math.round((neutrals / brand.total) * 100) : 0;

            return (
              <div
                key={brand.slug}
                className={`rounded-2xl p-6 shadow-soft border ${
                  isVuori
                    ? 'bg-gradient-to-br from-socal-ocean-50 to-white border-socal-ocean-200'
                    : 'bg-white border-socal-sand-100'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg ${isVuori ? 'text-socal-ocean-700' : 'text-socal-stone-700'}`}>
                    {brand.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-socal-sand-100 text-socal-stone-500">
                    {brand.colorCoverage}% coverage
                  </span>
                </div>

                {/* Color bar visualization */}
                <div className="flex h-6 rounded-lg overflow-hidden mb-4">
                  {sortedBrandColors.map(([color, count]) => {
                    const pct = (count / brand.total) * 100;
                    return (
                      <div
                        key={color}
                        className="h-full transition-all hover:opacity-80"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280',
                          minWidth: pct > 0 ? '4px' : '0',
                        }}
                        title={`${formatColor(color)}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                  {brand.colorCoverage < 100 && (
                    <div
                      className="h-full bg-socal-stone-200"
                      style={{ width: `${100 - brand.colorCoverage}%` }}
                      title="No color data"
                    />
                  )}
                </div>

                {/* Top colors */}
                <div className="space-y-2">
                  {sortedBrandColors.slice(0, 4).map(([color, count]) => {
                    const pct = (count / brand.total) * 100;
                    return (
                      <div key={color} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280' }}
                          />
                          <span className="text-socal-stone-600">{formatColor(color)}</span>
                        </div>
                        <span className="text-socal-stone-400 font-mono text-xs">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* Insight tag */}
                <div className="mt-4 pt-4 border-t border-socal-sand-100">
                  <p className="text-xs text-socal-stone-400">
                    {neutralPct}% neutrals •
                    {brand.avgColorsPerStyle.toFixed(1)} colors/style
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Strategic Insights */}
      <section className="bg-gradient-to-br from-socal-ocean-600 to-socal-ocean-800 rounded-2xl p-8 text-white">
        <h2 className="text-xl font-bold mb-6">Strategic Insights</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {brands
            .filter((b) => b.colorCoverage > 20)
            .slice(0, 4)
            .map((brand) => {
              const heatherPct = ((brand.colors?.['heather'] || 0) / brand.total) * 100;
              const neutrals = (brand.colors?.['black'] || 0) + (brand.colors?.['white'] || 0) + (brand.colors?.['gray'] || 0);
              const neutralPct = (neutrals / brand.total) * 100;

              let insight = '';
              if (heatherPct > 10) {
                insight = `Performance-focused with ${heatherPct.toFixed(0)}% heather variants`;
              } else if (neutralPct > 60) {
                insight = `Conservative palette — ${neutralPct.toFixed(0)}% neutrals`;
              } else if (neutralPct < 40) {
                insight = `Bold color strategy — only ${neutralPct.toFixed(0)}% neutrals`;
              } else {
                insight = `Balanced color approach`;
              }

              return (
                <div key={brand.slug} className="bg-white/10 rounded-xl p-4">
                  <p className="font-semibold text-white">{brand.name}</p>
                  <p className="text-socal-ocean-200 text-sm mt-1">{insight}</p>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
