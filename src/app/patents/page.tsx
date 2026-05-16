'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { MetricDelta } from '@/components/MetricDelta';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Filing {
  patent_number: string;
  brand_slug: string | null;
  applicant_name: string | null;
  title: string | null;
  abstract: string | null;
  filing_date: string | null;
  publication_date: string | null;
  status: string | null;
  cpc_classes: string | null;
  inventors: string | null;
  source_url: string | null;
  discovered_at: string | null;
}

interface ApiResponse {
  available: boolean;
  brand_filter: string | null;
  days: number;
  filings: Filing[];
  brand_names: Record<string, string>;
  lw_summary?: {
    last_30d: number;
    prior_30d: number;
  } | null;
  error?: string;
}

type WindowChoice = 90 | 365 | 730;

const PENDING_STATUSES = new Set(['filed', 'pending', 'published', 'application filed']);

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / 86_400_000);
}

function statusPill(status: string | null | undefined): { classes: string; label: string } {
  const s = (status || '').trim();
  if (!s) return { classes: 'bg-gr-raised text-gr-subtle', label: '-' };
  const lc = s.toLowerCase();
  if (lc.includes('granted') || lc.includes('issued')) {
    return { classes: 'bg-gr-success/15 text-gr-success', label: s };
  }
  if (PENDING_STATUSES.has(lc) || lc.includes('pending') || lc.includes('filed') || lc.includes('published')) {
    return { classes: 'bg-gr-accent/15 text-gr-accent', label: s };
  }
  if (lc.includes('abandoned') || lc.includes('expired') || lc.includes('withdrawn')) {
    return { classes: 'bg-gr-danger/10 text-gr-danger', label: s };
  }
  return { classes: 'bg-gr-raised text-gr-muted', label: s };
}

function isPending(status: string | null | undefined): boolean {
  const lc = (status || '').toLowerCase();
  return lc.includes('pending') || lc.includes('filed') || lc.includes('published');
}

function classChips(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

function abstractExcerpt(s: string | null, max = 180): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '...';
}

