'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, BarChart, DonutChart, AreaChart, Text, Metric, Badge } from '@tremor/react';
import { getSupabase, BriefClaim, TrendTimeline, BrandMention, BriefRollup } from '@/lib/supabase';

const TABS = [
  { id: 'scorecard', label: 'Scorecard' },
  { id: 'trends', label: 'Trends' },
  { id: 'themes', label: 'Themes' },
  { id: 'signals', label: 'Signal Map' },
  { id: 'rollups', label: 'Rollups' },
];

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'emerald',
  partially_confirmed: 'cyan',
  not_confirmed: 'rose',
  too_early: 'amber',
  pending: 'gray',
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmed',
  partially_confirmed: 'Partial',
  not_confirmed: 'Not Confirmed',
  too_early: 'Too Early',
  pending: 'Pending',
};

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori', lululemon: 'Lululemon', alo: 'Alo Yoga',
  rhone: 'Rhone', tenthousand: 'Ten Thousand',
  outdoor_voices: 'Outdoor Voices', gymshark: 'Gymshark',
  fabletics: 'Fabletics', athleta: 'Athleta', on_running: 'On Running',
};

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  });
}

function BulletList({ content, accent }: { content: string; accent: string }) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const cleaned = line.replace(/^[\u2022\-\*]\s*/, '');
        return (
          <div key={i} className="flex gap-3 text-sm text-socal-stone-700 leading-relaxed">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent}`} />
            <span>{cleaned}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// TAB: SCORECARD
// ============================================
function ScorecardTab({ claims }: { claims: BriefClaim[] }) {
  const [filterBrand, setFilterBrand] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    claims.forEach(c => {
      counts[c.outcome_status] = (counts[c.outcome_status] || 0) + 1;
    });
    return counts;
  }, [claims]);

  const confirmationRate = useMemo(() => {
    const assessed = claims.filter(c => ['confirmed', 'partially_confirmed', 'not_confirmed'].includes(c.outcome_status));
    if (assessed.length === 0) return 0;
    const confirmed = assessed.filter(c => c.outcome_status === 'confirmed' || c.outcome_status === 'partially_confirmed');
    return Math.round((confirmed.length / assessed.length) * 100);
  }, [claims]);

  const avgLeadTime = useMemo(() => {
    const withDays = claims.filter(c => c.days_to_outcome && c.days_to_outcome > 0);
    if (withDays.length === 0) return 0;
    return Math.round(withDays.reduce((sum, c) => sum + (c.days_to_outcome || 0), 0) / withDays.length);
  }, [claims]);

  const donutData = useMemo(() => {
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
    }));
  }, [statusCounts]);

  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      if (filterBrand !== 'all' && c.subject_brand !== filterBrand) return false;
      if (filterStatus !== 'all' && c.outcome_status !== filterStatus) return false;
      return true;
    });
  }, [claims, filterBrand, filterStatus]);

  const brands = useMemo(() => {
    const set = new Set(claims.map(c => c.subject_brand).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [claims]);

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Total Claims</Text>
          <Metric className="text-socal-stone-800">{claims.length}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Extracted from 58 briefs</Text>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Confirmation Rate</Text>
          <Metric className="text-socal-ocean-600">{confirmationRate}%</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Confirmed or partially confirmed</Text>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Avg Lead Time</Text>
          <Metric className="text-socal-stone-800">{avgLeadTime}d</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Days to confirmation</Text>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Pending</Text>
          <Metric className="text-socal-stone-800">{statusCounts['pending'] || 0}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Awaiting assessment</Text>
        </Card>
      </div>

      {/* Donut + breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">Outcome Distribution</h3>
          <DonutChart
            data={donutData}
            category="value"
            index="name"
            colors={['emerald', 'cyan', 'rose', 'amber', 'gray']}
            className="h-52"
            showAnimation
          />
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">By Status</h3>
          <div className="space-y-3 mt-4">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color={STATUS_COLORS[key]}>{label}</Badge>
                </div>
                <span className="text-sm font-medium text-socal-stone-700">{statusCounts[key] || 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Filters + Claim List */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider">Claims</h3>
          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="text-sm border border-socal-sand-200 rounded-lg px-3 py-1.5 text-socal-stone-600 bg-white"
          >
            <option value="all">All Brands</option>
            {brands.map(b => (
              <option key={b} value={b}>{BRAND_NAMES[b] || b}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-socal-sand-200 rounded-lg px-3 py-1.5 text-socal-stone-600 bg-white"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span className="text-xs text-socal-stone-400 ml-auto">{filteredClaims.length} claims</span>
        </div>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {filteredClaims.map((claim) => (
            <div key={claim.id} className="border-b border-socal-sand-50 pb-4 last:border-0">
              <div className="flex items-start gap-3">
                <Badge color={STATUS_COLORS[claim.outcome_status]} size="xs">
                  {STATUS_LABELS[claim.outcome_status] || claim.outcome_status}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-socal-stone-700">{claim.claim_text}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-socal-stone-400">{formatDate(claim.brief_date)}</span>
                    {claim.subject_brand && (
                      <span className="text-xs text-socal-ocean-600">{BRAND_NAMES[claim.subject_brand] || claim.subject_brand}</span>
                    )}
                    {claim.subject_category && (
                      <span className="text-xs text-socal-sage-600">{claim.subject_category}</span>
                    )}
                    {claim.days_to_outcome && (
                      <span className="text-xs text-socal-stone-400">{claim.days_to_outcome}d to confirm</span>
                    )}
                  </div>
                  {claim.outcome_evidence && (
                    <p className="text-xs text-socal-stone-500 mt-2 italic border-l-2 border-socal-sand-200 pl-3">
                      {claim.outcome_evidence}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============================================
// TAB: TRENDS
// ============================================
function TrendsTab({ trends }: { trends: TrendTimeline[] }) {
  const sorted = useMemo(() => [...trends].sort((a, b) => b.mention_count - a.mention_count), [trends]);
  const categories = useMemo(() => sorted.filter(t => t.keyword_type === 'category'), [sorted]);
  const brandTrends = useMemo(() => sorted.filter(t => t.keyword_type === 'brand'), [sorted]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Trends Tracked</Text>
          <Metric className="text-socal-stone-800">{trends.length}</Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Category Trends</Text>
          <Metric className="text-socal-ocean-600">{categories.length}</Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Brand Trends</Text>
          <Metric className="text-socal-stone-800">{brandTrends.length}</Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Most Mentioned</Text>
          <Metric className="text-socal-stone-800 text-lg">{sorted[0]?.keyword || '-'}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">{sorted[0]?.mention_count || 0} briefs</Text>
        </Card>
      </div>

      {/* Category Trends Chart */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">Category Trend Frequency</h3>
        <BarChart
          data={categories.slice(0, 12).map(t => ({
            keyword: t.keyword,
            'Mentions': t.mention_count,
          }))}
          index="keyword"
          categories={['Mentions']}
          colors={['cyan']}
          layout="vertical"
          className="h-72"
          showAnimation
          showGridLines={false}
        />
      </Card>

      {/* Trend Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.slice(0, 10).map((trend) => (
          <Card key={trend.id} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-socal-stone-800 capitalize">{trend.keyword}</h4>
                <Badge color={trend.keyword_type === 'category' ? 'cyan' : 'violet'} size="xs" className="mt-1">
                  {trend.keyword_type}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-socal-ocean-600">{trend.mention_count}</p>
                <p className="text-xs text-socal-stone-400">mentions</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-socal-stone-500 space-y-1">
              <p>First mentioned: {formatDate(trend.first_mention_date)}</p>
              {trend.search_growth_pct !== null && (
                <p className={trend.search_growth_pct > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                  Search growth: {trend.search_growth_pct > 0 ? '+' : ''}{trend.search_growth_pct}%
                </p>
              )}
              {trend.mention_dates && (
                <p className="text-socal-stone-400">
                  Active: {formatDate(trend.mention_dates[0])} - {formatDate(trend.mention_dates[trend.mention_dates.length - 1])}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================
// TAB: THEMES
// ============================================
function ThemesTab({ mentions }: { mentions: BrandMention[] }) {
  const brandCounts = useMemo(() => {
    const counts: Record<string, { positive: number; negative: number; neutral: number; total: number }> = {};
    mentions.forEach(m => {
      if (!counts[m.brand_id]) counts[m.brand_id] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      counts[m.brand_id][m.sentiment as 'positive' | 'negative' | 'neutral']++;
      counts[m.brand_id].total++;
    });
    return Object.entries(counts)
      .map(([brand, c]) => ({ brand, name: BRAND_NAMES[brand] || brand, ...c }))
      .sort((a, b) => b.total - a.total);
  }, [mentions]);

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    mentions.forEach(m => {
      counts[m.section] = (counts[m.section] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([section, count]) => ({ name: section, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [mentions]);

  const sentimentOverTime = useMemo(() => {
    const byWeek: Record<string, { positive: number; negative: number; neutral: number }> = {};
    mentions.forEach(m => {
      const d = new Date(m.brief_date + 'T00:00:00');
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay() + 1);
      const key = weekStart.toISOString().slice(0, 10);
      if (!byWeek[key]) byWeek[key] = { positive: 0, negative: 0, neutral: 0 };
      byWeek[key][m.sentiment as 'positive' | 'negative' | 'neutral']++;
    });
    return Object.entries(byWeek)
      .map(([week, counts]) => ({ week: formatDate(week), ...counts }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [mentions]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Total Mentions</Text>
          <Metric className="text-socal-stone-800">{mentions.length}</Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Brands Tracked</Text>
          <Metric className="text-socal-ocean-600">{brandCounts.length}</Metric>
        </Card>
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Most Mentioned</Text>
          <Metric className="text-socal-stone-800 text-lg">{brandCounts[0]?.name || '-'}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">{brandCounts[0]?.total || 0} mentions</Text>
        </Card>
      </div>

      {/* Brand Mentions by Sentiment */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">Brand Mentions by Sentiment</h3>
        <BarChart
          data={brandCounts.map(b => ({
            brand: b.name,
            'Positive (for Vuori)': b.positive,
            'Neutral': b.neutral,
            'Negative (threat)': b.negative,
          }))}
          index="brand"
          categories={['Positive (for Vuori)', 'Neutral', 'Negative (threat)']}
          colors={['emerald', 'gray', 'rose']}
          layout="vertical"
          className="h-80"
          showAnimation
          showGridLines={false}
          stack
        />
      </Card>

      {/* Sentiment Over Time */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">Weekly Sentiment Trend</h3>
        <AreaChart
          data={sentimentOverTime}
          index="week"
          categories={['positive', 'neutral', 'negative']}
          colors={['emerald', 'gray', 'rose']}
          className="h-64"
          showAnimation
          showGridLines={false}
          stack
        />
      </Card>

      {/* Section Distribution */}
      <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
        <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider mb-4">Mentions by Section</h3>
        <DonutChart
          data={sectionCounts}
          category="value"
          index="name"
          colors={['cyan', 'rose', 'emerald', 'amber', 'violet', 'blue']}
          className="h-52"
          showAnimation
        />
      </Card>
    </div>
  );
}

// ============================================
// TAB: SIGNAL MAP
// ============================================
function SignalMapTab({ claims }: { claims: BriefClaim[] }) {
  const confirmed = useMemo(() =>
    claims.filter(c => c.outcome_status === 'confirmed' || c.outcome_status === 'partially_confirmed')
      .sort((a, b) => a.brief_date.localeCompare(b.brief_date)),
    [claims]
  );

  // Group by brand
  const byBrand = useMemo(() => {
    const groups: Record<string, BriefClaim[]> = {};
    confirmed.forEach(c => {
      const key = c.subject_brand || 'market';
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [confirmed]);

  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-socal-sand-50 to-socal-ocean-50 border-socal-sand-200 ring-0 p-6">
        <Text className="text-socal-stone-400 mb-1">Validated Intelligence Chains</Text>
        <h2 className="text-2xl font-bold text-socal-stone-800">
          {confirmed.length} signals confirmed across {byBrand.length} subjects
        </h2>
        <p className="text-sm text-socal-stone-500 mt-2">
          Each chain shows: signal detected in brief, action recommended, and outcome confirmed by subsequent data.
        </p>
      </Card>

      {byBrand.map(([brand, brandClaims]) => (
        <Card key={brand} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-socal-sand-100">
            <div className="w-1 h-8 rounded-full bg-socal-ocean-500" />
            <h3 className="font-semibold text-socal-stone-800">
              {BRAND_NAMES[brand] || (brand === 'market' ? 'Market-Wide' : brand)}
            </h3>
            <Badge color="cyan" size="xs">{brandClaims.length} signals</Badge>
          </div>
          <div className="space-y-4">
            {brandClaims.map((claim) => (
              <div key={claim.id} className="relative pl-6 border-l-2 border-socal-sand-200">
                <div className="absolute left-[-5px] top-1 w-2 h-2 rounded-full bg-socal-ocean-500" />
                <div className="flex items-start gap-2">
                  <Badge color={STATUS_COLORS[claim.outcome_status]} size="xs">
                    {STATUS_LABELS[claim.outcome_status]}
                  </Badge>
                  <span className="text-xs text-socal-stone-400">{formatDate(claim.brief_date)}</span>
                  {claim.days_to_outcome && (
                    <span className="text-xs text-socal-ocean-600">{claim.days_to_outcome}d</span>
                  )}
                </div>
                <p className="text-sm text-socal-stone-700 mt-1">{claim.claim_text}</p>
                {claim.outcome_evidence && (
                  <p className="text-xs text-socal-stone-500 mt-1 italic">
                    {claim.outcome_evidence}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// TAB: ROLLUPS
// ============================================
function RollupsTab({ rollups }: { rollups: BriefRollup[] }) {
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = useMemo(() =>
    rollups.filter(r => r.period_type === periodType)
      .sort((a, b) => b.period_start.localeCompare(a.period_start)),
    [rollups, periodType]
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setPeriodType('weekly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            periodType === 'weekly'
              ? 'bg-socal-ocean-600 text-white'
              : 'bg-socal-sand-100 text-socal-stone-500 hover:bg-socal-sand-200'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setPeriodType('monthly')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            periodType === 'monthly'
              ? 'bg-socal-ocean-600 text-white'
              : 'bg-socal-sand-100 text-socal-stone-500 hover:bg-socal-sand-200'
          }`}
        >
          Monthly
        </button>
      </div>

      {filtered.map((rollup) => (
        <Card key={rollup.id} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <div
            className="cursor-pointer"
            onClick={() => setExpanded(expanded === rollup.id ? null : rollup.id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-socal-stone-800">
                  {formatDate(rollup.period_start)} - {formatDate(rollup.period_end)}
                </h3>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-socal-stone-400">{rollup.brief_count} briefs</span>
                  <span className="text-xs text-socal-stone-400">{rollup.article_count_total} articles</span>
                </div>
              </div>
              <span className="text-socal-stone-400 text-lg">{expanded === rollup.id ? '-' : '+'}</span>
            </div>
            {rollup.executive_summary && (
              <p className="text-sm text-socal-stone-600 mt-3 leading-relaxed">
                {rollup.executive_summary}
              </p>
            )}
          </div>

          {expanded === rollup.id && (
            <div className="mt-6 space-y-5 border-t border-socal-sand-100 pt-5">
              {rollup.top_threats && (
                <div>
                  <h4 className="text-xs font-semibold text-socal-sunset-600 uppercase tracking-wider mb-2">Top Threats</h4>
                  <BulletList content={rollup.top_threats} accent="bg-socal-sunset-400" />
                </div>
              )}
              {rollup.key_trends && (
                <div>
                  <h4 className="text-xs font-semibold text-socal-ocean-600 uppercase tracking-wider mb-2">Key Trends</h4>
                  <BulletList content={rollup.key_trends} accent="bg-socal-ocean-400" />
                </div>
              )}
              {rollup.notable_launches && (
                <div>
                  <h4 className="text-xs font-semibold text-socal-sage-600 uppercase tracking-wider mb-2">Notable Launches</h4>
                  <BulletList content={rollup.notable_launches} accent="bg-socal-sage-400" />
                </div>
              )}
              {rollup.recommended_actions && (
                <div>
                  <h4 className="text-xs font-semibold text-socal-ocean-700 uppercase tracking-wider mb-2">Recommended Actions</h4>
                  <BulletList content={rollup.recommended_actions} accent="bg-socal-ocean-600" />
                </div>
              )}
            </div>
          )}
        </Card>
      ))}

      {filtered.length === 0 && (
        <div className="text-center text-socal-stone-400 text-sm py-12">
          No {periodType} rollups available yet.
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function MetaAnalysisPage() {
  const [activeTab, setActiveTab] = useState('scorecard');
  const [claims, setClaims] = useState<BriefClaim[]>([]);
  const [trends, setTrends] = useState<TrendTimeline[]>([]);
  const [mentions, setMentions] = useState<BrandMention[]>([]);
  const [rollups, setRollups] = useState<BriefRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [briefCount, setBriefCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      try {
        const sb = getSupabase();

        const [claimsRes, trendsRes, mentionsRes, rollupsRes, briefsRes] = await Promise.all([
          sb.from('ai_brief_claims').select('*').order('brief_date', { ascending: false }),
          sb.from('ai_brief_trends_timeline').select('*').order('mention_count', { ascending: false }),
          sb.from('ai_brief_brand_mentions').select('*').order('brief_date', { ascending: false }),
          sb.from('ai_brief_rollups').select('*').order('period_start', { ascending: false }),
          sb.from('ai_intel_briefs').select('id', { count: 'exact', head: true }),
        ]);

        setClaims(claimsRes.data || []);
        setTrends(trendsRes.data || []);
        setMentions(mentionsRes.data || []);
        setRollups(rollupsRes.data || []);
        setBriefCount(briefsRes.count || 0);
      } catch {
        setError('Unable to connect to the database.');
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-socal-stone-400 text-sm">Loading analysis data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-socal-sunset-600 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 tracking-tight">
          Brief Analysis
        </h1>
        <p className="mt-2 text-socal-stone-500 max-w-2xl">
          Meta-analysis of {claims.length} extracted claims across {briefCount} daily intelligence briefs.
          Tracking prediction accuracy, trend lead times, and competitive themes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-socal-sand-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-socal-ocean-700 border-b-2 border-socal-ocean-500'
                : 'text-socal-stone-500 hover:text-socal-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'scorecard' && <ScorecardTab claims={claims} />}
      {activeTab === 'trends' && <TrendsTab trends={trends} />}
      {activeTab === 'themes' && <ThemesTab mentions={mentions} />}
      {activeTab === 'signals' && <SignalMapTab claims={claims} />}
      {activeTab === 'rollups' && <RollupsTab rollups={rollups} />}
    </div>
  );
}
