'use client';

import { useGymreapersData } from '../_lib/GymreapersProvider';

export default function GymreapersJobsPage() {
  const { data, loading, error } = useGymreapersData();

  if (loading && !data) return <div className="text-center py-20 text-gr-subtle">Loading jobs...</div>;
  if (error && !data) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return null;

  const focus = data.focus_brand;
  const jobsBrands = data.brand_order
    .map((slug) => ({ slug, j: data.jobs[slug] }))
    .filter((b) => b.j && (b.j.total_jobs ?? 0) > 0);

  const totalJobs = jobsBrands.reduce((sum, b) => sum + (b.j!.total_jobs || 0), 0);
  const focusJobs = data.jobs[focus]?.total_jobs || 0;

  // Combine all recent postings across in-scope brands
  const recentPostings = jobsBrands
    .flatMap((b) => (b.j!.jobs || []).map((p) => ({ ...p, brand: b.slug })))
    .slice(0, 30);

  // Brands without integration
  const noDataBrands = data.brand_order.filter(
    (slug) => !data.jobs[slug] || (data.jobs[slug]?.total_jobs ?? 0) === 0
  );

  return (
    <div className="space-y-10">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Gymreapers / Hiring Activity
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Jobs</h1>
        <p className="text-gr-muted mt-3 max-w-3xl">
          Open headcount by brand. A growing team is a growth signal.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total openings', value: totalJobs.toLocaleString(), context: 'across tracked brands' },
          {
            label: 'Brands integrated',
            value: jobsBrands.length,
            context: `of ${data.brand_order.length} in scope`,
          },
          { label: 'Gymreapers', value: focusJobs, context: 'open positions' },
          {
            label: 'No data',
            value: noDataBrands.length,
            context: 'need ATS integration',
          },
        ].map((s) => (
          <div key={s.label} className="bg-gr-surface rounded-md p-6 border border-gr-border">
            <p className="text-sm text-gr-subtle font-medium">{s.label}</p>
            <p className="text-3xl font-bold text-gr-text mt-1">{s.value}</p>
            <p className="text-xs text-gr-subtle mt-1">{s.context}</p>
          </div>
        ))}
      </section>

      {/* Brand cards */}
      {jobsBrands.length > 0 ? (
        <section className="grid md:grid-cols-2 gap-6">
          {jobsBrands.map(({ slug, j }) => {
            const isFocus = slug === focus;
            const topDepts = Object.entries(j!.departments || {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 4);
            const topLocations = (j!.locations || []).slice(0, 4);
            return (
              <div
                key={slug}
                className={`bg-gr-surface rounded-md p-6 border ${
                  isFocus ? 'border-gr-accent-soft ring-2 ring-gr-accent-soft' : 'border-gr-border'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${isFocus ? 'text-gr-accent' : 'text-gr-text'}`}>
                    {data.brand_names[slug]}
                  </h3>
                  <span className="text-2xl font-bold text-gr-text">
                    {j!.total_jobs}
                    {typeof j!.change_from_last === 'number' && j!.change_from_last !== 0 && (
                      <span
                        className={`ml-2 text-sm font-medium ${
                          j!.change_from_last > 0 ? 'text-gr-success' : 'text-gr-danger'
                        }`}
                      >
                        {j!.change_from_last > 0 ? '+' : ''}
                        {j!.change_from_last}
                      </span>
                    )}
                  </span>
                </div>
                {topDepts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gr-subtle uppercase tracking-wide mb-2">Top departments</p>
                    <div className="space-y-1">
                      {topDepts.map(([dept, n]) => (
                        <div key={dept} className="flex items-center justify-between text-sm">
                          <span className="text-gr-muted capitalize">{dept}</span>
                          <span className="text-gr-text font-medium">{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {topLocations.length > 0 && (
                  <div>
                    <p className="text-xs text-gr-subtle uppercase tracking-wide mb-2">Top locations</p>
                    <ul className="text-sm text-gr-muted space-y-1">
                      {topLocations.map((loc, i) => (
                        <li key={i} className="truncate">{loc}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : (
        <section className="bg-gr-surface rounded-md p-12 border border-gr-border text-center">
          <p className="text-gr-muted">
            No hiring data collected for any of the strength brands yet.
          </p>
        </section>
      )}

      {/* Recent postings feed */}
      {recentPostings.length > 0 && (
        <section className="bg-gr-surface rounded-md p-8 border border-gr-border">
          <h2 className="text-xl font-bold text-gr-text mb-6">Recent Postings</h2>
          <ul className="space-y-3">
            {recentPostings.map((p, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-gr-border pb-3 last:border-0">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 mt-0.5 bg-gr-raised text-gr-muted">
                  {data.brand_names[p.brand]}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gr-text hover:text-gr-accent font-medium block"
                  >
                    {p.title}
                  </a>
                  <div className="text-xs text-gr-subtle mt-0.5">
                    {p.department || p.category}
                    {p.location && ` · ${p.location}`}
                    {p.seniority && ` · ${p.seniority}`}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* No-data brands */}
      {noDataBrands.length > 0 && (
        <section className="bg-gr-raised rounded-md p-6 border border-gr-border">
          <h3 className="text-sm font-semibold text-gr-text mb-3">No hiring signal yet</h3>
          <p className="text-xs text-gr-muted mb-4">
            These brands don&apos;t use a known applicant tracking system (Greenhouse, Lever, Workday, Ashby).
            Add their careers page to <code>job_monitor.py</code> to enable tracking.
          </p>
          <div className="flex flex-wrap gap-2">
            {noDataBrands.map((slug) => (
              <span
                key={slug}
                className="px-3 py-1 rounded-full text-xs bg-gr-surface border border-gr-border text-gr-muted"
              >
                {data.brand_names[slug]}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
