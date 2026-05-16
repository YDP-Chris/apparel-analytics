'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Filing {
  serial_number: string;
  brand_slug: string | null;
  applicant_name: string | null;
  mark_text: string | null;
  filing_date: string | null;
  status: string | null;
  status_date: string | null;
  goods_services: string | null;
  international_class: string | null;
  source_url: string | null;
  discovered_at: string | null;
}

interface ApiResponse {
  available: boolean;
  brand_filter: string | null;
  days: number;
  filings: Filing[];
  brand_names: Record<string, string>;
  error?: string;
}

type WindowChoice = 30 | 90 | 365;

const PENDING_STATUSES = new Set(['filed', 'pending', 'published for opposition', 'application filed']);

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
  if (lc.includes('registered')) {
    return { classes: 'bg-gr-success/15 text-gr-success', label: s };
  }
  if (PENDING_STATUSES.has(lc) || lc.includes('filed') || lc.includes('pending') || lc.includes('opposition')) {
    return { classes: 'bg-gr-accent/15 text-gr-accent', label: s };
  }
  if (lc.includes('ended') || lc.includes('abandoned') || lc.includes('cancelled') || lc.includes('expired')) {
    return { classes: 'bg-gr-danger/10 text-gr-danger', label: s };
  }
  return { classes: 'bg-gr-raised text-gr-muted', label: s };
}

function isPending(status: string | null | undefined): boolean {
  const lc = (status || '').toLowerCase();
  return lc.includes('filed') || lc.includes('pending') || lc.includes('opposition');
}

