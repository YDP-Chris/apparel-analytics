'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Signal {
  brand_slug: string | null;
  signal_type: string | null;
  signal_value: string | null;
  signal_source: string | null;
  url: string | null;
  first_seen: string | null;
  last_seen: string | null;
  promoted_to_launch: boolean;
  promoted_at: string | null;
  days_since_first_seen: number | null;
  notes: string | null;
}

interface ApiResponse {
  available: boolean;
  brand_filter: string | null;
  days: number;
  snapshot_date: string | null;
  signals: Signal[];
  brand_names: Record<string, string>;
  summary: {
    total_active: number;
    new_7d: number;
    promoted_7d: number;
  };
  error?: string;
}

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  site_autocomplete: 'site autocomplete',
  amazon_storefront_autocomplete: 'amazon autocomplete',
  image_cdn_orphan: 'image CDN orphan',
  sitemap_insert_unindexed: 'sitemap insert',
  email_teaser: 'email teaser',
};

const SIGNAL_TYPE_CLASSES: Record<string, string> = {
  site_autocomplete: 'bg-gr-accent/15 text-gr-accent',
  amazon_storefront_autocomplete: 'bg-gr-warning/15 text-gr-warning',
  image_cdn_orphan: 'bg-gr-success/15 text-gr-success',
  sitemap_insert_unindexed: 'bg-gr-accent-soft/40 text-gr-text',
  email_teaser: 'bg-gr-raised text-gr-muted',
};

function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours <= 0) return 'just now';
    return `${hours}h ago`;
  }
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function typeLabel(t: string | null | undefined): string {
  if (!t) return 'signal';
  return SIGNAL_TYPE_LABEL[t] || t.replace(/_/g, ' ');
}

function typeClasses(t: string | null | undefined): string {
  if (!t) return 'bg-gr-raised text-gr-muted';
  return SIGNAL_TYPE_CLASSES[t] || 'bg-gr-raised text-gr-muted';
}

