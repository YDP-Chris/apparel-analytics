'use client';

import { useEffect, useState, FormEvent } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const TOKEN_EXPIRY_KEY = 'ydp_pulse_token_expires';

interface BrandBlock {
  name: string;
  slug: string;
  total: number;
  categories: Record<string, number>;
  subcategories: Record<string, number>;
  genders: Record<string, number>;
  colors: Record<string, number>;
  colorCoverage: number;
  avgColorsPerStyle: number;
  uniqueStyles: number;
  priceRange?: { min: number; max: number; avg: number };
}

interface NewsItem {
  title: string;
  url: string;
  date?: string;
  company?: string;
  company_id?: string;
}

interface TrendBrand {
  keyword?: string;
  current?: number;
  wow_change?: number;
  mom_change?: number;
}

interface GymreapersReport {
  generated_at: string;
  focus_brand: string;
  brand_order: string[];
  brand_names: Record<string, string>;
  brands: Record<string, BrandBlock>;
  totals: {
    products: number;
    brands: number;
    gymreapers_products: number;
    competitor_products: number;
    gymreapers_share_pct: number;
  };
  newProductsToday: Record<string, number>;
  byCategory: Record<string, Record<string, number>>;
  bySubcategory: Record<string, Record<string, number>>;
  byColor: Record<string, Record<string, number>>;
  news: NewsItem[];
  launches: unknown[];
  trends: Record<string, TrendBrand>;
  jobs: Record<string, unknown>;
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = sessionStorage.getItem(TOKEN_KEY);
  const expires = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expires) return null;
  if (Date.now() > parseInt(expires, 10)) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

function clearToken() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
}

