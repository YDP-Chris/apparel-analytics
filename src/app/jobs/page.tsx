'use client';

import { Card, BarChart, DonutChart, Text, Metric, Badge } from '@tremor/react';
import jobsData from '@/data/jobs.json';

interface JobData {
  id: string;
  title: string;
  location: string;
  department: string;
  category: string;
  seniority: string;
  url: string;
}

interface BrandJobs {
  name: string;
  platform: string;
  total_jobs: number;
  change_from_last: number;
  departments: Record<string, number>;
  seniority: Record<string, number>;
  locations: string[];
  jobs: JobData[];
  checked_at: string;
}

interface JobsData {
  brands: Record<string, BrandJobs>;
  generated_at: string;
}

const data = jobsData as unknown as JobsData;

const BRAND_NAMES: Record<string, string> = {
  vuori: 'Vuori',
  lululemon: 'Lululemon',
  alo: 'Alo Yoga',
  gymshark: 'Gymshark',
  outdoor_voices: 'Outdoor Voices',
  tenthousand: 'Ten Thousand',
  rhone: 'Rhone',
  on_running: 'On Running',
};

const BRAND_COLORS: Record<string, 'cyan' | 'rose' | 'violet' | 'amber' | 'emerald' | 'blue' | 'orange' | 'gray'> = {
  vuori: 'cyan',
  lululemon: 'rose',
  alo: 'violet',
  gymshark: 'amber',
  outdoor_voices: 'emerald',
  tenthousand: 'blue',
  on_running: 'orange',
  rhone: 'gray',
};

const DEPT_COLORS: Record<string, string> = {
  retail: 'bg-rose-500',
  operations: 'bg-amber-500',
  engineering: 'bg-blue-500',
  design: 'bg-violet-500',
  marketing: 'bg-emerald-500',
  finance: 'bg-cyan-500',
  hr: 'bg-pink-500',
  product: 'bg-orange-500',
  executive: 'bg-slate-700',
  other: 'bg-gray-400',
};

