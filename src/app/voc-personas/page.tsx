'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const FOCUS_BRAND = 'gymreapers';

interface UseCaseEntry { name: string; count: number }
interface SegmentEntry  { name: string; count: number }
interface BrandRow {
  brand_slug: string;
  brand_name: string;
  sample_size: number;
  gender: Record<string, number>;
  experience: Record<string, number>;
  age: Record<string, number>;
  discipline: Record<string, number>;
  top_use_cases: UseCaseEntry[];
  top_segments: SegmentEntry[];
  computed_at?: string;
}
interface SampleReview {
  brand: string;
  persona_summary: string;
  quote: string;
  product_handle?: string;
  rating?: number;
}
interface VoiceSample {
  source_id?: number;
  voice_signature: string;
  quoted_phrase: string;
  life_context: string[];
  product_relationship: string;
  rating?: number | null;
  product_name?: string | null;
  cluster_label?: string | null;
}
interface LifeContextPhrase { phrase: string; count: number }
interface ClusterSampleQuote { quoted_phrase: string; voice_signature: string }
interface VoiceCluster {
  id: number;
  label: string;
  description: string;
  distinctive_phrases: string[];
  size: number;
  share_pct: number;
  sample_quotes: ClusterSampleQuote[];
}

interface Payload {
  available: boolean;
  snapshot_date?: string;
  by_brand: BrandRow[];
  sample_reviews: SampleReview[];
  brand_names: Record<string, string>;
  voice_samples_by_brand?: Record<string, VoiceSample[]>;
  life_context_top_phrases?: Record<string, LifeContextPhrase[]>;
  product_relationship_distribution?: Record<string, Record<string, number>>;
  clusters_by_brand?: Record<string, VoiceCluster[]>;
  reason?: string;
}

const MIN_CLUSTER_SIGNATURES = 30;

const GENDER_ORDER     = ['female', 'male', 'non-binary', 'unknown'];
const EXPERIENCE_ORDER = ['novice', 'intermediate', 'advanced', 'pro', 'unknown'];
const AGE_ORDER        = ['teen', '20s', '30s', '40s', '50_plus', 'unknown'];
const DISCIPLINE_ORDER = [
  'powerlifting', 'strongman', 'bodybuilding', 'crossfit', 'weightlifting',
  'functional_fitness', 'running', 'yoga', 'general_gym', 'unknown',
];

const SEGMENT_COLORS: Record<string, string> = {
  female: 'bg-gr-accent',
  male: 'bg-gr-accent-hover',
  'non-binary': 'bg-gr-success',
  unknown: 'bg-gr-raised',
  novice: 'bg-gr-success/70',
  intermediate: 'bg-gr-accent/70',
  advanced: 'bg-gr-accent',
  pro: 'bg-gr-accent-hover',
  teen: 'bg-gr-success/60',
  '20s': 'bg-gr-success/80',
  '30s': 'bg-gr-accent/80',
  '40s': 'bg-gr-accent',
  '50_plus': 'bg-gr-accent-hover',
  powerlifting: 'bg-gr-accent-hover',
  strongman: 'bg-gr-accent',
  bodybuilding: 'bg-gr-accent/80',
  crossfit: 'bg-gr-success',
  weightlifting: 'bg-gr-accent/70',
  functional_fitness: 'bg-gr-success/70',
  running: 'bg-gr-success/60',
  yoga: 'bg-gr-accent-soft',
  general_gym: 'bg-gr-raised',
};

const PRODUCT_RELATIONSHIP_LABELS: Record<string, string> = {
  new_customer: 'New customer',
  repeat_buyer: 'Repeat buyer',
  gifting: 'Gifting',
  comparing_brands: 'Comparing brands',
  replacing_competitor: 'Replacing competitor',
  dissatisfied: 'Dissatisfied',
  evangelist: 'Evangelist',
  lapsed: 'Lapsed',
  unknown: 'Unknown',
};

