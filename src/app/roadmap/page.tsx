import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import {
  buildRoadmapItems,
  type Lane,
  type RoadmapStatus,
  type BuiltRoadmapItem,
} from '@/lib/roadmapManifest';

/**
 * /roadmap - internal-only roadmap for the Gymreapers analytics platform.
 *
 * Audience: Chris's marketing plus product teams. Communicates trajectory:
 * what's shipped, what's in flight, what's queued, what's blocked.
 *
 * Data is AUTO-DERIVED. Source of truth split:
 *   - LIVE / IN-FLIGHT items: pulled from Navigation.tsx via the mirror in
 *     src/lib/roadmapManifest.ts (NAV_SECTIONS_MIRROR + LANE_MAP).
 *   - QUEUED / BLOCKED / platform-pattern items: hand-edited in
 *     src/lib/roadmapManifest.ts (QUEUED_ITEMS, BLOCKED_ITEMS,
 *     SHIPPED_PLATFORM_ITEMS).
 *
 * This file is layout only - do not add items here. Edit roadmapManifest.ts.
 */

const STATUS_META: Record<RoadmapStatus, { label: string; cls: string }> = {
  live:      { label: 'LIVE',      cls: 'bg-gr-success/20 text-gr-success ring-gr-success/40' },
  in_flight: { label: 'IN FLIGHT', cls: 'bg-gr-accent-soft text-gr-accent ring-gr-accent/40' },
  queued:    { label: 'QUEUED',    cls: 'bg-gr-raised text-gr-subtle ring-gr-border' },
  blocked:   { label: 'BLOCKED',   cls: 'bg-gr-danger/15 text-gr-danger ring-gr-danger/40' },
};

const STATUS_ORDER: RoadmapStatus[] = ['live', 'in_flight', 'queued', 'blocked'];

const LANE_META: Array<{ key: Lane; label: string; blurb: string }> = [
  {
    key: 'marketing',
    label: 'Marketing',
    blurb: 'Pages built for the marketing team: share of voice, competitor beats, promo cadence, creator plus IP signals.',
  },
  {
    key: 'product',
    label: 'Product',
    blurb: 'Pages built for the product team: mix gaps, pricing, demand, whitespace, journey, complaints.',
  },
  {
    key: 'cross_cutting',
    label: 'Cross-cutting',
    blurb: 'Platform-wide pages and patterns: the spine the marketing and product lanes plug into.',
  },
];

// Auto-stamp at the top of the page. Updates on each deploy because the
// page is statically generated at build time.
const TODAY_ISO = new Date().toISOString().slice(0, 10);