export default function JobsPage() {
  const brands = data.brands || {};

  // Filter to brands with jobs
  const brandsWithJobs = Object.entries(brands)
    .filter(([, b]) => b.total_jobs > 0)
    .sort((a, b) => b[1].total_jobs - a[1].total_jobs);

  // Total jobs
  const totalJobs = brandsWithJobs.reduce((sum, [, b]) => sum + b.total_jobs, 0);

  // Job count chart data
  const jobCountData = brandsWithJobs.map(([id, b]) => ({
    brand: BRAND_NAMES[id] || b.name,
    'Open Roles': b.total_jobs,
  }));

  // Aggregate departments across all brands
  const allDepts: Record<string, number> = {};
  for (const [, brand] of brandsWithJobs) {
    for (const [dept, count] of Object.entries(brand.departments || {})) {
      allDepts[dept] = (allDepts[dept] || 0) + count;
    }
  }

  const deptChartData = Object.entries(allDepts)
    .sort((a, b) => b[1] - a[1])
    .map(([dept, count]) => ({
      name: dept.charAt(0).toUpperCase() + dept.slice(1),
      value: count,
    }));

  // Aggregate seniority
  const allSeniority: Record<string, number> = {};
  for (const [, brand] of brandsWithJobs) {
    for (const [level, count] of Object.entries(brand.seniority || {})) {
      allSeniority[level] = (allSeniority[level] || 0) + count;
    }
  }

  const seniorityData = Object.entries(allSeniority)
    .sort((a, b) => b[1] - a[1])
    .map(([level, count]) => ({
      name: level.charAt(0).toUpperCase() + level.slice(1),
      value: count,
    }));

  // Top hiring brand
  const topBrand = brandsWithJobs[0];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="max-w-3xl">
        <Text className="text-socal-ocean-600 uppercase tracking-wider text-sm mb-2">
          Hiring Intelligence
        </Text>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 mb-4">
          Job Postings
        </h1>
        <p className="text-socal-stone-500 text-lg leading-relaxed">
          Track hiring activity across athleisure brands. Job counts signal growth,
          department breakdown reveals strategic priorities.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Total Open Roles</Text>
          <Metric className="text-socal-stone-800">{totalJobs}</Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Across {brandsWithJobs.length} brands</Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Top Hiring</Text>
          <Metric className="text-socal-ocean-600">
            {topBrand ? BRAND_NAMES[topBrand[0]] || topBrand[1].name : '-'}
          </Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">
            {topBrand ? `${topBrand[1].total_jobs} open roles` : ''}
          </Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Top Department</Text>
          <Metric className="text-socal-stone-800">
            {deptChartData[0]?.name || '-'}
          </Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">
            {deptChartData[0] ? `${deptChartData[0].value} roles` : ''}
          </Text>
        </Card>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <Text className="text-socal-stone-400">Avg per Brand</Text>
          <Metric className="text-socal-stone-800">
            {brandsWithJobs.length > 0 ? Math.round(totalJobs / brandsWithJobs.length) : 0}
          </Metric>
          <Text className="text-xs text-socal-stone-400 mt-1">Open positions</Text>
        </Card>
      </div>

      {/* Key Insight */}
      {topBrand && (
        <Card className="bg-gradient-to-r from-socal-sand-50 to-socal-ocean-50 border-socal-sand-200 ring-0 p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <Text className="text-socal-stone-400 mb-2">Growth Signal</Text>
              <h2 className="text-2xl md:text-3xl font-bold text-socal-stone-800 mb-3">
                <span className="text-socal-ocean-600">{BRAND_NAMES[topBrand[0]] || topBrand[1].name}</span>{' '}
                is hiring aggressively
              </h2>
              <p className="text-socal-stone-500">
                With {topBrand[1].total_jobs} open roles, that&apos;s{' '}
                {brandsWithJobs[1] && (
                  <>{Math.round(topBrand[1].total_jobs / brandsWithJobs[1][1].total_jobs * 10) / 10}x more than {BRAND_NAMES[brandsWithJobs[1][0]] || brandsWithJobs[1][1].name}</>
                )}.
                Heavy hiring often precedes rapid expansion or new initiatives.
              </p>
            </div>
            <div className="text-center md:text-right">
              <Metric className="text-socal-ocean-600 text-5xl md:text-6xl font-bold">
                {topBrand[1].total_jobs}
              </Metric>
              <Text className="text-socal-stone-400">open roles</Text>
            </div>
          </div>
        </Card>
      )}

      {/* Jobs by Brand */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Open Roles by Brand
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Current job postings across tracked companies
        </Text>

        <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
          <BarChart
            data={jobCountData}
            index="brand"
            categories={['Open Roles']}
            colors={['cyan']}
            className="h-72"
            showAnimation
            showGridLines={false}
            layout="vertical"
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Department Breakdown */}
        <div>
          <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
            Hiring by Department
          </h2>
          <Text className="text-socal-stone-500 mb-6">
            Where brands are investing in talent
          </Text>

          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <DonutChart
              data={deptChartData}
              category="value"
              index="name"
              colors={['rose', 'amber', 'blue', 'violet', 'emerald', 'cyan', 'pink', 'orange', 'slate', 'gray']}
              className="h-64"
              showAnimation
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {deptChartData.slice(0, 6).map((dept) => (
                <div key={dept.name} className="flex items-center justify-between text-sm">
                  <span className="text-socal-stone-600">{dept.name}</span>
                  <span className="font-medium">{dept.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Seniority Breakdown */}
        <div>
          <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
            Hiring by Seniority
          </h2>
          <Text className="text-socal-stone-500 mb-6">
            Experience levels being recruited
          </Text>

          <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
            <DonutChart
              data={seniorityData}
              category="value"
              index="name"
              colors={['cyan', 'blue', 'violet', 'emerald', 'amber', 'rose', 'slate', 'gray']}
              className="h-64"
              showAnimation
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {seniorityData.slice(0, 6).map((level) => (
                <div key={level.name} className="flex items-center justify-between text-sm">
                  <span className="text-socal-stone-600">{level.name}</span>
                  <span className="font-medium">{level.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Brand Details */}
      <div>
        <h2 className="text-xl font-semibold text-socal-stone-800 mb-2">
          Brand Breakdown
        </h2>
        <Text className="text-socal-stone-500 mb-6">
          Department focus and recent postings by brand
        </Text>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {brandsWithJobs.map(([brandId, brand]) => (
            <Card key={brandId} className="bg-white border-socal-sand-100 ring-0 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <Badge color={BRAND_COLORS[brandId] || 'gray'} size="lg">
                  {BRAND_NAMES[brandId] || brand.name}
                </Badge>
                <span className="text-2xl font-bold text-socal-stone-800">
                  {brand.total_jobs}
                </span>
              </div>

              {/* Department bars */}
              <div className="space-y-2 mb-4">
                {Object.entries(brand.departments || {})
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([dept, count]) => (
                    <div key={dept}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-socal-stone-500 capitalize">{dept}</span>
                        <span className="text-socal-stone-600">{count}</span>
                      </div>
                      <div className="w-full bg-socal-stone-100 rounded-full h-2">
                        <div
                          className={`${DEPT_COLORS[dept] || 'bg-gray-400'} h-2 rounded-full`}
                          style={{ width: `${(count / brand.total_jobs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Sample jobs */}
              <div className="border-t border-socal-sand-100 pt-3">
                <p className="text-xs text-socal-stone-400 mb-2">Recent postings:</p>
                <div className="space-y-1">
                  {brand.jobs?.slice(0, 3).map((job) => (
                    <a
                      key={job.id}
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-socal-stone-600 hover:text-socal-ocean-600 truncate"
                    >
                      • {job.title}
                    </a>
                  ))}
                </div>
              </div>

              <p className="text-xs text-socal-stone-400 mt-3">
                Platform: {brand.platform}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Data Quality Note */}
      <Card className="bg-socal-sand-50 border-socal-sand-200 ring-0">
        <div className="flex items-start gap-4">
          <span className="text-2xl">💼</span>
          <div>
            <h3 className="font-semibold text-socal-stone-700">About This Data</h3>
            <p className="text-sm text-socal-stone-500 mt-1">
              Job postings are collected from Greenhouse, Lever, and Ashby job boards.
              Department and seniority are estimated from job titles using keyword analysis.
              Some brands (Vuori, Lululemon, Rhone) are pending integration.
              Data updates every 4 hours.
            </p>
            {data.generated_at && (
              <p className="text-xs text-socal-stone-400 mt-2">
                Last updated: {new Date(data.generated_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