const PRODUCT_RELATIONSHIP_COLORS: Record<string, string> = {
  new_customer: 'bg-gr-success/30 text-gr-success border-gr-success/40',
  repeat_buyer: 'bg-gr-accent/20 text-gr-accent border-gr-accent/40',
  gifting: 'bg-gr-accent-soft text-gr-accent border-gr-accent/30',
  comparing_brands: 'bg-gr-raised text-gr-text border-gr-border',
  replacing_competitor: 'bg-gr-accent-hover/20 text-gr-accent-hover border-gr-accent-hover/40',
  dissatisfied: 'bg-gr-danger/20 text-gr-danger border-gr-danger/40',
  evangelist: 'bg-gr-success/30 text-gr-success border-gr-success/50',
  lapsed: 'bg-gr-raised text-gr-subtle border-gr-border',
  unknown: 'bg-gr-bg text-gr-subtle border-gr-border',
};

function colorFor(key: string): string {
  return SEGMENT_COLORS[key] || 'bg-gr-raised';
}

function prettyLabel(s: string): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

function relationshipLabel(key: string): string {
  return PRODUCT_RELATIONSHIP_LABELS[key] || prettyLabel(key || 'unknown');
}

function relationshipPill(key: string): string {
  return PRODUCT_RELATIONSHIP_COLORS[key] || 'bg-gr-bg text-gr-subtle border-gr-border';
}