function StatusPill({ status }: { status: RoadmapStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ring-1 ${meta.cls}`}
    >
      {meta.label}
    </span>
  );
}

function SourcePill({ source }: { source: BuiltRoadmapItem['source'] }) {
  const label = source === 'nav' ? 'from nav' : 'manifest';
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-gr-subtle bg-gr-bg/60 ring-1 ring-gr-border/60">
      {label}
    </span>
  );
}

function ItemRow({ item }: { item: BuiltRoadmapItem }) {
  const titleEl = item.href ? (
    <Link
      href={item.href}
      className="text-sm font-semibold text-gr-text hover:text-gr-accent transition"
    >
      {item.title}
    </Link>
  ) : (
    <span className="text-sm font-semibold text-gr-text">{item.title}</span>
  );

  return (
    <div className="border-l-2 border-gr-border/60 pl-3 py-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{titleEl}</div>
        <StatusPill status={item.status} />
      </div>
      <p className="text-xs text-gr-muted mt-1 leading-relaxed">{item.description}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <SourcePill source={item.source} />
        {item.updated && (
          <span className="text-[10px] uppercase tracking-wider text-gr-subtle">
            Updated {item.updated}
          </span>
        )}
      </div>
    </div>
  );
}

function LaneColumn({
  lane,
  items,
}: {
  lane: (typeof LANE_META)[number];
  items: BuiltRoadmapItem[];
}) {
  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: items.filter((i) => i.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="bg-gr-surface border border-gr-border rounded-md p-6 space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.25em] text-gr-subtle font-bold mb-1">
          Lane
        </div>
        <h2 className="text-2xl font-bold text-gr-text tracking-tight">{lane.label}</h2>
        <p className="text-sm text-gr-muted mt-2 leading-relaxed">{lane.blurb}</p>
      </div>

      {grouped.map(({ status, items: groupItems }) => (
        <section key={status} className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusPill status={status} />
            <span className="text-[11px] uppercase tracking-wider text-gr-subtle font-bold">
              {groupItems.length} {groupItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="space-y-2">
            {groupItems.map((item) => (
              <ItemRow key={`${item.lane}-${item.title}`} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function RoadmapPage() {
  const all = buildRoadmapItems();
  const byLane: Record<Lane, BuiltRoadmapItem[]> = {
    marketing: [],
    product: [],
    cross_cutting: [],
  };
  for (const item of all) byLane[item.lane].push(item);

  const totalLive = all.filter((i) => i.status === 'live').length;
  const totalQueued = all.filter((i) => i.status === 'queued').length;
  const totalBlocked = all.filter((i) => i.status === 'blocked').length;
  const totalInFlight = all.filter((i) => i.status === 'in_flight').length;

  const shippedStats = [
    { label: 'Live items',     value: String(totalLive) },
    { label: 'In flight',      value: String(totalInFlight) },
    { label: 'Queued',         value: String(totalQueued) },
    { label: 'Blocked',        value: String(totalBlocked) },
  ];

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.25em] text-gr-accent font-bold">
            Internal &middot; Data &amp; Analytics Roadmap
          </div>
          <h1 className="text-4xl font-bold text-gr-text tracking-tight mt-2">
            What&apos;s shipped, what&apos;s coming, what&apos;s blocked
          </h1>
          <p className="text-base text-gr-muted mt-3 leading-relaxed">
            Trajectory of the Gymreapers analytics platform. Live items are
            auto-derived from Navigation.tsx. Queued and blocked items live in
            src/lib/roadmapManifest.ts.
          </p>
          <p className="text-xs text-gr-subtle uppercase tracking-wider mt-3">
            Updated as of {TODAY_ISO}
          </p>
        </div>
        <div className="flex-shrink-0">
          <ConfidenceBadge source="composite" size="md" />
        </div>
      </header>

      {/* APPAREL THESIS CALLOUT */}
      <section className="bg-gr-surface border border-gr-accent/40 border-l-2 border-l-gr-accent rounded-md p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-gr-accent font-bold">
          Strategic Frame
        </div>
        <h2 className="text-xl font-bold text-gr-text tracking-tight mt-2">
          Apparel thesis is the primary lens
        </h2>
        <p className="text-sm text-gr-muted mt-3 leading-relaxed max-w-4xl">
          Gymreapers is steering into apparel beyond accessories core. Pages flagged
          with the apparel direction surface entry candidates filtered for the
          strength-athlete customer story: training, between-sets, recovery, identity,
          meet day. Off-thesis categories (yoga-pure, high-fashion drops, tennis
          dresses) are deprioritized even when peers are deep in them.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Link
            href="/journey"
            className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent-soft text-gr-accent hover:bg-gr-accent hover:text-gr-text transition"
          >
            View Journey
          </Link>
          <Link
            href="/apparel-entry-candidates"
            className="inline-flex items-center px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent-soft text-gr-accent hover:bg-gr-accent hover:text-gr-text transition"
          >
            View Entry Candidates
          </Link>
        </div>
      </section>

      {/* LEGEND */}
      <section className="bg-gr-bg/60 border border-gr-border/60 rounded-md p-4">
        <div className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-3">
          Status Legend
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gr-muted">
          <div className="flex items-center gap-2">
            <StatusPill status="live" />
            <span>in production, team can use</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="in_flight" />
            <span>actively being built</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="queued" />
            <span>in backlog, no blockers</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status="blocked" />
            <span>waiting on decision or external dependency</span>
          </div>
          <div className="flex items-center gap-2">
            <SourcePill source="nav" />
            <span>derived from Navigation.tsx</span>
          </div>
          <div className="flex items-center gap-2">
            <SourcePill source="manifest" />
            <span>edited in roadmapManifest.ts</span>
          </div>
        </div>
      </section>

      {/* THREE LANES */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {LANE_META.map((lane) => (
          <LaneColumn key={lane.key} lane={lane} items={byLane[lane.key]} />
        ))}
      </section>

      {/* WHAT WE BUILT TODAY */}
      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <div className="text-[11px] uppercase tracking-[0.25em] text-gr-subtle font-bold">
          Recent Velocity
        </div>
        <h2 className="text-2xl font-bold text-gr-text tracking-tight mt-2">
          What we built today
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-5">
          {shippedStats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-gr-text">{s.value}</div>
              <div className="text-[11px] uppercase tracking-wider text-gr-subtle font-semibold mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gr-muted mt-5 leading-relaxed max-w-3xl">
          Counts above auto-update as Navigation.tsx grows and as items move
          through roadmapManifest.ts. vs-LW deltas will light up across the
          dashboard over the next 5 days as snapshots accumulate.
        </p>
      </section>

      {/* BOTTOM STRIP */}
      <section className="bg-gr-bg/60 border border-gr-border/60 rounded-md p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gr-text">
            Got an idea for the roadmap?
          </div>
          <p className="text-xs text-gr-muted mt-1">
            Submit it on the Team Inputs page. Chris reviews submissions weekly.
          </p>
        </div>
        <Link
          href="/inputs"
          className="inline-flex items-center px-4 py-2 rounded text-xs font-bold uppercase tracking-wider bg-gr-accent text-gr-text hover:bg-gr-accent-hover transition"
        >
          Submit a roadmap suggestion
        </Link>
      </section>

      {/* SOURCE ATTRIBUTION */}
      <footer className="text-xs text-gr-subtle leading-relaxed border-t border-gr-border/60 pt-4">
        Roadmap is auto-derived. Live items come from Navigation.tsx; queued
        plus blocked items come from src/lib/roadmapManifest.ts. Build stamp:{' '}
        {TODAY_ISO}. See{' '}
        <Link href="/log" className="text-gr-accent hover:text-gr-accent-hover">/log</Link>{' '}
        for decisions made and rationale.
      </footer>
    </div>
  );
}
