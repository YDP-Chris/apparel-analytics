'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const FOCUS_BRAND = 'gymreapers';

interface Capture {
  voice_signature: string;
  quoted_phrase: string;
  life_context: string[];
  product_handle?: string | null;
  rating?: number | null;
  posted_at?: string | null;
  source_id?: number | null;
}

interface Flow {
  from_brand: string;
  to_brand: string;
  count: number;
  captures: Capture[];
}

interface Summary {
  total_switchers: number;
  total_replacing_competitor_rows: number;
  unique_pairs: number;
  top_origin_brand: string | null;
  top_destination_brand: string | null;
  switchers_by_destination: Record<string, number>;
  switchers_by_origin: Record<string, number>;
}

interface Payload {
  available: boolean;
  flows: Flow[];
  summary: Summary;
  brand_names: Record<string, string>;
  error?: string;
}

function prettyBrand(slug: string, names: Record<string, string>): string {
  if (names[slug]) return names[slug];
  if (!slug) return 'unknown';
  return slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function shortDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

interface FlowDiagramProps {
  flows: Flow[];
  brandNames: Record<string, string>;
  selectedDest: string | null;
  onSelectDest: (slug: string | null) => void;
}

function FlowDiagram({ flows, brandNames, selectedDest, onSelectDest }: FlowDiagramProps) {
  if (flows.length === 0) return null;

  const origins = useMemo(() => {
    const set = new Set<string>();
    for (const f of flows) set.add(f.from_brand);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [flows]);

  const destinations = useMemo(() => {
    const set = new Set<string>();
    for (const f of flows) set.add(f.to_brand);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [flows]);

  const maxCount = useMemo(() => flows.reduce((m, f) => Math.max(m, f.count), 0), [flows]);

  const width = 720;
  const padX = 140;
  const rowHeight = 80;
  const height = Math.max(origins.length, destinations.length) * rowHeight + 60;
  const leftX = padX;
  const rightX = width - padX;

  const yFor = (list: string[], slug: string): number => {
    const idx = list.indexOf(slug);
    const span = height - 60;
    if (list.length === 1) return 30 + span / 2;
    return 30 + (span * idx) / (list.length - 1);
  };

  return (
    <div className="bg-gr-surface rounded-md border border-gr-border p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-lg font-bold text-gr-text tracking-tight">Switcher flow diagram</h2>
        <span className="text-xs text-gr-subtle tabular-nums">
          {origins.length} origin{origins.length === 1 ? '' : 's'} to {destinations.length} destination{destinations.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="Customer flow diagram between brands">
          <text x={leftX} y={14} fill="currentColor" className="fill-gr-subtle" fontSize="10" textAnchor="middle">
            FROM
          </text>
          <text x={rightX} y={14} fill="currentColor" className="fill-gr-subtle" fontSize="10" textAnchor="middle">
            TO
          </text>
          {flows.map((f) => {
            const y1 = yFor(origins, f.from_brand);
            const y2 = yFor(destinations, f.to_brand);
            const stroke = maxCount > 0 ? 1.5 + (f.count / maxCount) * 10 : 2;
            const isHighlighted = !selectedDest || selectedDest === f.to_brand;
            const opacity = isHighlighted ? 0.7 : 0.15;
            const cx = (leftX + rightX) / 2;
            return (
              <path
                key={`${f.from_brand}-${f.to_brand}`}
                d={`M ${leftX + 24} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${rightX - 24} ${y2}`}
                fill="none"
                stroke="currentColor"
                className="text-gr-accent"
                strokeWidth={stroke}
                strokeOpacity={opacity}
                strokeLinecap="round"
              />
            );
          })}
          {flows.map((f) => {
            const y1 = yFor(origins, f.from_brand);
            const y2 = yFor(destinations, f.to_brand);
            const cx = (leftX + rightX) / 2;
            const isHighlighted = !selectedDest || selectedDest === f.to_brand;
            if (!isHighlighted) return null;
            const midY = (y1 + y2) / 2;
            return (
              <text
                key={`label-${f.from_brand}-${f.to_brand}`}
                x={cx}
                y={midY - 4}
                textAnchor="middle"
                fill="currentColor"
                className="fill-gr-text"
                fontSize="11"
                fontWeight="700"
              >
                {f.count}
              </text>
            );
          })}
          {origins.map((slug) => {
            const y = yFor(origins, slug);
            return (
              <g key={`o-${slug}`}>
                <circle cx={leftX} cy={y} r="18" fill="currentColor" className="fill-gr-bg" stroke="currentColor" strokeWidth="2" />
                <text
                  x={leftX - 26}
                  y={y + 4}
                  textAnchor="end"
                  fill="currentColor"
                  className="fill-gr-text"
                  fontSize="12"
                  fontWeight="600"
                >
                  {prettyBrand(slug, brandNames)}
                </text>
              </g>
            );
          })}
          {destinations.map((slug) => {
            const y = yFor(destinations, slug);
            const isFocus = slug === FOCUS_BRAND;
            const isSelected = selectedDest === slug;
            const ringClass = isFocus ? 'text-gr-accent' : isSelected ? 'text-gr-accent-hover' : 'text-gr-border';
            return (
              <g
                key={`d-${slug}`}
                onClick={() => {
                  const next = isSelected ? null : slug;
                  onSelectDest(next);
                  trackEvent('filter', {
                    label: 'customer_flow_select_destination',
                    metadata: { destination: slug, cleared: next === null },
                  });
                }}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={rightX}
                  cy={y}
                  r="18"
                  fill="currentColor"
                  className="fill-gr-bg"
                  stroke="currentColor"
                  strokeWidth={isSelected ? 3 : 2}
                />
                <circle cx={rightX} cy={y} r="20" fill="none" stroke="currentColor" className={ringClass} strokeWidth="2" />
                <text
                  x={rightX + 26}
                  y={y + 4}
                  textAnchor="start"
                  fill="currentColor"
                  className="fill-gr-text"
                  fontSize="12"
                  fontWeight="600"
                >
                  {prettyBrand(slug, brandNames)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {selectedDest && (
        <div className="mt-3 flex items-center justify-between gap-3 bg-gr-bg border border-gr-accent/40 rounded px-3 py-2">
          <span className="text-xs text-gr-muted">
            Filtered to destination:{' '}
            <span className="font-bold text-gr-accent">{prettyBrand(selectedDest, brandNames)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onSelectDest(null);
              trackEvent('filter', {
                label: 'customer_flow_clear_destination',
                metadata: {},
              });
            }}
            className="text-[11px] uppercase tracking-wider font-bold text-gr-accent hover:text-gr-accent-hover"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

interface DestGroupProps {
  destSlug: string;
  destName: string;
  flows: Flow[];
  brandNames: Record<string, string>;
}

function DestGroup({ destSlug, destName, flows, brandNames }: DestGroupProps) {
  const total = flows.reduce((s, f) => s + f.count, 0);
  const allCaptures: Array<Capture & { fromBrand: string }> = [];
  for (const f of flows) {
    for (const c of f.captures) {
      allCaptures.push({ ...c, fromBrand: f.from_brand });
    }
  }
  allCaptures.sort((a, b) => {
    const ad = (a.posted_at || '').slice(0, 10);
    const bd = (b.posted_at || '').slice(0, 10);
    if (ad !== bd) return ad < bd ? 1 : -1;
    return (b.source_id || 0) - (a.source_id || 0);
  });

  const isFocus = destSlug === FOCUS_BRAND;
  const ring = isFocus ? 'ring-2 ring-gr-accent' : '';

  return (
    <section className={`bg-gr-surface rounded-md border border-gr-border p-6 ${ring}`}>
      <header className="flex items-baseline justify-between gap-3 mb-4 pb-3 border-b border-gr-border">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">
            TO {destName}
          </p>
          <h2 className="text-xl font-bold text-gr-text tracking-tight mt-1">
            {total} switcher{total === 1 ? '' : 's'} captured
          </h2>
        </div>
        {isFocus && (
          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gr-accent-soft text-gr-accent">
            FOCUS BRAND
          </span>
        )}
      </header>
      <div className="space-y-4">
        {allCaptures.map((c, idx) => {
          const lc = (c.life_context || []).filter((x) => x && x.trim());
          return (
            <article
              key={`${destSlug}-${c.source_id || idx}`}
              className="bg-gr-bg rounded border border-gr-border p-4"
            >
              <header className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border bg-gr-accent-hover/20 text-gr-accent-hover border-gr-accent-hover/40">
                  from {prettyBrand(c.fromBrand, brandNames)}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-gr-subtle tabular-nums">
                  {typeof c.rating === 'number' && (
                    <span>{Number(c.rating).toFixed(1)} stars</span>
                  )}
                  {c.posted_at && <span>{shortDate(c.posted_at)}</span>}
                </div>
              </header>
              {c.quoted_phrase && (
                <blockquote className="text-gr-accent italic text-sm leading-relaxed border-l-2 border-gr-accent pl-3 mb-2">
                  &ldquo;{c.quoted_phrase}&rdquo;
                </blockquote>
              )}
              {c.voice_signature && (
                <p className="text-gr-text text-sm leading-relaxed">{c.voice_signature}</p>
              )}
              {lc.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {lc.map((phrase) => (
                    <span
                      key={phrase}
                      className="px-2 py-0.5 rounded text-[11px] bg-gr-surface border border-gr-border text-gr-muted"
                    >
                      {phrase}
                    </span>
                  ))}
                </div>
              )}
              {c.product_handle && (
                <div className="mt-3">
                  <code
                    className="text-[10px] text-gr-subtle bg-gr-surface px-1.5 py-0.5 rounded border border-gr-border cursor-pointer hover:text-gr-text"
                    onClick={() => {
                      trackEvent('click', {
                        label: 'customer_flow_product_handle',
                        metadata: {
                          destination: destSlug,
                          from_brand: c.fromBrand,
                          product_handle: c.product_handle,
                        },
                      });
                    }}
                  >
                    {c.product_handle}
                  </code>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function CustomerFlowPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError('Sign in first.');
      setLoading(false);
      return;
    }
    fetch(`${PULSE_API}/pulse/customer-flow`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const brandNames = data?.brand_names || {};
  const flows = useMemo(() => data?.flows || [], [data]);

  const filteredFlows = useMemo(() => {
    if (!selectedDest) return flows;
    return flows.filter((f) => f.to_brand === selectedDest);
  }, [flows, selectedDest]);

  const flowsByDestination = useMemo(() => {
    const m: Record<string, Flow[]> = {};
    for (const f of filteredFlows) {
      (m[f.to_brand] ??= []).push(f);
    }
    return m;
  }, [filteredFlows]);

  const orderedDests = useMemo(() => {
    const slugs = Object.keys(flowsByDestination);
    return slugs.sort((a, b) => {
      if (a === FOCUS_BRAND) return -1;
      if (b === FOCUS_BRAND) return 1;
      const ca = flowsByDestination[a].reduce((s, f) => s + f.count, 0);
      const cb = flowsByDestination[b].reduce((s, f) => s + f.count, 0);
      return cb - ca;
    });
  }, [flowsByDestination]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading customer flow...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;

  const summary = data?.summary;
  const switchersCount = summary?.total_switchers ?? 0;
  const replacingRows = summary?.total_replacing_competitor_rows ?? 0;
  const uniquePairs = summary?.unique_pairs ?? 0;
  const topOrigin = summary?.top_origin_brand
    ? prettyBrand(summary.top_origin_brand, brandNames)
    : 'none';
  const topDest = summary?.top_destination_brand
    ? prettyBrand(summary.top_destination_brand, brandNames)
    : 'none';

  return (
    <div className="space-y-12">
      <HubTabs hub="voc" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing · Customer Flow
          </p>
          <ConfidenceBadge source="dtc_voc_personas" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Where customers say they&apos;re coming from
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Brand switchers captured in their own words. Each row is a customer who
          explicitly said they replaced one brand with another. Reveals churn directions
          and stated reasons. Use to identify which competitors customers are leaving
          and what we could offer them.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gr-subtle">
            Switchers captured
          </p>
          <p className="text-3xl font-bold text-gr-text tabular-nums mt-1">
            {switchersCount}
          </p>
          <p className="text-[11px] text-gr-muted mt-1">
            with named competitor (of {replacingRows} replacing-competitor rows)
          </p>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gr-subtle">
            Top origin brand
          </p>
          <p className="text-2xl font-bold text-gr-accent-hover tracking-tight mt-1">
            {topOrigin}
          </p>
          <p className="text-[11px] text-gr-muted mt-1">most-cited brand left behind</p>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gr-subtle">
            Top destination
          </p>
          <p className="text-2xl font-bold text-gr-accent tracking-tight mt-1">
            {topDest}
          </p>
          <p className="text-[11px] text-gr-muted mt-1">brand winning the switchers</p>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gr-subtle">
            Unique brand pairs
          </p>
          <p className="text-3xl font-bold text-gr-text tabular-nums mt-1">
            {uniquePairs}
          </p>
          <p className="text-[11px] text-gr-muted mt-1">distinct from-to flows detected</p>
        </div>
      </section>

      <SectionExplainer
        what="Each line on the diagram is a stated brand swap, taken verbatim from reviews tagged replacing_competitor. The line thickness scales with the number of captured switchers on that pair. Below, switcher cards group every quote by the destination brand and label the origin brand they named."
        howToRead="Click a destination circle in the diagram to filter to just that brand's incoming switchers. Read the italic quote first - it is verbatim. The voice signature beneath summarizes the reviewer's stated context. The from-brand pill on each card is the competitor the reviewer named in their own words."
        whatToDo="Where Gymreapers is the destination, mirror the stated reasons in acquisition copy. Where Gymreapers is the origin (we are losing customers to someone), treat that as a retention signal. For non-Gymreapers flows, study the verbatim phrasing for ad copy and creator briefs targeting that same migration."
      />

      {flows.length === 0 ? (
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No switchers detected yet
          </p>
          <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">
            Waiting on more replacing_competitor reviews
          </h2>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            Either no review_personas rows are tagged replacing_competitor, or none of
            those rows name a recognized peer brand by name in their review text. The
            classifier needs to capture more switching language before flows appear.
          </p>
        </section>
      ) : (
        <>
          <FlowDiagram
            flows={flows}
            brandNames={brandNames}
            selectedDest={selectedDest}
            onSelectDest={setSelectedDest}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {orderedDests.map((destSlug) => (
              <DestGroup
                key={destSlug}
                destSlug={destSlug}
                destName={prettyBrand(destSlug, brandNames)}
                flows={flowsByDestination[destSlug]}
                brandNames={brandNames}
              />
            ))}
          </div>
        </>
      )}

      <section className="border-t border-gr-border pt-6">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">
          What this is NOT
        </p>
        <p className="text-gr-muted text-sm leading-relaxed max-w-3xl">
          Captured switchers are a tiny fraction of actual brand migration. This is
          qualitative evidence, not statistical share-shift measurement. To answer
          &quot;what percent of Lululemon&apos;s customers are leaving&quot; you need their
          churn data, not ours. Origin brand is inferred via regex on the verbatim
          review text, so flows are only counted when a reviewer literally names a
          competitor.
        </p>
      </section>
    </div>
  );
}