function classChips(s: string | null): string[] {
  if (!s) return [];
  return s
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

export default function TrademarksPage() {
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
    // Always pull the 365 day window from the API; client narrows further.
    fetch(`${PULSE_API}/pulse/trademarks?days=365`, {
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
      // Window filter on filing_date.
      if (f.filing_date) {
        const t = new Date(f.filing_date).getTime();
        if (!isNaN(t) && t < cutoff) return false;
      } else if (windowDays < 365) {
        // No filing_date can't pass a tighter window.
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

  // KPIs (always against the full 365d API response so the strip stays
  // stable when the user narrows the window).
  const kpis = useMemo(() => {
    if (!data) return { total365: 0, total90: 0, total7: 0, totalToday: 0 };
    const today = new Date();
    const sevenAgo = today.getTime() - 7 * 86_400_000;
    const ninetyAgo = today.getTime() - 90 * 86_400_000;
    const todayISO = today.toISOString().slice(0, 10);
    let total365 = 0;
    let total90 = 0;
    let total7 = 0;
    let totalToday = 0;
    for (const f of data.filings || []) {
      if (!f.filing_date) continue;
      const t = new Date(f.filing_date).getTime();
      if (isNaN(t)) continue;
      total365 += 1;
      if (t >= ninetyAgo) total90 += 1;
      if (t >= sevenAgo) total7 += 1;
      if (f.filing_date.slice(0, 10) === todayISO) totalToday += 1;
    }
    return { total365, total90, total7, totalToday };
  }, [data]);

  const toggleBrand = (slug: string) => {
    const next = new Set(activeBrands);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setActiveBrands(next);
    trackEvent('click', { label: 'trademark_brand_chip', metadata: { brand: slug } });
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading trademark filings...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing &middot; Trademark Radar
            </p>
            <ConfidenceBadge source="uspto_trademarks" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            USPTO filings as pre-launch leak signal
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Trademark monitor is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The tm-monitor agent needs at least one cycle before this page renders. Daily run lands 5:30 AM ET.
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
            For Marketing &middot; Trademark Radar
          </p>
          <ConfidenceBadge source="uspto_trademarks" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          USPTO filings as pre-launch leak signal
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Brands file trademarks 3 to 6 months before the SKU ships, so a new entry hints at an
          upcoming launch. We track filings under each competitor&apos;s legal entity and surface
          them here as soon as the USPTO public register propagates.
        </p>
      </header>

      <SectionExplainer
        what="Every U.S. trademark application filed by a competitor in the last year. One row is one filing — serial number, mark text, classes, and where it is in the prosecution lifecycle."
        howToRead='Status "Filed" or "Pending" means it just dropped and the brand has not shipped under the mark yet. Class numbers are the Nice International Classes (25 = clothing, 28 = sporting goods, 5 = supplements). A new wordmark in class 25 from SBD is the strongest possible "they are about to launch this" signal.'
        whatToDo="Cross-check with the launch velocity page. If a competitor filed a wordmark 4 months ago and you are seeing sitemap noise this week, that is the SKU landing. Plan response copy / merchandising before they post."
      />

      {/* KPI strip — fixed window (365d API response). */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filings (365d)</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.total365}</div>
          <div className="text-xs text-gr-muted mt-1">across the tracked set</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filings (90d)</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.total90}</div>
          <div className="text-xs text-gr-muted mt-1">most likely about to ship</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filings (7d)</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{kpis.total7}</div>
          <div className="text-xs text-gr-muted mt-1">just-landed, react now</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">New today</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{kpis.totalToday}</div>
          <div className="text-xs text-gr-muted mt-1">filing_date = today (USPTO lag ~48h)</div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Window</span>
          {([30, 90, 365] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setWindowDays(d);
                trackEvent('click', { label: 'trademark_window', metadata: { days: d } });
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
                trackEvent('click', { label: 'trademark_pending_only', metadata: { value: e.target.checked } });
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
              trackEvent('click', { label: 'trademark_brand_chip', metadata: { brand: 'all' } });
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
          <div className="text-xs text-gr-subtle">Click any row for goods and services + USPTO record</div>
        </div>

        {filteredFilings.length === 0 ? (
          <p className="text-sm text-gr-muted py-6">No filings match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Filed</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Brand</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Mark text</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Status</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Class</th>
                </tr>
              </thead>
              <tbody>
                {filteredFilings.map((f, i) => {
                  const pill = statusPill(f.status);
                  const slug = f.brand_slug || 'unknown';
                  const age = daysSince(f.filing_date);
                  const isOpen = expanded === f.serial_number;
                  const chips = classChips(f.international_class);
                  return (
                    <>
                      <tr
                        key={`${f.serial_number}-row`}
                        onClick={() => {
                          const next = isOpen ? null : f.serial_number;
                          setExpanded(next);
                          trackEvent('expand', {
                            label: 'trademark_row',
                            metadata: { serial: f.serial_number, open: !isOpen },
                          });
                        }}
                        className={`border-b border-gr-border last:border-0 cursor-pointer hover:bg-gr-bg/30 transition ${
                          i % 2 === 1 ? 'bg-gr-bg/20' : ''
                        } ${isOpen ? 'bg-gr-bg/40' : ''}`}
                      >
                        <td className="py-2.5 px-3 text-gr-text whitespace-nowrap tabular-nums">
                          {fmtDate(f.filing_date)}
                          {age != null && age <= 7 && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-gr-accent">
                              NEW
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gr-text font-medium whitespace-nowrap">{brandLabel(slug)}</td>
                        <td className="py-2.5 px-3 text-gr-muted">
                          {f.mark_text ? (
                            <span className="font-medium text-gr-text">{f.mark_text}</span>
                          ) : (
                            <span className="text-gr-subtle italic">(figurative / no wordmark)</span>
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
                              chips.slice(0, 4).map((c) => (
                                <span
                                  key={c}
                                  className="text-[10px] font-bold tabular-nums bg-gr-bg border border-gr-border rounded px-1.5 py-0.5 text-gr-muted"
                                >
                                  {c}
                                </span>
                              ))
                            )}
                            {chips.length > 4 && (
                              <span className="text-[10px] text-gr-subtle">+{chips.length - 4}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${f.serial_number}-detail`} className="border-b border-gr-border last:border-0 bg-gr-bg/40">
                          <td colSpan={5} className="py-4 px-4">
                            <div className="grid md:grid-cols-3 gap-6 text-sm">
                              <div className="md:col-span-2 space-y-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                    Goods and services
                                  </div>
                                  {f.goods_services ? (
                                    <p className="text-gr-text whitespace-pre-line leading-relaxed">{f.goods_services}</p>
                                  ) : (
                                    <p className="text-gr-subtle italic">
                                      Not captured. (Use the USPTO source link to read the full record.)
                                    </p>
                                  )}
                                </div>
                                {f.applicant_name && (
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                      Filed by
                                    </div>
                                    <p className="text-gr-muted">{f.applicant_name}</p>
                                  </div>
                                )}
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                    Serial
                                  </div>
                                  <p className="text-gr-text font-mono tabular-nums">{f.serial_number}</p>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                                    Status updated
                                  </div>
                                  <p className="text-gr-muted">{fmtDate(f.status_date)}</p>
                                </div>
                                {f.source_url && (
                                  <a
                                    href={f.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() =>
                                      trackEvent('outbound', {
                                        label: 'trademark_uspto_link',
                                        metadata: { serial: f.serial_number },
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gr-accent hover:text-gr-accent-hover transition"
                                  >
                                    View on USPTO TSDR &rarr;
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
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.trademarks</code>.
        Source: USPTO public register via WIPO TMView aggregator. USPTO is a contributing office, so US filings
        propagate to TMView within roughly 24 to 48 hours of filing. Daily run lands 5:30 AM ET via tm-monitor.
      </div>
    </div>
  );
}