export default function GymreapersScorecardPage() {
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<GymreapersReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth gate state
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    setToken(getStoredToken());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch(`${PULSE_API}/pulse/gymreapers`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (r.status === 401) {
          clearToken();
          setToken(null);
          throw new Error('Session expired. Please log in again.');
        }
        if (r.status === 404) {
          throw new Error('GYMREAPERS report not yet generated. The agent will produce it on its next cycle.');
        }
        if (!r.ok) throw new Error(`Failed to load (HTTP ${r.status})`);
        return r.json();
      })
      .then((json: GymreapersReport) => setData(json))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthenticating(true);
    try {
      const r = await fetch(`${PULSE_API}/pulse/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await r.json();
      if (!r.ok || !json.authenticated) {
        throw new Error(json.error || 'Invalid password');
      }
      const expiresAt = Date.now() + (json.expires_in || 86400) * 1000;
      sessionStorage.setItem(TOKEN_KEY, json.token);
      sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString());
      setToken(json.token);
      setPassword('');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setAuthenticating(false);
    }
  }

  function handleLogout() {
    clearToken();
    setToken(null);
    setData(null);
  }

  if (!authReady) {
    return <div className="text-center py-20 text-socal-stone-400">Loading...</div>;
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto py-20">
        <div className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <h1 className="text-2xl font-bold text-socal-stone-800 mb-2">Gymreapers Scorecard</h1>
          <p className="text-sm text-socal-stone-500 mb-6">
            This report is private. Sign in with your YDP Pulse password to view.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg border border-socal-sand-200 focus:outline-none focus:ring-2 focus:ring-socal-ocean-300"
              disabled={authenticating}
            />
            {authError && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {authError}
              </div>
            )}
            <button
              type="submit"
              disabled={authenticating || !password}
              className="w-full py-3 rounded-lg bg-socal-ocean-600 text-white font-semibold hover:bg-socal-ocean-700 disabled:opacity-50 transition"
            >
              {authenticating ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-socal-stone-400">Loading scorecard...</div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-socal-stone-800 mb-3">Could not load report</h1>
        <p className="text-socal-stone-500 mb-6">{error}</p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-lg bg-socal-stone-100 text-socal-stone-700 hover:bg-socal-stone-200 transition"
        >
          Sign out
        </button>
      </div>
    );
  }

  if (!data) return null;

  const focusBrand = data.brands[data.focus_brand];
  const competitors = data.brand_order.filter((s) => s !== data.focus_brand);
  const sortedCompetitors = competitors
    .map((slug) => data.brands[slug])
    .filter(Boolean)
    .sort((a, b) => b.total - a.total);

  const topCategories = Object.entries(data.byCategory)
    .map(([cat, brands]) => ({ cat, total: Object.values(brands).reduce((s, n) => s + n, 0), brands }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const trendsList = Object.entries(data.trends || {})
    .map(([slug, t]) => ({ slug, name: data.brand_names[slug] || slug, ...t }))
    .filter((t) => typeof t.current === 'number');

  return (
    <div className="space-y-12">
      {/* Hero */}
      <header className="text-center max-w-3xl mx-auto">
        <p className="text-socal-ocean-600 font-medium text-sm uppercase tracking-wide mb-2">
          Private — Strength &amp; Powerlifting Intelligence
        </p>
        <h1 className="text-4xl font-bold text-socal-stone-800 mb-4">
          Where Does Gymreapers Stand?
        </h1>
        <p className="text-lg text-socal-stone-500 leading-relaxed">
          Tracking{' '}
          <span className="font-semibold text-socal-stone-700">
            {focusBrand?.total.toLocaleString() || 0}
          </span>{' '}
          Gymreapers products against{' '}
          <span className="font-semibold text-socal-stone-700">
            {data.totals.competitor_products.toLocaleString()}
          </span>{' '}
          from {competitors.length} strength competitors. Gymreapers represents{' '}
          <span className="font-semibold text-socal-ocean-600">
            {data.totals.gymreapers_share_pct}%
          </span>{' '}
          of the strength apparel landscape we track.
        </p>
        <div className="mt-4">
          <button
            onClick={handleLogout}
            className="text-xs text-socal-stone-400 hover:text-socal-stone-600 underline"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Key metrics */}
      {focusBrand && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Products', value: focusBrand.total.toLocaleString(), context: 'in catalog' },
            { label: 'Styles', value: focusBrand.uniqueStyles.toLocaleString(), context: 'unique product lines' },
            { label: 'Color Coverage', value: `${focusBrand.colorCoverage}%`, context: 'products with color data' },
            { label: 'Colors/Style', value: focusBrand.avgColorsPerStyle.toFixed(1), context: 'avg variants' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl p-6 shadow-soft border border-socal-sand-100"
            >
              <p className="text-sm text-socal-stone-400 font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-socal-stone-800 mt-1">{stat.value}</p>
              <p className="text-xs text-socal-stone-400 mt-1">{stat.context}</p>
            </div>
          ))}
        </section>
      )}

      {/* Brand size comparison */}
      <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
        <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Catalog Size — Head to Head</h2>
        <div className="space-y-3">
          {[focusBrand, ...sortedCompetitors].filter(Boolean).map((brand) => {
            const max = Math.max(...data.brand_order.map((s) => data.brands[s]?.total || 0), 1);
            const isFocus = brand.slug === data.focus_brand;
            const width = (brand.total / max) * 100;
            return (
              <div
                key={brand.slug}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  isFocus
                    ? 'bg-gradient-to-r from-socal-ocean-50 to-socal-sand-50 border-2 border-socal-ocean-200'
                    : 'bg-socal-stone-50'
                }`}
              >
                <div className="w-36 flex-shrink-0">
                  <span
                    className={`font-semibold ${isFocus ? 'text-socal-ocean-700' : 'text-socal-stone-600'}`}
                  >
                    {isFocus && '→ '}
                    {brand.name}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-8 bg-socal-stone-100 rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${
                        isFocus
                          ? 'bg-gradient-to-r from-socal-ocean-400 to-socal-ocean-600'
                          : 'bg-socal-stone-300'
                      }`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right">
                  <span
                    className={`text-lg font-bold ${
                      isFocus ? 'text-socal-ocean-600' : 'text-socal-stone-600'
                    }`}
                  >
                    {brand.total.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {focusBrand?.total === 0 && (
          <p className="mt-4 text-sm text-socal-stone-400 italic">
            Gymreapers product data has not been collected yet — the next agent cycle will populate this.
          </p>
        )}
      </section>

      {/* Category mix */}
      {topCategories.length > 0 && (
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Category Mix Across Brands</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-socal-sand-200 text-socal-stone-500 text-left">
                  <th className="py-2 pr-4 font-medium">Category</th>
                  {data.brand_order.map((slug) => (
                    <th
                      key={slug}
                      className={`py-2 px-2 text-right font-medium ${
                        slug === data.focus_brand ? 'text-socal-ocean-700' : ''
                      }`}
                    >
                      {data.brand_names[slug]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topCategories.map(({ cat, brands }) => (
                  <tr key={cat} className="border-b border-socal-sand-100">
                    <td className="py-2 pr-4 text-socal-stone-700 font-medium capitalize">{cat}</td>
                    {data.brand_order.map((slug) => (
                      <td
                        key={slug}
                        className={`py-2 px-2 text-right ${
                          slug === data.focus_brand
                            ? 'font-bold text-socal-ocean-700'
                            : 'text-socal-stone-500'
                        }`}
                      >
                        {brands[slug] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Search trends */}
      {trendsList.length > 0 && (
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Search Interest (Google Trends)</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {trendsList.map((t) => {
              const wow = t.wow_change ?? 0;
              const isFocus = t.slug === data.focus_brand;
              return (
                <div
                  key={t.slug}
                  className={`p-4 rounded-xl border ${
                    isFocus
                      ? 'bg-gradient-to-br from-socal-ocean-50 to-socal-sand-50 border-socal-ocean-200'
                      : 'bg-socal-stone-50 border-socal-sand-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-semibold ${isFocus ? 'text-socal-ocean-700' : 'text-socal-stone-700'}`}>
                      {t.name}
                    </span>
                    <span className="text-2xl font-bold text-socal-stone-800">{t.current ?? '—'}</span>
                  </div>
                  <div className="mt-2 text-xs text-socal-stone-500">
                    WoW{' '}
                    <span className={wow >= 0 ? 'text-socal-sage-600' : 'text-rose-600'}>
                      {wow >= 0 ? '+' : ''}
                      {wow.toFixed(1)}%
                    </span>
                    {typeof t.mom_change === 'number' && (
                      <>
                        {'  ·  '}
                        MoM{' '}
                        <span className={t.mom_change >= 0 ? 'text-socal-sage-600' : 'text-rose-600'}>
                          {t.mom_change >= 0 ? '+' : ''}
                          {t.mom_change.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* News */}
      {data.news && data.news.length > 0 && (
        <section className="bg-white rounded-2xl p-8 shadow-soft border border-socal-sand-100">
          <h2 className="text-xl font-bold text-socal-stone-800 mb-6">Recent News</h2>
          <ul className="space-y-3">
            {data.news.slice(-15).reverse().map((item, i) => (
              <li key={i} className="border-b border-socal-sand-100 pb-3 last:border-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-socal-stone-700 hover:text-socal-ocean-700 font-medium"
                >
                  {item.title}
                </a>
                <div className="text-xs text-socal-stone-400 mt-1">
                  {item.company || item.company_id}
                  {item.date && ` · ${item.date}`}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="text-center text-xs text-socal-stone-400">
        Generated {new Date(data.generated_at).toLocaleString()}
      </footer>
    </div>
  );
}