export default function PrelaunchRadarPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeBrands, setActiveBrands] = useState<Set<string>>(new Set());
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/prelaunch-radar?days=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ApiResponse) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const brandOrder = useMemo(() => {
    if (!data) return [] as string[];
    const counts = new Map<string, number>();
    for (const s of data.signals || []) {
      const k = s.brand_slug || 'unknown';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [data]);

  const typeOrder = useMemo(() => {
    if (!data) return [] as string[];
    const counts = new Map<string, number>();
    for (const s of data.signals || []) {
      const k = s.signal_type || 'unknown';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [data]);

  const filteredSignals = useMemo(() => {
    if (!data) return [] as Signal[];
    return (data.signals || []).filter((s) => {
      if (activeBrands.size > 0) {
        const slug = s.brand_slug || 'unknown';
        if (!activeBrands.has(slug)) return false;
      }
      if (activeTypes.size > 0) {
        const t = s.signal_type || 'unknown';
        if (!activeTypes.has(t)) return false;
      }
      return true;
    });
  }, [data, activeBrands, activeTypes]);

  const brandLabel = (slug: string) => (data?.brand_names || {})[slug] || slug;

  const toggleBrand = (slug: string) => {
    const next = new Set(activeBrands);
    if (next.has(slug)) next.delete(slug); else next.add(slug);
    setActiveBrands(next);
    trackEvent('click', { label: 'prelaunch_brand_chip', metadata: { brand: slug } });
  };

  const toggleType = (t: string) => {
    const next = new Set(activeTypes);
    if (next.has(t)) next.delete(t); else next.add(t);
    setActiveTypes(next);
    trackEvent('click', { label: 'prelaunch_type_chip', metadata: { signal_type: t } });
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading pre-launch signals...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  if (!data.available) {
    return (
      <div className="space-y-12">
        <HubTabs hub="radar" />
      <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Marketing + Product &middot; Pre-launch Radar
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            What competitors are about to ship
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Pre-launch Radar is still warming up
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The prelaunch-radar agent needs at least one daily cycle before this page renders. Runs land 6 AM ET.
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <HubTabs hub="radar" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing + Product &middot; Pre-launch Radar
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What competitors are about to ship
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Autocomplete on a competitor&apos;s own site reveals their internal product index, which
          includes drafts, unpublished SKUs, and freshly-added products that have not propagated
          to public collection pages yet. Terms that show up in suggestions but are not yet
          matched to a known launch are leak signals.
        </p>
      </header>

      <SectionExplainer
        what="Pre-launch signals captured per competitor — currently search-autocomplete suggestions that exist in the brand's own index but have not yet been seen as a launch on our launch tracker."
        howToRead="Each row is one signal. Brand + signal value + when we first picked it up + when we most recently saw it. A signal that has been in the index 7+ days without launching is usually a draft that is about to ship. Once the launch detector ties it to a product page, the row shows promoted to launch."
        whatToDo="If you see a competitor stockpiling new entries in one category (e.g. SBD adding 4 belt SKUs over a week), they are about to drop a line. Brief merchandising + ad creative now, before they post."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Active signals</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{data.summary.total_active}</div>
          <div className="text-xs text-gr-muted mt-1">in the last {data.days}d window</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">New (last 7d)</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{data.summary.new_7d}</div>
          <div className="text-xs text-gr-muted mt-1">first picked up in the last week</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Promoted (last 7d)</div>
          <div className="text-3xl font-bold text-gr-success tabular-nums">{data.summary.promoted_7d}</div>
          <div className="text-xs text-gr-muted mt-1">materialized as launches</div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Signal type</span>
          <button
            type="button"
            onClick={() => {
              setActiveTypes(new Set());
              trackEvent('click', { label: 'prelaunch_type_chip', metadata: { signal_type: 'all' } });
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
              activeTypes.size === 0
                ? 'bg-gr-accent text-gr-text'
                : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
            }`}
          >
            All
          </button>
          {typeOrder.map((t) => {
            const isActive = activeTypes.has(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition ${
                  isActive
                    ? 'bg-gr-accent text-gr-text'
                    : 'bg-gr-bg text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border'
                }`}
              >
                {typeLabel(t)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Brand</span>
          <button
            type="button"
            onClick={() => {
              setActiveBrands(new Set());
              trackEvent('click', { label: 'prelaunch_brand_chip', metadata: { brand: 'all' } });
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

      {/* Signals table */}
      <section className="bg-gr-surface rounded-md border border-gr-border p-7">
        <div className="flex items-baseline justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Signals ({filteredSignals.length})
          </h2>
          <div className="text-xs text-gr-subtle">
            {data.snapshot_date ? `Last snapshot: ${fmtDate(data.snapshot_date)}` : ''}
          </div>
        </div>

        {filteredSignals.length === 0 ? (
          <p className="text-sm text-gr-muted py-6">
            No signals match the current filter. If the page is blank for everyone, the
            prelaunch-radar agent may still be on its first run.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gr-border text-left bg-gr-bg/40">
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Brand</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Type</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Signal</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">First seen</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Last seen</th>
                  <th className="py-3 px-3 font-bold text-[11px] uppercase tracking-[0.15em] text-gr-subtle">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSignals.map((s, i) => {
                  const slug = s.brand_slug || 'unknown';
                  const t = s.signal_type || 'unknown';
                  const value = s.signal_value || '';
                  const rowKey = `${slug}-${t}-${value}-${i}`;
                  const ageDays = s.days_since_first_seen ?? 0;
                  const aged = ageDays >= 7 && !s.promoted_to_launch;
                  return (
                    <tr
                      key={rowKey}
                      onClick={() => {
                        if (s.url) {
                          trackEvent('outbound', {
                            label: 'prelaunch_link',
                            metadata: { brand: slug, signal_type: t, signal_value: value },
                          });
                          window.open(s.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className={`border-b border-gr-border last:border-0 ${
                        s.url ? 'cursor-pointer hover:bg-gr-bg/30' : ''
                      } transition ${i % 2 === 1 ? 'bg-gr-bg/20' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-gr-text font-medium whitespace-nowrap">
                        {brandLabel(slug)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${typeClasses(t)}`}>
                          {typeLabel(t)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gr-text">
                        <span className="font-medium">{value}</span>
                        {s.url && (
                          <span className="ml-2 text-[10px] text-gr-subtle">[link]</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-gr-muted whitespace-nowrap tabular-nums">
                        {fmtRelative(s.first_seen)}
                      </td>
                      <td className="py-2.5 px-3 text-gr-muted whitespace-nowrap tabular-nums">
                        {fmtRelative(s.last_seen)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {s.promoted_to_launch ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-success/15 text-gr-success">
                            Promoted
                          </span>
                        ) : aged ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-warning/15 text-gr-warning">
                            Aged {ageDays}d
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-raised text-gr-muted">
                            Active
                          </span>
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

      <div className="text-xs text-gr-subtle">
        Built from <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.prelaunch_signals</code>.
        Sources: brand-owned search autocomplete endpoints (Shopify suggest in v1). Daily run lands 6 AM ET via
        prelaunch-radar. Once an autocomplete entry appears as a real launch in
        <code className="bg-gr-bg px-1.5 py-0.5 rounded mx-1">launches</code>, the row flips to Promoted.
      </div>
    </div>
  );
}