export default function PatentsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeBrands, setActiveBrands] = useState<Set<string>>(new Set());
  const [pendingOnly, setPendingOnly] = useState(false);
  const [windowDays, setWindowDays] = useState<WindowChoice>(365);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    // Always pull the 730 day window from the API; client narrows further.
    fetch(`${PULSE_API}/pulse/patents?days=730`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ApiResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  // Brand chip list, sorted by descending filing count.
  const brandOrder = useMemo(() => {
    if (!data) return [] as string[];
    const counts = new Map<string, number>();
    for (const f of data.filings || []) {
      const k = f.brand_slug || 'unknown';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  }, [data]);

  const filteredFilings = useMemo(() => {
    if (!data) return [] as Filing[];
    const cutoff = Date.now() - windowDays * 86_400_000;
    return (data.filings || []).filter((f) => {
      // Window filter on publication_date.
      if (f.publication_date) {
        const t = new Date(f.publication_date).getTime();
        if (!isNaN(t) && t < cutoff) return false;
      } else if (windowDays < 730) {
        return false;
      }
      if (activeBrands.size > 0) {
        const slug = f.brand_slug || 'unknown';
        if (!activeBrands.has(slug)) return false;
      }
      if (pendingOnly && !isPending(f.status)) return false;
      return true;
    });
  }, [data, windowDays, activeBrands, pendingOnly]);

  // KPIs (always against the full 730d API response so the strip stays
  // stable when the user narrows the window).
  const kpis = useMemo(() => {
    if (!data) return { total365: 0, total90: 0, total30: 0, total7: 0 };
    const now = Date.now();
    const thirtyAgo = now - 30 * 86_400_000;
    const ninetyAgo = now - 90 * 86_400_000;
    const yearAgo = now - 365 * 86_400_000;
    const sevenAgo = now - 7 * 86_400_000;
    let total365 = 0;
    let total90 = 0;
    let total30 = 0;
    let total7 = 0;
    for (const f of data.filings || []) {
      if (!f.publication_date) continue;
      const t = new Date(f.publication_date).getTime();
      if (isNaN(t)) continue;
      if (t >= yearAgo) total365 += 1;
      if (t >= ninetyAgo) total90 += 1;
      if (t >= thirtyAgo) total30 += 1;
      if (t >= sevenAgo) total7 += 1;
    }
    return { total365, total90, total30, total7 };
  }, [data]);

  const toggleBrand = (slug: string) => {
    const next = new Set(activeBrands);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setActiveBrands(next);
    trackEvent('click', { label: 'patent_brand_chip', metadata: { brand: slug } });
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading patent publications...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing + Product &middot; Patent Radar
            </p>
            <ConfidenceBadge source="uspto_patents" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            USPTO patents - material + construction leak signal
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Patent monitor is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The patent-monitor agent needs at least one cycle before this page renders. Daily run lands 5:45 AM ET.
          </p>
        </section>
      </div>
    );
  }

  const brandLabel = (slug: string) => data.brand_names[slug] || slug;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing + Product &middot; Patent Radar
          </p>
          <ConfidenceBadge source="uspto_patents" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          USPTO patents - material + construction leak signal
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Patents file 18 to 24 months before product launch. Material innovations (new fabric blends),
          construction techniques (new compression sleeve construction), and mechanism filings
          (belt buckles, grip patterns) all leak here. Pattern detection lead time is longer than
          TMs but signal is more product-specific.
        </p>
      </header>

      <SectionExplainer
        what="Every U.S. patent application or grant published by a competitor in the last two years. One row is one publication - publication number, title, abstract excerpt, IPC class, and whether it is pending or granted."
        howToRead='Status "Pending" means a published application (filed ~18 months ago, not yet granted) - that is the strongest leak signal because the brand is still committed to shipping it. "Granted" means the patent issued; usually the SKU is already on shelf. IPC codes carry product semantics: A41D is wearing apparel, A43B is footwear, A63B is sporting / training gear, D02G is yarn / textile construction.'
        whatToDo="Use the abstract excerpts to identify category bets you have not made yet. A cluster of D02G knit-textile filings from one brand says they are about to drop a new material story. A41D 13 (protective garments) plus A63B (training equipment) from the same applicant is a body-protection bet - belts, sleeves, wraps. Map their pipeline to your roadmap before they hit Instagram."
      />

      {/* KPI strip - fixed window (730d API response). */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filings (365d)</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.total365}</div>
          <div className="text-xs text-gr-muted mt-1">across the tracked set</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filings (90d)</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.total90}</div>
          <div className="text-xs text-gr-muted mt-1">recent category bets</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filings (30d)</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{kpis.total30}</div>
          <div className="text-xs text-gr-muted mt-1 flex items-baseline gap-2">
            <span>fresh publications</span>
            <MetricDelta
              current={data?.lw_summary?.last_30d ?? kpis.total30}
              previous={data?.lw_summary?.prior_30d ?? null}
              compact
            />
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">New this week</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{kpis.total7}</div>
          <div className="text-xs text-gr-muted mt-1">published in last 7d</div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Window</span>
          {([90, 365, 730] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setWindowDays(d);
                trackEvent('click', { label: 'patent_window', metadata: { days: d } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                windowDays === d
                  ? 'bg-gr-accent text-gr-text'
                  : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
              }`}
            >
              Last {d}d
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-gr-border" aria-hidden="true" />
          <label className="inline-flex items-center gap-2 text-xs text-gr-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={(e) => {
                setPendingOnly(e.target.checked);
                trackEvent('click', { label: 'patent_pending_only', metadata: { value: e.target.checked } });
              }}
              className="accent-gr-accent"
            />
            <span className="uppercase tracking-wider font-bold text-[11px]">Show pending only</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Brands</span>
          <button
            type="button"
            onClick={() => {
              setActiveBrands(new Set());
              trackEvent('click', { label: 'patent_brand_chip', metadata: { brand: 'all' } });
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
              activeBrands.size === 0
                ? 'bg-gr-accent text-gr-text'
                : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
            }`}
          >
            All
          </button>
          {brandOrder.map((slug) => {
            const isActive = activeBrands.has(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggleBrand(slug)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                  isActive
                    ? 'bg-gr-accent text-gr-text'
                    : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
                }`}
              >
                {brandLabel(slug)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Filings table */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-7">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Filings ({filteredFilings.length})
          </h2>
          <div className="text-xs text-gr-subtle">Click any row for full abstract + USPTO record</div>
        </div>

        {filteredFilings.length === 0 ? (
          <p className="text-sm text-gr-muted py-6">No publications match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Published</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Brand</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Title</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Status</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">IPC class</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Inventors</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilings.map((f, i) => {
                  const pill = statusPill(f.status);
                  const slug = f.brand_slug || 'unknown';
                  const age = daysSince(f.publication_date);
                  const isOpen = expanded === f.patent_number;
                  const chips = classChips(f.cpc_classes);
                  const excerpt = abstractExcerpt(f.abstract, 220);
                  return (
                    <>
                      <tr
                        key={`${f.patent_number}-row`}
                        onClick={() => {
                          const next = isOpen ? null : f.patent_number;
                          setExpanded(next);
                          trackEvent('expand', {
                            label: 'patent_row',
                            metadata: { patent: f.patent_number, open: !isOpen },
                          });
                        }}
                        className={`border-b border-gr-border last:border-0 cursor-pointer hover:bg-gr-bg/30 transition ${
                          i % 2 === 1 ? 'bg-gr-bg/20' : ''
                        } ${isOpen ? 'bg-gr-bg/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-gr-text whitespace-nowrap tabular-nums">
                          {fmtDate(f.publication_date)}
                          {age != null && age <= 30 && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gr-accent">
                              NEW
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gr-text font-medium whitespace-nowrap">{brandLabel(slug)}</td>
                        <td className="py-2.5 px-3 text-gr-text font-medium max-w-md">
                          {f.title ? (
                            <span>{f.title}</span>
                          ) : (
                            <span className="text-gr-subtle italic">(untitled)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pill.classes}`}>
                            {pill.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {chips.length === 0 ? (
                              <span className="text-gr-subtle">-</span>
                            ) : (
                              chips.slice(0, 3).map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-bold tabular-nums bg-gr-bg border border-gr-border rounded px-1.5 py-0.5 text-gr-muted"
                                >
                                  {c}
                                </span>
                              ))
                            )}
                            {chips.length > 3 && (
                              <span className="text-[10px] text-gr-subtle">+{chips.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-gr-muted text-xs max-w-[18ch] truncate">
                          {f.inventors || <span className="text-gr-subtle">-</span>}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${f.patent_number}-detail`} className="border-b border-gr-border last:border-0 bg-gr-bg/40">
                          <td colSpan={6} className="py-4 px-4">
                            <div className="grid md:grid-cols-3 gap-6 text-sm">
                              <div className="md:col-span-2 space-y-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                    Abstract
                                  </div>
                                  {f.abstract ? (
                                    <p className="text-gr-text whitespace-pre-line leading-relaxed">{f.abstract}</p>
                                  ) : (
                                    <p className="text-gr-subtle italic">
                                      Not captured. (Use the Google Patents link to read the full record.)
                                    </p>
                                  )}
                                </div>
                                {f.applicant_name && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                      Applicant
                                    </div>
                                    <p className="text-gr-muted">{f.applicant_name}</p>
                                  </div>
                                )}
                                {f.inventors && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                      Inventors
                                    </div>
                                    <p className="text-gr-muted">{f.inventors}</p>
                                  </div>
                                )}
                                {excerpt && !f.abstract && (
                                  <p className="text-gr-muted text-xs italic">Excerpt: {excerpt}</p>
                                )}
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                    Publication number
                                  </div>
                                  <p className="text-gr-text font-mono tabular-nums">{f.patent_number}</p>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                    Filing date
                                  </div>
                                  <p className="text-gr-muted">{fmtDate(f.filing_date)}</p>
                                </div>
                                {f.source_url && (
                                  <a
                                    href={f.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                      trackEvent('outbound', {
                                        label: 'patent_google_link',
                                        metadata: { patent: f.patent_number },
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gr-accent hover:text-gr-accent-hover transition"
                                  >
                                    View on Google Patents &rarr;
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.patents</code>.
        Source: USPTO public register via WIPO Patentscope aggregator. Patentscope indexes USPTO
        publications within roughly 1 to 2 weeks of the office publishing; patents themselves
        publish ~18 months after filing. Daily run lands 5:45 AM ET via patent-monitor.
      </div>
    </div>
  );
}
