import { getData, getVuoriScorecard, getBrandColorDepth } from '@/lib/data';

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
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold text-socal-stone-600">Vuori data not available</h1>
      </div>
    );
  }

  // Calculate key narrative metrics
  const totalCompetitorProducts = Object.values(data.brands)
    .filter(b => b.slug !== 'vuori')
    .reduce((sum, b) => sum + b.total, 0);
  const vuoriMarketShare = ((vuori.total / data.totals.products) * 100).toFixed(1);

  return (
    <div className="space-y-12">
      {/* Hero: The Story Setup */}
      <header className="text-center max-w-3xl mx-auto">
        <p className="text-socal-ocean-600 font-medium text-sm uppercase tracking-wide mb-2">
          Competitive Intelligence Report
        </p>
        <h1 className="text-4xl font-bold text-socal-stone-800 mb-4">
          Where Does Vuori Stand?
        </h1>
        <p className="text-lg text-socal-stone-500 leading-relaxed">
          Tracking <span className="font-semibold text-socal-stone-700">{vuori.total.toLocaleString()}</span> Vuori products
          against <span className="font-semibold text-socal-stone-700">{totalCompetitorProducts.toLocaleString()}</span> from
          5 competitors. Vuori represents <span className="font-semibold text-socal-ocean-600">{vuoriMarketShare}%</span> of
          the premium athleisure landscape we track.
        </p>
      </header>

      {/* Key Metrics - The Numbers That Matter */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Products', value: vuori.total.toLocaleString(), context: 'in catalog' },
          { label: 'Styles', value: vuori.uniqueStyles.toLocaleString(), context: 'unique product lines' },
          { label: 'Color Coverage', value: `${vuori.colorCoverage}%`, context: 'products with color data' },
          { label: 'Colors/Style', value: vuori.avgColorsPerStyle.toFixed(1), context: 'avg variants' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-soft border border-socal-sand-100">
            <p className="text-sm text-socal-stone-400 font-medium">{stat.label}</p>
            <p className="text-3xl font-bold text-socal-stone-800 mt-1">{stat.value}</p>
            <p className="text-xs text-socal-stone-400 mt-1">{stat.context}</p>
          </div>
        ))}
      </section>

      {/* The Good News: Where Vuori Leads */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-socal-sage-100 flex items-center justify-center">
            <span className="text-socal-sage-600 text-lg">✓</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-socal-stone-800">Competitive Strengths</h2>
            <p className="text-sm text-socal-stone-400">Where Vuori outperforms the market</p>
          </div>
        </div>

        {scorecard.leading.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {scorecard.leading.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-gradient-to-br from-socal-sage-50 to-socal-ocean-50 border border-socal-sage-100"
              >
                <p className="text-sm font-medium text-socal-sage-700 mb-1">{item.metric}</p>
                <p className="text-2xl font-bold text-socal-stone-800">{item.value}</p>
                <p className="text-sm text-socal-stone-500 mt-2">{item.comparison}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-socal-stone-400 italic">Analyzing competitive position...</p>
        )}
      </section>

      {/* The Challenge: Areas to Watch */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-socal-sunset-100 flex items-center justify-center">
            <span className="text-socal-sunset-600 text-lg">!</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-socal-stone-800">Growth Opportunities</h2>
            <p className="text-sm text-socal-stone-400">Categories where competitors are stronger</p>
          </div>
        </div>

        {scorecard.lagging.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {scorecard.lagging.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-socal-sunset-50 border border-socal-sunset-100"
              >
                <p className="text-sm font-medium text-socal-sunset-700 mb-1">{item.metric}</p>
                <p className="text-2xl font-bold text-socal-stone-800">{item.value}</p>
                <p className="text-sm text-socal-stone-500 mt-2">{item.comparison}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-socal-sage-50 border border-socal-sage-100 text-center">
            <p className="text-socal-sage-700 font-medium">No significant gaps identified</p>
          </div>
        )}
      </section>

      {/* Alerts: What to Watch */}
      {scorecard.alerts.length > 0 && (
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-socal-sand-100 flex items-center justify-center">
              <span className="text-socal-sand-600 text-lg">⚡</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-socal-stone-800">Competitive Alerts</h2>
              <p className="text-sm text-socal-stone-400">Recent market movements to monitor</p>
            </div>
          </div>

          <div className="space-y-3">
            {scorecard.alerts.map((alert, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl flex items-start gap-3 ${
                  alert.severity === 'high'
                    ? 'bg-socal-sunset-50 border border-socal-sunset-200'
                    : 'bg-socal-sand-50 border border-socal-sand-200'
                }`}
              >
                <span className="text-lg mt-0.5">
                  {alert.severity === 'high' ? '🔴' : '🟡'}
                </span>
                <p className="text-socal-stone-700">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Head-to-Head: Vuori vs Lululemon */}
      {scorecard.vsLululemon && scorecard.vsLululemon.length > 0 && (
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-socal-stone-100 flex items-center justify-center">
              <span className="text-socal-stone-600 text-lg">⚔️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-socal-stone-800">Vuori vs Lululemon</h2>
              <p className="text-sm text-socal-stone-400">Head-to-head subcategory comparison</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {scorecard.vsLululemon.map((h2h: { category: string; vuori: number; lululemon: number; winner: string }) => (
              <div
                key={h2h.category}
                className={`flex items-center p-4 rounded-xl ${
                  h2h.winner === 'vuori'
                    ? 'bg-socal-ocean-50 border border-socal-ocean-200'
                    : h2h.winner === 'lululemon'
                    ? 'bg-socal-sunset-50 border border-socal-sunset-100'
                    : 'bg-socal-stone-50 border border-socal-stone-100'
                }`}
              >
                <div className="w-32 font-medium text-socal-stone-700">{h2h.category}</div>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`flex-1 text-right ${h2h.winner === 'vuori' ? 'font-bold text-socal-ocean-700' : 'text-socal-stone-600'}`}>
                    {h2h.vuori.toLocaleString()}
                    {h2h.winner === 'vuori' && <span className="ml-2">✓</span>}
                  </div>
                  <div className="w-8 text-center text-socal-stone-400">vs</div>
                  <div className={`flex-1 ${h2h.winner === 'lululemon' ? 'font-bold text-socal-sunset-700' : 'text-socal-stone-600'}`}>
                    {h2h.lululemon.toLocaleString()}
                    {h2h.winner === 'lululemon' && <span className="ml-2">✓</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-socal-sand-50 rounded-xl">
            <p className="text-sm text-socal-stone-600">
              <span className="font-semibold">Summary:</span>{' '}
              Vuori wins {scorecard.vsLululemon.filter((h: { winner: string }) => h.winner === 'vuori').length} of {scorecard.vsLululemon.length} categories.
              {' '}Strong in men&apos;s, competitive in joggers.
            </p>
          </div>
        </section>
      )}

      {/* Deep Dive: Color Depth Comparison */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-socal-ocean-100 flex items-center justify-center">
            <span className="text-socal-ocean-600 text-lg">🎨</span>
          </div>
          <h2 className="text-xl font-bold text-socal-stone-800">Color Depth Analysis</h2>
        </div>
        <p className="text-socal-stone-500 mb-6 ml-13">
          Average color variants per style. More options = broader customer appeal.
        </p>

        <div className="space-y-4">
          {colorDepth.map((brand) => {
            const isVuori = brand.slug === 'vuori';
            const maxWidth = Math.max(...colorDepth.map(b => b.avgColors));
            const barWidth = (brand.avgColors / maxWidth) * 100;

            return (
              <div
                key={brand.slug}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                  isVuori
                    ? 'bg-gradient-to-r from-socal-ocean-50 to-socal-sand-50 border-2 border-socal-ocean-200'
                    : 'bg-socal-stone-50 hover:bg-socal-sand-50'
                }`}
              >
                <div className="w-32 flex-shrink-0">
                  <span className={`font-semibold ${isVuori ? 'text-socal-ocean-700' : 'text-socal-stone-600'}`}>
                    {isVuori && '→ '}{brand.brand}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-socal-stone-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all ${
                        isVuori
                          ? 'bg-gradient-to-r from-socal-ocean-400 to-socal-ocean-600'
                          : 'bg-socal-stone-300'
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
                <div className="w-20 text-right">
                  <span className={`text-lg font-bold ${isVuori ? 'text-socal-ocean-600' : 'text-socal-stone-600'}`}>
                    {brand.avgColors.toFixed(1)}
                  </span>
                </div>
                <div className="w-24 text-right">
                  <span className="text-sm text-socal-stone-400">{brand.uniqueStyles} styles</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* The Takeaway */}
      <section className="bg-gradient-to-br from-socal-ocean-600 to-socal-ocean-800 rounded-2xl p-8 text-white">
        <h2 className="text-xl font-bold mb-4">Key Takeaways</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-socal-ocean-200 text-sm font-medium mb-1">Strength</p>
            <p className="text-white">
              {scorecard.leading[0]?.metric || 'Performance fabrics'} differentiate Vuori in the market
            </p>
          </div>
          <div>
            <p className="text-socal-ocean-200 text-sm font-medium mb-1">Opportunity</p>
            <p className="text-white">
              {scorecard.lagging[0]?.metric || 'Category expansion'} could unlock new customer segments
            </p>
          </div>
          <div>
            <p className="text-socal-ocean-200 text-sm font-medium mb-1">Watch</p>
            <p className="text-white">
              Monitor competitor velocity and emerging category trends
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
