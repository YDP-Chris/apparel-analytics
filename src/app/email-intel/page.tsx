'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Cadence {
  brand_slug: string;
  emails_30d: number;
  promo_emails_30d: number;
  emails_per_week: number;
  last_email_at: string | null;
  first_email_at_in_window: string | null;
}

interface EmailRow {
  id: number;
  received_at: string;
  brand_slug: string;
  brand_name: string | null;
  subject: string | null;
  preheader: string | null;
  snippet: string | null;
  offer_summary: string | null;
  has_promo: boolean | null;
  discount_pct: number | null;
  promo_code: string | null;
  audience_signal: string | null;
  campaign_theme: string | null;
  cta_text: string | null;
  cta_url: string | null;
  parsed_at: string | null;
}

interface Payload {
  available: boolean;
  cadence_30d: Cadence[];
  recent: EmailRow[];
  brand_names: Record<string, string>;
  brand_filter: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hours = (Date.now() - d.getTime()) / (1000 * 60 * 60);
  if (hours < 1) return 'now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function EmailIntelPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('');
  const [promoOnly, setPromoOnly] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    setLoading(true);
    const qs = brandFilter ? `?brand=${encodeURIComponent(brandFilter)}` : '';
    fetch(`${PULSE_API}/pulse/emails${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [brandFilter]);

  const cadence = data?.cadence_30d ?? [];
  const recent = data?.recent ?? [];
  const brandNames = data?.brand_names ?? {};

  const filteredRecent = useMemo(() => {
    return promoOnly ? recent.filter((r) => r.has_promo) : recent;
  }, [recent, promoOnly]);

  const kpis = useMemo(() => {
    const brandsActive = cadence.length;
    const totalEmails30 = cadence.reduce((s, c) => s + c.emails_30d, 0);
    const totalPromos30 = cadence.reduce((s, c) => s + c.promo_emails_30d, 0);
    const topByVolume = [...cadence].sort((a, b) => b.emails_30d - a.emails_30d)[0];
    return { brandsActive, totalEmails30, totalPromos30, topByVolume };
  }, [cadence]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading email feed...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data?.available) {
    return (
      <div className="space-y-12">
        <header>
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
            For Marketing &middot; Email Intel
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Competitor email cadence + offers
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Setup not complete
          </p>
          <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">No emails captured yet</h2>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The email-intel agent is wired but waiting on Gmail OAuth + newsletter subscriptions.
            See <code className="bg-gr-bg px-1.5 py-0.5 rounded">/mnt/data/agents/email-intel/setup.md</code> for the
            one-time configuration. Once the agent runs its first cycle, captured emails appear here grouped by brand
            with cadence sparklines and Claude-extracted offer summaries.
          </p>
        </section>
      </div>
    );
  }

  if (cadence.length === 0 && recent.length === 0) {
    return (
      <div className="space-y-12">
        <header>
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
            For Marketing &middot; Email Intel
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            Competitor email cadence + offers
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            Building up the feed
          </p>
          <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">No emails captured yet</h2>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The email-intel agent runs every 6 hours. New emails will appear here once subscribed competitor
            newsletters land in the dedicated inbox. First emails usually arrive within 24-48 hours after subscribing.
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
            For Marketing &middot; Email Intel
          </p>
          <ConfidenceBadge source="email_intel" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Competitor email cadence + offers
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Captured competitor marketing emails from a dedicated inbox. Each email is parsed by Claude to extract the
          offer, promo code, audience cue, and campaign theme. Use the cadence chart to spot timing patterns
          (Friday drops, monthly clearance) and the recent feed to study competitor copy + offer structure.
        </p>
      </header>

      <SectionExplainer
        what="One card per brand we are subscribed to. Cadence is emails per week over the last 30 days. The recent-emails table below shows every captured email with Claude's extracted offer summary."
        howToRead='"Promo" emails are ones Claude flagged as having an offer (discount, free shipping, BOGO). "Organic" are everything else (new launch, content, brand story). High emails/week with low promo share = strong brand-building cadence. High promo share = aggressive offer-led brand.'
        whatToDo="Spot timing patterns (Friday drops, end-of-month clearance) to plan Gymreapers email calendar against. Study high-engagement campaign_themes for hooks worth borrowing. Cross-reference with /promo-calendar to see if email offers match on-site discount activity."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Brands subscribed</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.brandsActive}</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Emails captured (30d)</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.totalEmails30}</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Promo emails (30d)</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">{kpis.totalPromos30}</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Top sender</div>
          {kpis.topByVolume ? (
            <>
              <div className="text-base font-bold text-gr-text truncate">{brandNames[kpis.topByVolume.brand_slug] || kpis.topByVolume.brand_slug}</div>
              <div className="text-sm text-gr-muted tabular-nums mt-0.5">{kpis.topByVolume.emails_per_week}/wk</div>
            </>
          ) : <div className="text-gr-subtle text-sm">-</div>}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gr-text tracking-tight">Cadence by brand</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...cadence].sort((a, b) => b.emails_30d - a.emails_30d).map((c) => {
            const isGR = c.brand_slug === 'gymreapers';
            const promoShare = c.emails_30d > 0 ? (c.promo_emails_30d / c.emails_30d) * 100 : 0;
            return (
              <button
                key={c.brand_slug}
                type="button"
                onClick={() => {
                  setBrandFilter(brandFilter === c.brand_slug ? '' : c.brand_slug);
                  trackEvent('click', { label: 'email_brand_card', metadata: { brand_slug: c.brand_slug } });
                }}
                className={`text-left bg-gr-surface border rounded-md p-4 hover:border-gr-accent transition ${
                  brandFilter === c.brand_slug ? 'border-gr-accent ring-2 ring-gr-accent/30' : 'border-gr-border'
                } ${isGR ? 'ring-2 ring-gr-accent' : ''}`}
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold text-gr-text">{brandNames[c.brand_slug] || c.brand_slug}</h3>
                  <span className="text-xs text-gr-subtle tabular-nums">{fmtRelative(c.last_email_at)}</span>
                </div>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-2xl font-bold text-gr-text tabular-nums">{c.emails_per_week}</span>
                  <span className="text-xs text-gr-muted">emails/wk</span>
                </div>
                <div className="text-xs text-gr-muted">
                  {c.emails_30d} captured &middot; {c.promo_emails_30d} promos ({promoShare.toFixed(0)}%)
                </div>
                <div className="mt-2 h-1.5 rounded bg-gr-bg overflow-hidden">
                  <div className="h-full bg-gr-accent" style={{ width: `${Math.min(promoShare, 100)}%` }} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Recent emails {brandFilter && <span className="text-gr-muted text-base font-normal">&middot; filtered to {brandNames[brandFilter] || brandFilter}</span>}
          </h2>
          <div className="flex items-center gap-3">
            {brandFilter && (
              <button
                type="button"
                onClick={() => setBrandFilter('')}
                className="text-xs text-gr-muted hover:text-gr-text underline"
              >
                clear brand filter
              </button>
            )}
            <label className="inline-flex items-center gap-2 text-xs text-gr-muted">
              <input
                type="checkbox"
                checked={promoOnly}
                onChange={(e) => {
                  setPromoOnly(e.target.checked);
                  trackEvent('change', { label: 'email_promo_only', metadata: { on: e.target.checked } });
                }}
                className="rounded border-gr-border"
              />
              Promos only
            </label>
          </div>
        </div>

        {filteredRecent.length === 0 ? (
          <div className="bg-gr-surface border border-gr-border rounded p-6 text-center text-gr-subtle text-sm">
            No emails match the current filter.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecent.map((e) => (
              <div key={e.id} className="bg-gr-surface border border-gr-border rounded p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-gr-accent uppercase tracking-wider">{brandNames[e.brand_slug] || e.brand_slug}</span>
                    {e.has_promo && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-accent/15 text-gr-accent">PROMO{e.discount_pct ? ` -${e.discount_pct}%` : ''}</span>
                    )}
                    {e.campaign_theme && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gr-raised text-gr-muted">{e.campaign_theme}</span>
                    )}
                  </div>
                  <span className="text-xs text-gr-subtle tabular-nums">{fmtDate(e.received_at)}</span>
                </div>
                <div className="text-sm font-semibold text-gr-text mb-1">{e.subject || '(no subject)'}</div>
                {e.preheader && <div className="text-xs text-gr-muted italic mb-2">{e.preheader}</div>}
                {e.offer_summary && (
                  <div className="text-xs text-gr-text/80 mt-2 leading-relaxed">{e.offer_summary}</div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gr-subtle">
                  {e.promo_code && <span>code: <code className="bg-gr-bg px-1 rounded text-gr-text">{e.promo_code}</code></span>}
                  {e.audience_signal && <span>aud: {e.audience_signal}</span>}
                  {e.cta_url && (
                    <a
                      href={e.cta_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('outbound', { label: 'email_cta', metadata: { brand_slug: e.brand_slug } })}
                      className="text-gr-accent hover:underline"
                    >
                      {e.cta_text || 'open'} &rarr;
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.brand_emails</code> &middot;
        Captured every 6 hours via the email-intel agent. NLP via Claude Sonnet 4.6 with $0.10 per-run cap.
      </div>
    </div>
  );
}
