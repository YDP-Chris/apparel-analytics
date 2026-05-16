'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';

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
interface Payload {
  available: boolean;
  snapshot_date?: string;
  by_brand: BrandRow[];
  sample_reviews: SampleReview[];
  brand_names: Record<string, string>;
  reason?: string;
}

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

function colorFor(key: string): string {
  return SEGMENT_COLORS[key] || 'bg-gr-raised';
}

function prettyLabel(s: string): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

function DistBar({ title, dist, order, total }: {
  title: string;
  dist: Record<string, number>;
  order: string[];
  total: number;
}) {
  // Build a single stacked bar with all known segments in fixed order
  if (!total) {
    return (
      <div>
        <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-gr-subtle mb-1.5">{title}</div>
        <div className="h-3 rounded bg-gr-raised" />
        <div className="text-xs text-gr-subtle mt-1">no data</div>
      </div>
    );
  }
  // Include any keys we did not anticipate (defensive)
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

function SampleCarousel({ samples, brandNames }: { samples: SampleReview[]; brandNames: Record<string, string> }) {
  const [idx, setIdx] = useState(0);
  if (!samples.length) return null;
  const cur = samples[idx];
  const brand = brandNames[cur.brand] || cur.brand;

  function go(delta: number) {
    const next = (idx + delta + samples.length) % samples.length;
    setIdx(next);
    trackEvent('click', {
      label: 'voc_persona_carousel',
      metadata: { direction: delta > 0 ? 'next' : 'prev', new_index: next, brand: cur.brand },
    });
  }

  return (
    <section className="bg-gr-surface rounded-md border border-gr-border p-6">
      <div className="flex items-baseline justify-between mb-4 gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] font-bold text-gr-accent">Evidence</p>
          <h3 className="text-lg font-bold text-gr-text tracking-tight mt-0.5">Quote behind a persona inference</h3>
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

      <div className="text-xs text-gr-subtle mb-2">
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

      <blockquote className="text-gr-muted leading-relaxed italic">
        &ldquo;{cur.quote || 'no quote captured'}&rdquo;
      </blockquote>

      {cur.product_handle && (
        <div className="text-[11px] uppercase tracking-[0.18em] text-gr-subtle mt-3">
          product: <code className="bg-gr-bg px-1.5 py-0.5 rounded normal-case tracking-normal">{cur.product_handle}</code>
        </div>
      )}
    </section>
  );
}

export default function VocPersonasPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // Pin focus brand to top regardless of sample size
    const focus = data.by_brand.filter((b) => b.brand_slug === FOCUS_BRAND);
    const rest  = data.by_brand
      .filter((b) => b.brand_slug !== FOCUS_BRAND)
      .sort((a, b) => (b.sample_size || 0) - (a.sample_size || 0));
    return [...focus, ...rest];
  }, [data]);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading personas...</div>;
  if (error)   return <div className="text-center py-20 text-gr-danger">{error}</div>;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing · Who Buys What
          </p>
          <ConfidenceBadge source="dtc_voc_personas" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Customer personas by brand
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Claude reads each D2C review and infers the customer behind it: gender, experience level,
          age band, discipline, and what they use the product for. Confidence is MEDIUM. The honest
          read is that most reviewers do not tell you who they are. That is why the &quot;unknown&quot;
          slices are large by design. Do not over-read tight differences between brands.
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
          <SectionExplainer
            what="One card per brand. Each card shows four distribution bars (gender, experience, age, discipline) plus the top use cases customers actually mention and the top customer segments Claude inferred."
            howToRead="Big 'unknown' slices are intentional. The classifier is told to leave fields blank when the review does not say. A brand showing 70% unknown gender means the reviewers did not self-identify, not that the brand has a mystery audience. Sample size matters more than precise percentages."
            whatToDo="Use this to scope marketing copy and creator briefs. If 'powerlifting / competitor' is a meaningful slice for a competitor, that is a brief direction. Bring the quotes (in the carousel below) to the team so they can hear the actual voice instead of just the percentages."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ordered.map((row) => (
              <BrandCard key={row.brand_slug} row={row} />
            ))}
          </div>

          <SampleCarousel samples={data.sample_reviews || []} brandNames={data.brand_names || {}} />
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
