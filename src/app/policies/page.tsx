'use client';

/**
 * /policies — Brand policies at a glance.
 *
 * Consolidates manually-curated brand facts: free shipping thresholds, returns
 * windows + restocking fees, subscription/membership offerings, country of
 * manufacture, sustainability certifications. Data is hardcoded here as a
 * starting point. Future iteration can move to Supabase + the team-inputs
 * pipeline.
 *
 * Combines two backlog asks:
 *  - shipping + returns + subscriptions reference (task #70)
 *  - made-in-USA / sustainability claims (task #72)
 */

import { useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface BrandPolicy {
  slug: string;
  name: string;
  free_shipping_threshold_usd: number | null; // null = no flat threshold (varies, paid, or always free)
  free_shipping_always: boolean;              // true = free regardless of cart value
  returns_window_days: number | null;
  restocking_fee: string | null;              // text like "10% on opened items"
  exchanges_free: boolean;
  subscription_offering: string | null;       // text like "Alo Move app $20/mo" or null
  made_in: string;
  sustainability_claims: string[];
  sources_note: string;
}

const POLICIES: BrandPolicy[] = [
  {
    slug: 'gymreapers',
    name: 'Gymreapers',
    free_shipping_threshold_usd: 75,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'imported (China)',
    sustainability_claims: ['ImpactID product transparency program'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'sbd',
    name: 'SBD',
    free_shipping_threshold_usd: 99,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'United Kingdom',
    sustainability_claims: ['IPF official equipment supplier'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'rogue_fitness',
    name: 'Rogue Fitness',
    free_shipping_threshold_usd: null,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: 'Custom items non-returnable',
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'made in USA (selected products)',
    sustainability_claims: ['Made-in-Ohio tagline', 'American manufacturing focus'],
    sources_note: 'shipping varies by item weight; as of 2026-05-16',
  },
  {
    slug: 'gymshark',
    name: 'Gymshark',
    free_shipping_threshold_usd: 75,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'imported',
    sustainability_claims: ['B Corp claim', 'Sustainable materials initiative'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'harbinger',
    name: 'Harbinger',
    free_shipping_threshold_usd: null,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'imported',
    sustainability_claims: [],
    sources_note: 'shipping varies by item; as of 2026-05-16',
  },
  {
    slug: 'schiek',
    name: 'Schiek',
    free_shipping_threshold_usd: null,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'made in USA',
    sustainability_claims: ['American manufacturing heritage'],
    sources_note: 'shipping varies; as of 2026-05-16',
  },
  {
    slug: 'bear_grips',
    name: 'Bear Grips',
    free_shipping_threshold_usd: 50,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'imported',
    sustainability_claims: [],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'inzer',
    name: 'Inzer',
    free_shipping_threshold_usd: null,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'made in USA',
    sustainability_claims: ['American manufacturing heritage', 'IPF-spec gear'],
    sources_note: 'paid shipping standard; as of 2026-05-16',
  },
  {
    slug: 'slingshot',
    name: 'Mark Bell Slingshot',
    free_shipping_threshold_usd: 99,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'made in USA + imported mix',
    sustainability_claims: ['Selected US-made hip circles and slingshot products'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'twopood',
    name: '2POOD',
    free_shipping_threshold_usd: 75,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'imported',
    sustainability_claims: ['USAW official partner'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'vuori',
    name: 'Vuori',
    free_shipping_threshold_usd: 75,
    free_shipping_always: false,
    returns_window_days: 60,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: null,
    made_in: 'imported',
    sustainability_claims: ['1% for the Planet member', 'Recycled materials in select lines'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'alo',
    name: 'Alo',
    free_shipping_threshold_usd: 75,
    free_shipping_always: false,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: 'Alo Move app $20/mo',
    made_in: 'imported',
    sustainability_claims: ['Give-back program claims'],
    sources_note: 'as of 2026-05-16',
  },
  {
    slug: 'lululemon',
    name: 'Lululemon',
    free_shipping_threshold_usd: null,
    free_shipping_always: true,
    returns_window_days: 30,
    restocking_fee: null,
    exchanges_free: true,
    subscription_offering: 'Lululemon Membership $128/yr (Studio access)',
    made_in: 'imported',
    sustainability_claims: ['Better Cotton Initiative member', 'Like New resale program'],
    sources_note: 'as of 2026-05-16',
  },
];

// Gymreapers first, rest in source order.
const ORDERED: BrandPolicy[] = [
  ...POLICIES.filter((p) => p.slug === 'gymreapers'),
  ...POLICIES.filter((p) => p.slug !== 'gymreapers'),
];

function isMadeInUSA(madeIn: string): boolean {
  const v = madeIn.toLowerCase();
  return v.includes('made in usa') || v.includes('united states');
}

function shippingLabel(p: BrandPolicy): string {
  if (p.free_shipping_always) return 'Free, no minimum';
  if (p.free_shipping_threshold_usd != null) return `Free over $${p.free_shipping_threshold_usd}`;
  return 'Varies / paid';
}

interface FlagButtonProps {
  slug: string;
  name: string;
}

function FlagButton({ slug, name }: FlagButtonProps) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function submit() {
    if (state !== 'idle') return;
    setState('sending');
    setErrMsg(null);
    trackEvent('click', { label: 'flag_policy_outdated', metadata: { brand_slug: slug } });
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setState('error');
      setErrMsg('Sign in first.');
      return;
    }
    try {
      const r = await fetch(`${PULSE_API}/pulse/annotations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_kind: 'brand_policy',
          entity_key: slug,
          note: `Flagged as outdated from /policies for ${name}.`,
          note_kind: 'context',
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setState('done');
      // auto-reset after 4 seconds so user can flag again if they want
      setTimeout(() => setState('idle'), 4000);
    } catch (err) {
      setState('error');
      setErrMsg(err instanceof Error ? err.message : 'Failed');
      setTimeout(() => { setState('idle'); setErrMsg(null); }, 4000);
    }
  }

  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gr-success">
        Flagged. Thanks.
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gr-danger">
        {errMsg || 'Failed'}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={submit}
      disabled={state === 'sending'}
      className="text-[11px] font-semibold uppercase tracking-wider text-gr-subtle hover:text-gr-accent transition disabled:opacity-50"
    >
      {state === 'sending' ? 'Sending...' : 'Flag as outdated'}
    </button>
  );
}

interface PolicyCardProps {
  p: BrandPolicy;
}

function PolicyCard({ p }: PolicyCardProps) {
  const isFocus = p.slug === 'gymreapers';
  const madeInUSA = isMadeInUSA(p.made_in);

  return (
    <section
      className={`bg-gr-surface rounded-md border border-gr-border p-6 ${
        isFocus ? 'ring-2 ring-gr-accent' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-gr-text tracking-tight">
          {p.name}
          {isFocus && (
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-accent-soft/50 text-gr-accent align-middle">
              You
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {p.subscription_offering && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-accent-soft/40 text-gr-accent">
              Subscription
            </span>
          )}
          {madeInUSA && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-success/10 text-gr-success">
              Made in USA
            </span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle pt-0.5">
          Free shipping
        </dt>
        <dd className="text-gr-text">{shippingLabel(p)}</dd>

        <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle pt-0.5">
          Returns
        </dt>
        <dd className="text-gr-text">
          {p.returns_window_days ? `${p.returns_window_days}-day window` : 'Not confirmed'}
          {p.restocking_fee && (
            <span className="text-gr-muted"> · {p.restocking_fee}</span>
          )}
          {p.exchanges_free && (
            <span className="text-gr-muted"> · Exchanges free</span>
          )}
        </dd>

        <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle pt-0.5">
          Subscription
        </dt>
        <dd className="text-gr-text">
          {p.subscription_offering ? p.subscription_offering : (
            <span className="text-gr-subtle">None</span>
          )}
        </dd>

        <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle pt-0.5">
          Made in
        </dt>
        <dd className="text-gr-text">{p.made_in}</dd>

        <dt className="text-xs uppercase tracking-wider font-semibold text-gr-subtle pt-0.5">
          Sustainability
        </dt>
        <dd>
          {p.sustainability_claims.length === 0 ? (
            <span className="text-gr-subtle text-sm">No public claims confirmed</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {p.sustainability_claims.map((c, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[11px] font-medium bg-gr-bg text-gr-muted border border-gr-border/60"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </dd>
      </dl>

      <div className="mt-4 pt-3 border-t border-gr-border/60 flex items-center justify-between gap-3">
        <span className="text-[11px] text-gr-subtle">{p.sources_note}</span>
        <FlagButton slug={p.slug} name={p.name} />
      </div>
    </section>
  );
}

// Bar chart of free shipping thresholds across brands.
function ShippingChart({ data }: { data: BrandPolicy[] }) {
  // Max threshold across the set (excluding always-free + unknown) for scaling.
  const numericMax = data.reduce((acc, p) => {
    if (p.free_shipping_threshold_usd != null) {
      return Math.max(acc, p.free_shipping_threshold_usd);
    }
    return acc;
  }, 100);
  // Always-free brands get a distinct visual; we render their bar at the same
  // width as the max threshold but in a separate color and label "Free".
  const rowH = 30;
  const labelW = 170;
  const rightPad = 60;
  const innerW = 600;
  const totalW = labelW + innerW + rightPad;
  const totalH = data.length * rowH + 30;

  const sorted = [...data].sort((a, b) => {
    // Always-free first, then ascending by threshold, then unknown/varies last
    const aVal = a.free_shipping_always ? -1 : a.free_shipping_threshold_usd ?? 9999;
    const bVal = b.free_shipping_always ? -1 : b.free_shipping_threshold_usd ?? 9999;
    return aVal - bVal;
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${totalH}`}
        className="w-full h-auto"
        role="img"
        aria-label="Free shipping threshold by brand"
      >
        {/* Reference grid lines at $25 intervals */}
        {Array.from({ length: Math.ceil(numericMax / 25) + 1 }, (_, i) => i * 25).map((v) => {
          const x = labelW + (v / numericMax) * innerW;
          return (
            <g key={v}>
              <line x1={x} x2={x} y1={20} y2={totalH - 10} stroke="#2a2a2a" strokeWidth="1" />
              <text x={x} y={14} fontSize="10" fill="#6b6b6b" textAnchor="middle">
                ${v}
              </text>
            </g>
          );
        })}

        {sorted.map((p, i) => {
          const y = 25 + i * rowH;
          const isFocus = p.slug === 'gymreapers';
          let barW = 0;
          let barColor = '#dc2626';
          let endLabel = '';
          if (p.free_shipping_always) {
            barW = innerW; // full width for visual emphasis
            barColor = '#22c55e';
            endLabel = 'Free, no minimum';
          } else if (p.free_shipping_threshold_usd != null) {
            barW = (p.free_shipping_threshold_usd / numericMax) * innerW;
            barColor = isFocus ? '#dc2626' : '#7f1d1d';
            endLabel = `$${p.free_shipping_threshold_usd}`;
          } else {
            barW = 6; // tiny stub for "varies / paid"
            barColor = '#3a3a3a';
            endLabel = 'Varies / paid';
          }
          return (
            <g key={p.slug}>
              <text
                x={labelW - 10}
                y={y + 13}
                fontSize="12"
                fill={isFocus ? '#f5f5f5' : '#a3a3a3'}
                fontWeight={isFocus ? 700 : 500}
                textAnchor="end"
              >
                {p.name}
              </text>
              <rect
                x={labelW}
                y={y}
                width={barW}
                height={18}
                fill={barColor}
                rx="2"
                stroke={isFocus ? '#f5f5f5' : 'none'}
                strokeWidth={isFocus ? 1.5 : 0}
              />
              <text
                x={labelW + barW + 6}
                y={y + 13}
                fontSize="11"
                fill="#a3a3a3"
              >
                {endLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product + Marketing · Policies
          </p>
          <ConfidenceBadge source="policies" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Brand policies at a glance
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Free shipping thresholds, returns policy, subscription offerings, sourcing claims.
          Marketing uses this when positioning Gymreapers&apos; offer against peers; product uses
          it when scoping pricing or sourcing decisions. Data is manually curated; flag anything
          stale via the team-inputs feedback button on each card.
        </p>
      </header>

      <SectionExplainer
        what="One card per brand. Each card shows free shipping threshold, returns window + restocking fees, any subscription/membership offering, country of manufacture or sourcing claim, sustainability certifications."
        howToRead="Empty fields mean we could not confirm publicly. Numbers in USD."
        whatToDo="If Gymreapers' free shipping threshold is meaningfully higher than peers, marketing flags it. If a competitor's returns are stricter, that's potential leverage in copy."
      />

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ORDERED.map((p) => (
            <PolicyCard key={p.slug} p={p} />
          ))}
        </div>
      </section>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">
            Free shipping thresholds, side by side
          </h2>
        </div>
        <p className="text-sm text-gr-muted leading-relaxed mb-5">
          Lower threshold means a friendlier offer to small-basket buyers. Gymreapers is ringed.
          Lululemon ships free regardless of cart value, which is the most aggressive offer in
          the set.
        </p>
        <ShippingChart data={POLICIES} />
      </section>

      <div className="text-xs text-gr-subtle leading-relaxed">
        Manually curated. Spot-check quarterly. To submit corrections, click &quot;Flag as
        outdated&quot; on any card or use{' '}
        <a href="/inputs" className="text-gr-accent hover:underline">/inputs</a>.
      </div>
    </div>
  );
}
