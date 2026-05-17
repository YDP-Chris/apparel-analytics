'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Signal {
  signal_type: string;
  signal_value: string;
  country_code: string | null;
  evidence_url: string | null;
  first_seen: string | null;
  last_seen: string | null;
  is_active: boolean;
}

interface BrandRow {
  brand_slug: string;
  brand_name: string;
  total_countries: number;
  countries: string[];
  active_signals: number;
  inactive_signals: number;
  new_in_30d: number;
  most_recent_first_seen: string | null;
  signals: Signal[];
}

interface CountryRow {
  country_code: string;
  brand_count: number;
  brands: string[];
}

interface NewlyDetected {
  brand_slug: string;
  brand_name: string;
  signal_type: string;
  signal_value: string;
  country_code: string | null;
  evidence_url: string | null;
  first_seen: string;
}

interface ApiResponse {
  available: boolean;
  brands: BrandRow[];
  country_summary: CountryRow[];
  newly_detected_30d: NewlyDetected[];
  totals: {
    all_countries: number;
    active_signals: number;
    new_in_30d: number;
    widest_brand: string | null;
    widest_brand_country_count: number;
    most_recent_brand: string | null;
    most_recent_first_seen: string | null;
  };
  brand_names: Record<string, string>;
  error?: string;
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  CH: 'Switzerland',
  AT: 'Austria',
  BE: 'Belgium',
  IE: 'Ireland',
  PT: 'Portugal',
  PL: 'Poland',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  SG: 'Singapore',
  MX: 'Mexico',
  BR: 'Brazil',
  ZA: 'South Africa',
  IN: 'India',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EU: 'European Union',
};

const SIGNAL_LABELS: Record<string, string> = {
  tld_domain: 'TLD Domain',
  shipping_zone: 'Shipping Zone',
  hreflang_region: 'Hreflang Region',
  locale_path: 'Locale Path',
  currency_select: 'Currency Select',
  geo_landing_page: 'Geo Landing Page',
};

const SIGNAL_CLASSES: Record<string, string> = {
  tld_domain: 'bg-gr-accent-soft text-gr-accent',
  shipping_zone: 'bg-gr-success/15 text-gr-success',
  hreflang_region: 'bg-gr-raised text-gr-text',
  locale_path: 'bg-gr-warning/15 text-gr-warning',
  currency_select: 'bg-gr-accent/15 text-gr-accent',
  geo_landing_page: 'bg-gr-raised text-gr-muted',
};

