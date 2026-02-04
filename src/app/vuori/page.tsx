import { getData, getVuoriScorecard, getBrandColorDepth } from '@/lib/data';
import StatsCard from '@/components/StatsCard';

export const metadata = {
  title: 'Vuori Scorecard | Apparel Intel',
  description: 'Competitive position analysis for Vuori',
};

export default function VuoriScorecardPage() {
  const data = getData();
  const scorecard = getVuoriScorecard();
  const colorDepth = getBrandColorDepth();
  const vuori = data.brands['vuori'];

  if (!vuori) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <h1 className="text-2xl font-bold">Vuori data not available</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-cyan-400">Vuori</span> Competitive Scorecard
          </h1>
          <p className="text-gray-400">
            Where Vuori leads, where to focus, and competitive alerts
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Catalog Size"
            value={vuori.total.toLocaleString()}
            subtitle="products"
          />
          <StatsCard
            title="Unique Styles"
            value={vuori.uniqueStyles.toLocaleString()}
            subtitle="product lines"
          />
          <StatsCard
            title="Color Coverage"
            value={`${vuori.colorCoverage}%`}
            subtitle="have color data"
          />
          <StatsCard
            title="Colors/Style"
            value={vuori.avgColorsPerStyle.toFixed(1)}
            subtitle="average"
          />
        </div>

        {/* Leading Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-400">✓</span> Where Vuori Leads
          </h2>
          {scorecard.leading.length > 0 ? (
            <div className="space-y-4">
              {scorecard.leading.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-green-950/30 rounded-lg border border-green-900/50">
                  <div className="flex-1">
                    <h3 className="font-medium text-green-400">{item.metric}</h3>
                    <p className="text-white text-lg font-semibold">{item.value}</p>
                    <p className="text-gray-400 text-sm">{item.comparison}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Analyzing competitive position...</p>
          )}
        </div>

        {/* Lagging Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-amber-400">✗</span> Areas to Watch
          </h2>
          {scorecard.lagging.length > 0 ? (
            <div className="space-y-4">
              {scorecard.lagging.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-amber-950/30 rounded-lg border border-amber-900/50">
                  <div className="flex-1">
                    <h3 className="font-medium text-amber-400">{item.metric}</h3>
                    <p className="text-white text-lg font-semibold">{item.value}</p>
                    <p className="text-gray-400 text-sm">{item.comparison}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-400">No significant gaps identified</p>
          )}
        </div>

        {/* Alerts Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-400">⚠</span> Competitive Alerts
          </h2>
          {scorecard.alerts.length > 0 ? (
            <div className="space-y-3">
              {scorecard.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'high'
                      ? 'bg-red-950/30 border-red-900/50'
                      : 'bg-yellow-950/30 border-yellow-900/50'
                  }`}
                >
                  <span className="mr-2">
                    {alert.severity === 'high' ? '🔴' : '🟡'}
                  </span>
                  {alert.message}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-400">✓ No major competitive threats detected</p>
          )}
        </div>

        {/* Color Depth Comparison */}
        <div className="bg-gray-900 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">🎨 Color Depth Comparison</h2>
          <p className="text-gray-400 text-sm mb-4">
            Average colors per style (more = broader customer appeal)
          </p>
          <div className="space-y-3">
            {colorDepth.map((brand) => (
              <div
                key={brand.slug}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  brand.slug === 'vuori' ? 'bg-cyan-950/30 border border-cyan-800' : 'bg-gray-800/50'
                }`}
              >
                <div className="w-32 font-medium">
                  {brand.slug === 'vuori' && <span className="text-cyan-400 mr-1">🎯</span>}
                  {brand.brand}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 rounded bg-gradient-to-r from-cyan-600 to-blue-600"
                      style={{ width: `${Math.min(brand.avgColors * 30, 100)}%` }}
                    />
                    <span className="text-sm font-mono">{brand.avgColors.toFixed(1)}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500 w-32 text-right">
                  {brand.uniqueStyles} styles
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