function DistBar({ title, dist, order, total }: {
  title: string;
  dist: Record<string, number>;
  order: string[];
  total: number;
}) {
  if (!total) {
    return (
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-1.5">{title}</div>
        <div className="h-3 rounded bg-gr-raised" />
        <div className="text-xs text-gr-subtle mt-1">no data</div>
      </div>
    );
  }
  const allKeys = Array.from(new Set<string>([...order, ...Object.keys(dist)]));
  const segments = allKeys
    .map((k) => ({ key: k, count: dist[k] || 0 }))
    .filter((s) => s.count > 0);
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-1.5">{title}</div>
      <div className="h-3 rounded bg-gr-raised overflow-hidden flex">
        {segments.map((s) => {
          const pct = (s.count / total) * 100;
          return (
            <div
              key={s.key}
              className={`${colorFor(s.key)} h-full`}
              style={{ width: `${pct}%` }}
              title={`${prettyLabel(s.key)}: ${s.count} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gr-muted">
        {segments.map((s) => {
          const pct = ((s.count / total) * 100).toFixed(0);
          return (
            <span key={s.key} className="inline-flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded ${colorFor(s.key)}`} />
              <span className="tabular-nums">{prettyLabel(s.key)} {pct}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function BrandCard({ row }: { row: BrandRow }) {
  const isFocus = row.brand_slug === FOCUS_BRAND;
  const ring = isFocus ? 'ring-2 ring-gr-accent' : '';
  return (
    <section className={`bg-gr-surface rounded-md border border-gr-border p-6 ${ring}`}>
      <div className="flex items-baseline justify-between mb-5 gap-3">
        <div>
          <h2 className="text-xl font-bold text-gr-text tracking-tight">{row.brand_name}</h2>
          {isFocus && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gr-accent-soft text-gr-accent">
              FOCUS BRAND
            </span>
          )}
        </div>
        <span className="text-xs text-gr-subtle tabular-nums">
          n={row.sample_size} review{row.sample_size === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DistBar title="Gender"    dist={row.gender}     order={GENDER_ORDER}     total={row.sample_size} />
        <DistBar title="Experience" dist={row.experience} order={EXPERIENCE_ORDER} total={row.sample_size} />
        <DistBar title="Age band"   dist={row.age}        order={AGE_ORDER}        total={row.sample_size} />
        <DistBar title="Discipline" dist={row.discipline} order={DISCIPLINE_ORDER} total={row.sample_size} />
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-2">Top use cases</div>
          <div className="flex flex-wrap gap-1.5">
            {row.top_use_cases.slice(0, 3).length === 0 && (
              <span className="text-xs text-gr-subtle italic">none extracted yet</span>
            )}
            {row.top_use_cases.slice(0, 3).map((u) => (
              <span
                key={u.name}
                className="px-2 py-1 rounded text-xs bg-gr-bg border border-gr-border text-gr-text"
              >
                {prettyLabel(u.name)} <span className="text-gr-subtle tabular-nums">{u.count}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-2">Top customer segments</div>
          <div className="flex flex-wrap gap-1.5">
            {row.top_segments.slice(0, 2).length === 0 && (
              <span className="text-xs text-gr-subtle italic">unknown for now</span>
            )}
            {row.top_segments.slice(0, 2).map((s) => (
              <span
                key={s.name}
                className="px-2 py-1 rounded text-xs bg-gr-bg border border-gr-border text-gr-text"
              >
                {prettyLabel(s.name)} <span className="text-gr-subtle tabular-nums">{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VoiceCard({ sample, brandName }: { sample: VoiceSample; brandName: string }) {
  const lc = (sample.life_context || []).filter((x) => x && x.trim());
  return (
    <article className="bg-gr-surface rounded-md border border-gr-border p-5 flex flex-col h-full">
      <header className="flex items-baseline justify-between gap-2 mb-3">
        <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent">
          {brandName}
        </span>
        {sample.rating !== undefined && sample.rating !== null && (
          <span className="text-[11px] text-gr-subtle tabular-nums">
            {Number(sample.rating).toFixed(1)} stars
          </span>
        )}
      </header>

      <p className="text-gr-text text-sm leading-relaxed">
        {sample.voice_signature || 'No voice signature available.'}
      </p>

      {sample.quoted_phrase && (
        <blockquote className="mt-3 text-gr-accent italic text-sm leading-relaxed border-l-2 border-gr-accent pl-3">
          &ldquo;{sample.quoted_phrase}&rdquo;
        </blockquote>
      )}

      {lc.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {lc.map((phrase) => (
            <span
              key={phrase}
              className="px-2 py-0.5 rounded text-[11px] bg-gr-bg border border-gr-border text-gr-muted"
            >
              {phrase}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto pt-3 flex items-center justify-between gap-2">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${relationshipPill(sample.product_relationship)}`}
        >
          {relationshipLabel(sample.product_relationship)}
        </span>
        {sample.product_name && (
          <code className="text-[10px] text-gr-subtle bg-gr-bg px-1.5 py-0.5 rounded truncate max-w-[55%]">
            {sample.product_name}
          </code>
        )}
      </div>
    </article>
  );
}

function VoiceBrandSection({
  brandSlug,
  brandName,
  samples,
  lifePhrases,
  relationshipDist,
  isFocus,
  filterClusterLabel,
  onClearFilter,
}: {
  brandSlug: string;
  brandName: string;
  samples: VoiceSample[];
  lifePhrases: LifeContextPhrase[];
  relationshipDist: Record<string, number>;
  isFocus: boolean;
  filterClusterLabel?: string | null;
  onClearFilter?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  if (!samples || samples.length === 0) return null;

  const ring = isFocus ? 'ring-2 ring-gr-accent' : '';
  const cur = samples[idx];
  const total = Object.values(relationshipDist || {}).reduce((a, b) => a + b, 0);
  const sortedRel = Object.entries(relationshipDist || {})
    .filter(([k]) => k !== 'unknown')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  function go(delta: number) {
    const next = (idx + delta + samples.length) % samples.length;
    setIdx(next);
    trackEvent('click', {
      label: 'voc_voice_carousel',
      metadata: { direction: delta > 0 ? 'next' : 'prev', new_index: next, brand: brandSlug },
    });
  }

  return (
    <section className={`bg-gr-surface rounded-md border border-gr-border p-6 ${ring}`}>
      <header className="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold text-gr-text tracking-tight">{brandName}</h2>
          {isFocus && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gr-accent-soft text-gr-accent">
              FOCUS BRAND
            </span>
          )}
        </div>
        <span className="text-xs text-gr-subtle tabular-nums">
          {samples.length} voice sample{samples.length === 1 ? '' : 's'}
        </span>
      </header>

      {filterClusterLabel && (
        <div className="mb-3 flex items-center justify-between gap-3 bg-gr-bg border border-gr-accent/40 rounded px-3 py-2">
          <span className="text-xs text-gr-muted">
            Filtered to cluster:{' '}
            <span className="font-bold text-gr-accent">{filterClusterLabel}</span>
          </span>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="text-[11px] uppercase tracking-wider font-bold text-gr-accent hover:text-gr-accent-hover"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="mb-4">
        <VoiceCard sample={cur} brandName={brandName} />
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={() => go(-1)}
            className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gr-bg border border-gr-border text-gr-muted hover:text-gr-text hover:bg-gr-raised"
            aria-label="Previous voice sample"
          >
            Prev
          </button>
          <span className="text-xs text-gr-subtle tabular-nums">{idx + 1} / {samples.length}</span>
          <button
            type="button"
            onClick={() => go(1)}
            className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gr-bg border border-gr-border text-gr-muted hover:text-gr-text hover:bg-gr-raised"
            aria-label="Next voice sample"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gr-border">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-2">
            Top life-context phrases
          </div>
          {lifePhrases.length === 0 ? (
            <span className="text-xs text-gr-subtle italic">no recurring phrases yet</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {lifePhrases.slice(0, 12).map((p) => (
                <span
                  key={p.phrase}
                  className="px-2 py-1 rounded text-xs bg-gr-bg border border-gr-border text-gr-text"
                >
                  {p.phrase} <span className="text-gr-subtle tabular-nums">{p.count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-2">
            Product relationship mix
          </div>
          {sortedRel.length === 0 ? (
            <span className="text-xs text-gr-subtle italic">mostly unknown</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {sortedRel.map(([k, v]) => {
                const pct = total ? ((v / total) * 100).toFixed(0) : '0';
                return (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${relationshipPill(k)}`}
                    >
                      {relationshipLabel(k)}
                    </span>
                    <span className="text-gr-subtle tabular-nums">{v} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ClusterCard({
  cluster,
  isActive,
  onClick,
}: {
  cluster: VoiceCluster;
  isActive: boolean;
  onClick: () => void;
}) {
  const phrases = (cluster.distinctive_phrases || []).slice(0, 2);
  const sample = (cluster.sample_quotes || [])[0];
  const baseRing = isActive ? 'ring-2 ring-gr-accent' : 'ring-1 ring-transparent hover:ring-gr-border';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`shrink-0 w-72 text-left bg-gr-surface rounded-md border border-gr-border p-4 flex flex-col gap-2 transition ${baseRing}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-gr-text leading-tight">
          {cluster.label}
        </h3>
        <span className="text-[11px] text-gr-subtle tabular-nums shrink-0">
          {cluster.share_pct.toFixed(0)}% · n={cluster.size}
        </span>
      </div>
      {cluster.description && (
        <p className="italic text-xs text-gr-muted leading-relaxed line-clamp-3">
          {cluster.description}
        </p>
      )}
      {phrases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {phrases.map((p) => (
            <span
              key={p}
              className="px-1.5 py-0.5 rounded text-[10px] bg-gr-bg border border-gr-border text-gr-muted"
            >
              {p}
            </span>
          ))}
        </div>
      )}
      {sample && (sample.quoted_phrase || sample.voice_signature) && (
        <blockquote className="mt-2 text-[11px] leading-relaxed text-gr-subtle border-l-2 border-gr-border pl-2 line-clamp-3">
          {sample.quoted_phrase || sample.voice_signature}
        </blockquote>
      )}
    </button>
  );
}

function ClustersTopSection({
  clustersByBrand,
  brandNames,
  voiceSampleCounts,
  activeFilter,
  onSelect,
  onClear,
}: {
  clustersByBrand: Record<string, VoiceCluster[]>;
  brandNames: Record<string, string>;
  voiceSampleCounts: Record<string, number>;
  activeFilter: { brandSlug: string; label: string } | null;
  onSelect: (brandSlug: string, label: string) => void;
  onClear: () => void;
}) {
  // Brand display order: focus first, then by cluster count DESC.
  const slugs = Object.keys(clustersByBrand)
    .filter((s) => (clustersByBrand[s] || []).length > 0);
  const focus = slugs.filter((s) => s === FOCUS_BRAND);
  const rest = slugs
    .filter((s) => s !== FOCUS_BRAND)
    .sort((a, b) => (clustersByBrand[b]?.length || 0) - (clustersByBrand[a]?.length || 0));
  const orderedSlugs = [...focus, ...rest];

  // Brands with voice signatures present but below threshold or without clusters yet.
  const lowCoverageBrands = Object.entries(voiceSampleCounts)
    .filter(([slug, n]) => n < MIN_CLUSTER_SIGNATURES && !(clustersByBrand[slug] && clustersByBrand[slug].length))
    .sort((a, b) => b[1] - a[1]);

  if (orderedSlugs.length === 0 && lowCoverageBrands.length === 0) return null;

  return (
    <section className="space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">
            Emergent
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gr-text mt-1">
            Customer clusters per brand
          </h2>
          <p className="text-gr-muted text-sm mt-2 max-w-2xl leading-relaxed">
            No predefined buckets. For each brand, Claude reads the voice signatures
            and proposes the customer clusters that actually appear in the data.
            Click a card to filter the voice carousel below.
          </p>
        </div>
        {activeFilter && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] uppercase tracking-wider font-bold text-gr-accent hover:text-gr-accent-hover shrink-0"
          >
            Clear filter
          </button>
        )}
      </header>

      <div className="space-y-6">
        {orderedSlugs.map((slug) => {
          const clusters = clustersByBrand[slug] || [];
          const isFocus = slug === FOCUS_BRAND;
          const ring = isFocus ? 'ring-2 ring-gr-accent' : '';
          return (
            <div
              key={slug}
              className={`bg-gr-surface rounded-md border border-gr-border p-5 ${ring}`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gr-text tracking-tight">
                    {brandNames[slug] || slug}
                  </h3>
                  {isFocus && (
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider bg-gr-accent-soft text-gr-accent">
                      FOCUS BRAND
                    </span>
                  )}
                </div>
                <span className="text-xs text-gr-subtle tabular-nums">
                  {clusters.length} cluster{clusters.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {clusters.map((c) => {
                  const isActive =
                    activeFilter?.brandSlug === slug && activeFilter?.label === c.label;
                  return (
                    <ClusterCard
                      key={c.id}
                      cluster={c}
                      isActive={isActive}
                      onClick={() => {
                        if (isActive) {
                          onClear();
                        } else {
                          onSelect(slug, c.label);
                          trackEvent('click', {
                            label: 'voc_cluster_select',
                            metadata: { brand: slug, cluster: c.label },
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        {lowCoverageBrands.length > 0 && (
          <div className="bg-gr-bg rounded-md border border-dashed border-gr-border p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-2">
              Awaiting more voice signatures
            </p>
            <ul className="text-xs text-gr-muted space-y-1">
              {lowCoverageBrands.map(([slug, n]) => (
                <li key={slug}>
                  <span className="font-bold text-gr-text">{brandNames[slug] || slug}</span>
                  {' '}- need at least {MIN_CLUSTER_SIGNATURES} voice signatures for clusters,
                  currently {n}. Will surface when next classifier pass completes.
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default function VocPersonasPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDemographics, setShowDemographics] = useState(false);
  const [clusterFilter, setClusterFilter] = useState<{ brandSlug: string; label: string } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/voc-personas`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const ordered = useMemo(() => {
    if (!data?.by_brand) return [];
    const focus = data.by_brand.filter((b) => b.brand_slug === FOCUS_BRAND);
    const rest  = data.by_brand
      .filter((b) => b.brand_slug !== FOCUS_BRAND)
      .sort((a, b) => (b.sample_size || 0) - (a.sample_size || 0));
    return [...focus, ...rest];
  }, [data]);

  const voiceSampleCounts = useMemo(() => {
    const out: Record<string, number> = {};
    const bag = data?.voice_samples_by_brand || {};
    for (const k of Object.keys(bag)) {
      out[k] = (bag[k] || []).length;
    }
    return out;
  }, [data]);

  const voiceBrandsOrdered = useMemo(() => {
    if (!data?.voice_samples_by_brand) return [] as string[];
    const slugs = Object.keys(data.voice_samples_by_brand).filter(
      (s) => (data.voice_samples_by_brand?.[s] || []).length > 0,
    );
    const focus = slugs.filter((s) => s === FOCUS_BRAND);
    const rest = slugs
      .filter((s) => s !== FOCUS_BRAND)
      .sort((a, b) => {
        const ca = (data.voice_samples_by_brand?.[a] || []).length;
        const cb = (data.voice_samples_by_brand?.[b] || []).length;
        return cb - ca;
      });
    return [...focus, ...rest];
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading personas...</div>;
  if (error)   return <div className="text-center py-20 text-gr-danger">{error}</div>;

  const brandNames = data?.brand_names || {};
  const hasVoice = voiceBrandsOrdered.length > 0;

  return (
    <div className="space-y-12">
      <HubTabs hub="voc" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing · Voice of the Customer
          </p>
          <ConfidenceBadge source="dtc_voc_personas" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          The customer voice behind each brand
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Claude reads every D2C review and captures the reviewer&apos;s voice: who they are,
          what they care about, and what they actually said in their own words. Demographic
          distributions are still here, but they sit below the voice samples because the
          quotes are the story.
        </p>
      </header>

      {!data?.available ? (
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No persona snapshots yet
          </p>
          <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">
            Run the classifier
          </h2>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            {data?.reason || 'voc-personas-classifier has not produced a brand_demographics row yet.'}
            <br />
            Start it manually with{' '}
            <code className="bg-gr-bg px-1.5 py-0.5 rounded">
              cd /mnt/data/agents/voc-personas-classifier &amp;&amp; python3 main.py
            </code>
          </p>
        </section>
      ) : (
        <>
          <ClustersTopSection
            clustersByBrand={data?.clusters_by_brand || {}}
            brandNames={brandNames}
            voiceSampleCounts={voiceSampleCounts}
            activeFilter={clusterFilter}
            onSelect={(brandSlug, label) =>
              setClusterFilter({ brandSlug, label })
            }
            onClear={() => setClusterFilter(null)}
          />

          <SectionExplainer
            what="Each card is one brand. The carousel inside shows up to 12 voice samples Claude pulled from real reviews. Voice signature is the third-person observation. The italic quote is verbatim from the reviewer. The chips beneath are incidental life details. The pill at the bottom tags the customer relationship (new, repeat, gifting, etc.)."
            howToRead="Read the quotes first. They are how your customers actually talk. The life-context chips show the patterns the classifier sees across all of a brand's reviews. The relationship mix tells you what stage of the customer journey is loudest in the review corpus."
            whatToDo="Use the verbatim quotes in creator briefs and ad copy. Mine the recurring life-context phrases for landing-page headlines. If repeat_buyer or evangelist dominates a brand, that is a retention story. If replacing_competitor or new_customer spikes, that is acquisition."
          />

          {hasVoice ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {voiceBrandsOrdered.map((slug) => {
                const allSamples = data?.voice_samples_by_brand?.[slug] || [];
                const isFiltered = clusterFilter?.brandSlug === slug;
                const samples = isFiltered
                  ? allSamples.filter((s) => s.cluster_label === clusterFilter?.label)
                  : allSamples;
                // If a filter is active but for ANOTHER brand, hide this brand entirely so
                // the focus stays on the filtered brand.
                if (clusterFilter && clusterFilter.brandSlug !== slug) return null;
                if (samples.length === 0) return null;
                return (
                  <VoiceBrandSection
                    key={slug}
                    brandSlug={slug}
                    brandName={brandNames[slug] || slug}
                    samples={samples}
                    lifePhrases={data?.life_context_top_phrases?.[slug] || []}
                    relationshipDist={data?.product_relationship_distribution?.[slug] || {}}
                    isFocus={slug === FOCUS_BRAND}
                    filterClusterLabel={isFiltered ? clusterFilter?.label : null}
                    onClearFilter={() => setClusterFilter(null)}
                  />
                );
              })}
            </div>
          ) : (
            <section className="bg-gr-surface rounded-md border border-gr-border p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-2">
                Voice extraction in progress
              </p>
              <p className="text-gr-muted leading-relaxed">
                The voice classifier has not finished tagging reviews yet. Demographics are
                shown below in the meantime.
              </p>
            </section>
          )}

          <section className="border-t border-gr-border pt-6">
            <button
              type="button"
              onClick={() => {
                const next = !showDemographics;
                setShowDemographics(next);
                trackEvent('click', {
                  label: 'voc_demographics_toggle',
                  metadata: { open: next },
                });
              }}
              className="w-full flex items-center justify-between gap-3 py-2 text-left"
              aria-expanded={showDemographics}
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-subtle">
                  Optional context
                </p>
                <h2 className="text-2xl font-bold tracking-tight text-gr-text mt-0.5">
                  Demographic distributions by brand
                </h2>
                <p className="text-gr-subtle text-sm mt-1">
                  Big &quot;unknown&quot; slices are intentional. Sample size matters more than precise percentages.
                </p>
              </div>
              <span
                className="text-xs uppercase tracking-wider font-bold text-gr-accent shrink-0"
                aria-hidden="true"
              >
                {showDemographics ? 'Hide' : 'Show'}
              </span>
            </button>

            {showDemographics && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {ordered.map((row) => (
                    <BrandCard key={row.brand_slug} row={row} />
                  ))}
                </div>

                <details className="bg-gr-surface rounded-md border border-gr-border p-5">
                  <summary className="cursor-pointer text-sm font-bold text-gr-text">
                    Legacy persona-evidence carousel
                  </summary>
                  <div className="mt-4">
                    <LegacySampleCarousel
                      samples={data?.sample_reviews || []}
                      brandNames={brandNames}
                    />
                  </div>
                </details>
              </div>
            )}
          </section>
        </>
      )}

      <div className="text-xs text-gr-subtle">
        Source:{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">
          gymreapers_competitive.brand_demographics
        </code>{' '}
        +{' '}
        <code className="bg-gr-bg px-1.5 py-0.5 rounded">
          gymreapers_competitive.review_personas
        </code>
        {data?.snapshot_date && (
          <>
            <span className="mx-2">·</span>
            <span>snapshot {data.snapshot_date}</span>
          </>
        )}
      </div>
    </div>
  );
}

function LegacySampleCarousel({ samples, brandNames }: { samples: SampleReview[]; brandNames: Record<string, string> }) {
  const [idx, setIdx] = useState(0);
  if (!samples.length) {
    return <div className="text-gr-subtle text-sm italic">No evidence quotes captured yet.</div>;
  }
  const cur = samples[idx];
  const brand = brandNames[cur.brand] || cur.brand;

  function go(delta: number) {
    const next = (idx + delta + samples.length) % samples.length;
    setIdx(next);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3 gap-3">
        <div className="text-xs text-gr-subtle">
          <span className="font-semibold text-gr-text">{brand}</span>
          <span className="mx-2">·</span>
          <span>{cur.persona_summary}</span>
          {cur.rating !== undefined && cur.rating !== null && (
            <>
              <span className="mx-2">·</span>
              <span className="tabular-nums">{Number(cur.rating).toFixed(1)} stars</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gr-bg border border-gr-border text-gr-muted hover:text-gr-text hover:bg-gr-raised"
            aria-label="Previous sample"
          >
            Prev
          </button>
          <span className="text-xs text-gr-subtle tabular-nums">{idx + 1} / {samples.length}</span>
          <button
            type="button"
            onClick={() => go(1)}
            className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-gr-bg border border-gr-border text-gr-muted hover:text-gr-text hover:bg-gr-raised"
            aria-label="Next sample"
          >
            Next
          </button>
        </div>
      </div>

      <blockquote className="text-gr-muted leading-relaxed italic">
        &ldquo;{cur.quote || 'no quote captured'}&rdquo;
      </blockquote>

      {cur.product_handle && (
        <div className="text-[11px] uppercase tracking-[0.18em] text-gr-subtle mt-3">
          product: <code className="bg-gr-bg px-1.5 py-0.5 rounded normal-case tracking-normal">{cur.product_handle}</code>
        </div>
      )}
    </div>
  );
}