function countryLabel(code: string | null | undefined): string {
  if (!code) return 'global';
  return COUNTRY_NAMES[code] || code;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function InternationalPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [countryFilter, setCountryFilter] = useState<string>('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/international`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ApiResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filteredBrands = useMemo<BrandRow[]>(() => {
    if (!data) return [];
    let rows = data.brands;
    if (brandFilter) rows = rows.filter((b) => b.brand_slug === brandFilter);
    if (countryFilter) rows = rows.filter((b) => b.countries.includes(countryFilter));
    return rows;
  }, [data, brandFilter, countryFilter]);

  const filteredCountries = useMemo<CountryRow[]>(() => {
    if (!data) return [];
    let rows = data.country_summary;
    if (countryFilter) rows = rows.filter((c) => c.country_code === countryFilter);
    if (brandFilter) rows = rows.filter((c) => c.brands.includes(brandFilter));
    return rows;
  }, [data, brandFilter, countryFilter]);

  const filteredNew = useMemo<NewlyDetected[]>(() => {
    if (!data) return [];
    let rows = data.newly_detected_30d;
    if (brandFilter) rows = rows.filter((r) => r.brand_slug === brandFilter);
    if (countryFilter) rows = rows.filter((r) => r.country_code === countryFilter);
    return rows;
  }, [data, brandFilter, countryFilter]);

  const allBrands = useMemo(() => {
    if (!data) return [];
    return data.brands.map((b) => ({ slug: b.brand_slug, name: b.brand_name }));
  }, [data]);

  const allCountries = useMemo(() => {
    if (!data) return [];
    return data.country_summary.map((c) => c.country_code);
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading international intel...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              Cross-cutting &middot; International Expansion
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Where competitors operate
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-gr-muted leading-relaxed">
            International intel is unavailable. The detector needs at least one signal captured in
            <code className="mx-1 bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.international_signals</code>
            before the page lights up.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Cross-cutting &middot; International Expansion
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Where competitors operate
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Country-level presence per brand inferred from TLDs, hreflang tags, locale paths,
          currency switchers, and geo-targeted landing pages. New signals flag expansion moves.
        </p>
      </header>

      <SectionExplainer
        what="Each brand's international footprint inferred from six probe types: a non-US top-level domain (gymshark.uk), a country in the shipping selector, a hreflang declaration in the homepage head, a locale URL prefix that returns 200, a non-USD currency in the picker, and a geo-prefixed landing page that resolves."
        howToRead="The KPI strip on top shows the cross-brand totals. The brand grid below sorts widest-reach to narrowest with active country chips. The country pivot shows who operates where. The recent-expansions table is the last 30 days of fresh signals - those are the moves you want to react to."
        whatToDo="Treat first_seen timestamps as the canonical 'they opened that country' date. Click evidence URLs before citing in a brief - the page lighting up with a 200 is the audit trail. Pair recent expansions with sitemap velocity to spot category-specific entries."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Countries detected</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{data.totals.all_countries}</div>
          <div className="text-xs text-gr-muted mt-1">across the tracked set</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Widest reach</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">
            {data.totals.widest_brand_country_count}
          </div>
          <div className="text-xs text-gr-muted mt-1">
            {data.totals.widest_brand ? (data.brand_names[data.totals.widest_brand] || data.totals.widest_brand) : '-'} countries
          </div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">New signals 30d</div>
          <div className="text-3xl font-bold text-gr-success tabular-nums">{data.totals.new_in_30d}</div>
          <div className="text-xs text-gr-muted mt-1">first-detected this month</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Most recent move</div>
          <div className="text-base font-bold text-gr-warning truncate">
            {data.totals.most_recent_brand ? (data.brand_names[data.totals.most_recent_brand] || data.totals.most_recent_brand) : '-'}
          </div>
          <div className="text-xs text-gr-muted mt-1 tabular-nums">{fmtDate(data.totals.most_recent_first_seen)}</div>
        </div>
      </section>

      {/* Filter chips */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Brand</span>
          <button
            type="button"
            onClick={() => setBrandFilter('')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
              brandFilter === ''
                ? 'bg-gr-accent text-gr-bg border-gr-accent'
                : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
            }`}
          >
            All
          </button>
          {allBrands.map((b) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => {
                setBrandFilter(b.slug);
                trackEvent('click', { label: 'international_filter_brand', metadata: { brand: b.slug } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
                brandFilter === b.slug
                  ? 'bg-gr-accent text-gr-bg border-gr-accent'
                  : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Country</span>
          <button
            type="button"
            onClick={() => setCountryFilter('')}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
              countryFilter === ''
                ? 'bg-gr-accent text-gr-bg border-gr-accent'
                : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
            }`}
          >
            All
          </button>
          {allCountries.slice(0, 24).map((cc) => (
            <button
              key={cc}
              type="button"
              onClick={() => {
                setCountryFilter(cc);
                trackEvent('click', { label: 'international_filter_country', metadata: { country: cc } });
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition ${
                countryFilter === cc
                  ? 'bg-gr-accent text-gr-bg border-gr-accent'
                  : 'bg-gr-bg text-gr-muted border-gr-border hover:text-gr-text'
              }`}
            >
              {cc}
            </button>
          ))}
        </div>
      </section>

      {/* Per-brand grid */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gr-text tracking-tight">
          Per-brand reach <span className="text-gr-subtle font-medium">({filteredBrands.length})</span>
        </h2>
        {filteredBrands.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-8">
            <p className="text-gr-muted">No brands match the current filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredBrands.map((b) => (
              <article key={b.brand_slug} className="bg-gr-surface rounded-md border border-gr-border p-5">
                <header className="flex items-baseline justify-between gap-3 mb-3">
                  <h3 className="text-base font-bold text-gr-text tracking-tight">{b.brand_name}</h3>
                  <span className="text-[11px] tabular-nums text-gr-subtle uppercase tracking-wider">
                    {b.total_countries} {b.total_countries === 1 ? 'country' : 'countries'}
                  </span>
                </header>
                {b.countries.length === 0 ? (
                  <p className="text-xs text-gr-subtle">No country signals detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {b.countries.map((cc) => (
                      <span
                        key={cc}
                        title={countryLabel(cc)}
                        className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-gr-bg text-gr-text border border-gr-border"
                      >
                        {cc}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 text-[11px]">
                  <span className="text-gr-muted">
                    <span className="text-gr-subtle uppercase tracking-wider">signals</span>{' '}
                    <span className="tabular-nums text-gr-text font-bold">{b.active_signals}</span>
                  </span>
                  <span className="text-gr-muted">
                    <span className="text-gr-subtle uppercase tracking-wider">new 30d</span>{' '}
                    <span className={`tabular-nums font-bold ${b.new_in_30d > 0 ? 'text-gr-success' : 'text-gr-text'}`}>
                      {b.new_in_30d}
                    </span>
                  </span>
                  {b.inactive_signals > 0 && (
                    <span className="text-gr-muted">
                      <span className="text-gr-subtle uppercase tracking-wider">inactive</span>{' '}
                      <span className="tabular-nums text-gr-danger font-bold">{b.inactive_signals}</span>
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Country pivot */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gr-text tracking-tight">
          Country pivot <span className="text-gr-subtle font-medium">({filteredCountries.length})</span>
        </h2>
        {filteredCountries.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-8">
            <p className="text-gr-muted">No countries match the current filters.</p>
          </div>
        ) : (
          <div className="bg-gr-surface rounded-md border border-gr-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gr-bg/60">
                <tr className="text-left text-[11px] uppercase tracking-wider text-gr-subtle">
                  <th className="px-4 py-2 font-bold">Country</th>
                  <th className="px-4 py-2 font-bold tabular-nums">Brands</th>
                  <th className="px-4 py-2 font-bold">Operating there</th>
                </tr>
              </thead>
              <tbody>
                {filteredCountries.map((c) => (
                  <tr key={c.country_code} className="border-t border-gr-border">
                    <td className="px-4 py-3 align-top">
                      <div className="font-bold text-gr-text">{c.country_code}</div>
                      <div className="text-[11px] text-gr-subtle">{countryLabel(c.country_code)}</div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gr-text font-bold align-top">{c.brand_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {c.brands.map((b) => (
                          <span
                            key={b}
                            className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-gr-raised text-gr-text border border-gr-border"
                          >
                            {data.brand_names[b] || b}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent expansions table */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gr-text tracking-tight">
          Recent expansions, last 30 days <span className="text-gr-subtle font-medium">({filteredNew.length})</span>
        </h2>
        {filteredNew.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-8">
            <p className="text-gr-muted">No new signals in the last 30 days for the current filters.</p>
          </div>
        ) : (
          <div className="bg-gr-surface rounded-md border border-gr-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gr-bg/60">
                <tr className="text-left text-[11px] uppercase tracking-wider text-gr-subtle">
                  <th className="px-4 py-2 font-bold">First seen</th>
                  <th className="px-4 py-2 font-bold">Brand</th>
                  <th className="px-4 py-2 font-bold">Signal</th>
                  <th className="px-4 py-2 font-bold">Value</th>
                  <th className="px-4 py-2 font-bold">Country</th>
                  <th className="px-4 py-2 font-bold">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredNew.slice(0, 100).map((r, i) => {
                  const cls = SIGNAL_CLASSES[r.signal_type] || 'bg-gr-raised text-gr-muted';
                  const label = SIGNAL_LABELS[r.signal_type] || r.signal_type;
                  return (
                    <tr key={`${r.brand_slug}-${r.signal_type}-${r.signal_value}-${i}`} className="border-t border-gr-border">
                      <td className="px-4 py-3 tabular-nums text-gr-text whitespace-nowrap">{fmtDate(r.first_seen)}</td>
                      <td className="px-4 py-3 text-gr-text font-bold">{r.brand_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${cls}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gr-muted font-mono text-xs">{r.signal_value}</td>
                      <td className="px-4 py-3 text-gr-text">{r.country_code || '-'}</td>
                      <td className="px-4 py-3">
                        {r.evidence_url ? (
                          <a
                            href={r.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] uppercase tracking-wider font-bold text-gr-accent hover:underline"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-[11px] text-gr-subtle">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle leading-relaxed max-w-3xl">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.international_signals</code>.
        Signals captured by the international-detector agent (weekly, six probe types per brand). Click the evidence URL on any signal
        for the audit trail. Each signal type stored separately - one brand can carry multiple signals per country.
      </div>
    </div>
  );
}
