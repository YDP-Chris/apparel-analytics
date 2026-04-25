import { getColorMix, getBrands, formatColor } from '@/lib/data';
import { COLOR_FAMILY_COLORS } from '@/lib/types';

export const metadata = {
  title: 'Color Analysis | Gymreapers Data & Analytics',
  description: 'Color strategy breakdown across strength market brands',
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
        <p className="text-gr-accent font-medium text-sm uppercase tracking-wide mb-2">
          Color Strategy Analysis
        </p>
        <h1 className="text-4xl font-bold text-gr-text mb-4">
          How Brands Use Color
        </h1>
        <p className="text-lg text-gr-muted leading-relaxed">
          <span className="font-semibold text-gr-text">{topThreePct}%</span> of all products
          are {topThreeColors.map(([c]) => formatColor(c)).join(', ')} — the foundation colors of athleisure.
          But strategic differentiation happens in how brands deploy accent colors.
        </p>
      </header>

      {/* Industry Color Distribution */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-2">Industry Color Palette</h2>
        <p className="text-gr-muted mb-6">
          Total products by color family across {brands.length} brands
        </p>

        <div className="flex flex-wrap gap-6">
          {sortedColors.map(([color, count], index) => {
            const pct = Math.round((count / totalWithColor) * 100);
            const isTopThree = index < 3;

            return (
              <div key={color} className="flex flex-col items-center">
                <div
                  className={`w-16 h-16 rounded-md transition-transform hover:scale-105 ${
                    isTopThree ? 'ring-2 ring-gr-accent-soft ring-offset-2' : ''
                  }`}
                  style={{ backgroundColor: COLOR_FAMILY_COLORS[color] || '#6b7280' }}
                  role="img"
                  aria-label={`${formatColor(color)}: ${count.toLocaleString()} products (${pct}%)`}
                />
                <span className="text-sm font-medium text-gr-text mt-2">{formatColor(color)}</span>
                <span className="text-xs text-gr-subtle">{count.toLocaleString()}</span>
                <span className={`text-xs font-medium mt-0.5 ${isTopThree ? 'text-gr-accent' : 'text-gr-subtle'}`}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* The Key Insight */}
      <section className="bg-gradient-to-r from-gr-border to-gr-accent-soft rounded-md p-8 border border-gr-border">
        <div className="max-w-2xl">
          <p className="text-gr-subtle text-sm font-medium uppercase tracking-wide mb-2">Key Insight</p>
          <p className="text-xl text-gr-text leading-relaxed">
            Neutrals dominate for good reason — they&apos;re versatile and sell.
            But brands differentiate through <span className="font-semibold text-gr-accent">heather</span> (performance),
            <span className="font-semibold text-gr-success"> earth tones</span> (lifestyle),
            and <span className="font-semibold text-gr-accent">bold colors</span> (fashion-forward).
          </p>
        </div>
      </section>

      {/* Color Mix Comparison Table */}
      <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
        <h2 className="text-xl font-bold text-gr-text mb-2">Brand Color Strategies</h2>
        <p className="text-gr-muted mb-6">
          Percentage of each brand&apos;s catalog by color family
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gr-border">
                <th className="text-left py-3 px-4 font-semibold text-gr-text">Brand</th>
                {['black', 'white', 'gray', 'blue', 'heather', 'green'].map((color) => (
                  <th key={color} className="text-right py-3 px-4 font-medium text-gr-muted">
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
                  className={`border-b border-gr-border ${
                    row.brand === 'Vuori' ? 'bg-gr-accent-soft' : index % 2 === 0 ? 'bg-gr-surface' : 'bg-gr-bg'
                  }`}
                >
                  <td className={`py-4 px-4 font-semibold ${row.brand === 'Vuori' ? 'text-gr-accent' : 'text-gr-text'}`}>
                    {row.brand === 'Vuori' && '→ '}{row.brand}
                  </td>
                  <td className="py-4 px-4 text-right text-gr-muted">{row.black > 0 ? `${row.black}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-gr-muted">{row.white > 0 ? `${row.white}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-gr-muted">{row.gray > 0 ? `${row.gray}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-gr-muted">{row.blue > 0 ? `${row.blue}%` : '—'}</td>
                  <td className="py-4 px-4 text-right text-gr-muted">
                    {row.heather > 0 ? (
                      <span className={row.heather > 10 ? 'font-semibold text-gr-accent' : ''}>
                        {row.heather}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-4 px-4 text-right text-gr-muted">{row.green > 0 ? `${row.green}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Brand Color Profiles */}
      <section>
        <h2 className="text-xl font-bold text-gr-text mb-6">Brand Color Profiles</h2>
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
                className={`rounded-md p-6 border ${
                  isVuori
                    ? 'bg-gradient-to-br from-gr-accent-soft to-white border-gr-accent-soft'
                    : 'bg-gr-surface border-gr-border'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg ${isVuori ? 'text-gr-accent' : 'text-gr-text'}`}>
                    {brand.name}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-gr-border text-gr-muted">
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
                      className="h-full bg-gr-border"
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
                          <span className="text-gr-muted">{formatColor(color)}</span>
                        </div>
                        <span className="text-gr-subtle font-mono text-xs">{pct.toFixed(1)}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* Insight tag */}
                <div className="mt-4 pt-4 border-t border-gr-border">
                  <p className="text-xs text-gr-subtle">
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
      <section className="bg-gradient-to-br from-gr-accent to-gr-accent rounded-md p-8 text-gr-text">
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
                <div key={brand.slug} className="bg-gr-surface/10 rounded-md p-4">
                  <p className="font-semibold text-gr-text">{brand.name}</p>
                  <p className="text-gr-accent-soft text-sm mt-1">{insight}</p>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}
