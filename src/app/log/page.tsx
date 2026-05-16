'use client';

/**
 * /log — institutional memory page. Combines:
 *   - Active interest signals (pursuing / exploring / monitoring / passing / not_now)
 *   - All annotations across the dashboard
 *
 * Each entry is searchable and links back to where it was attached. The
 * team uses this to answer "when did we decide to pass on X?" or "who said
 * we'd revisit Y in Q3?"
 */

import { useEffect, useMemo, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

type Signal = 'pursuing' | 'exploring' | 'monitoring' | 'passing' | 'not_now';

interface InterestRow {
  id: number;
  entity_kind: string;
  entity_key: string;
  signal: Signal;
  reason: string | null;
  submitted_by: string | null;
  submitted_at: string;
  expires_at: string | null;
}

interface AnnotationRow {
  id: number;
  entity_kind: string;
  entity_key: string;
  note: string;
  note_kind: 'comment' | 'action_taken' | 'hypothesis' | 'decision' | 'context';
  submitted_by: string | null;
  submitted_at: string;
}

const SIGNAL_META: Record<Signal, { label: string; color: string; bg: string }> = {
  pursuing:   { label: 'Pursuing',   color: 'text-gr-success', bg: 'bg-gr-success/15' },
  exploring:  { label: 'Exploring',  color: 'text-gr-accent',  bg: 'bg-gr-accent-soft' },
  monitoring: { label: 'Monitoring', color: 'text-gr-muted',   bg: 'bg-gr-raised' },
  passing:    { label: 'Passing',    color: 'text-gr-danger',  bg: 'bg-gr-danger/10' },
  not_now:    { label: 'Not now',    color: 'text-gr-subtle',  bg: 'bg-gr-bg' },
};

const NOTE_KIND_META = {
  comment:      { label: 'NOTE',       cls: 'text-gr-muted bg-gr-raised' },
  action_taken: { label: 'ACTION',     cls: 'text-gr-success bg-gr-success/15' },
  hypothesis:   { label: 'HYPOTHESIS', cls: 'text-gr-accent bg-gr-accent-soft' },
  decision:     { label: 'DECISION',   cls: 'text-gr-accent bg-gr-accent/20' },
  context:      { label: 'CONTEXT',    cls: 'text-gr-subtle bg-gr-bg' },
};

function fmtAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return iso;
  }
}

export default function LogPage() {
  const [signals, setSignals] = useState<InterestRow[]>([]);
  const [annotations, setAnnotations] = useState<AnnotationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'signals' | 'notes'>('all');
  const [signalFilter, setSignalFilter] = useState<Signal | 'all'>('all');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setLoading(false); return; }
    Promise.all([
      fetch(`${PULSE_API}/pulse/interest`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${PULSE_API}/pulse/annotations?limit=500`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([si, an]) => {
        setSignals(si.items || []);
        setAnnotations(an.items || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredSignals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return signals.filter((s) => {
      if (signalFilter !== 'all' && s.signal !== signalFilter) return false;
      if (!q) return true;
      return (
        s.entity_key.toLowerCase().includes(q) ||
        (s.reason || '').toLowerCase().includes(q) ||
        (s.submitted_by || '').toLowerCase().includes(q)
      );
    });
  }, [signals, search, signalFilter]);

  const filteredAnnotations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return annotations;
    return annotations.filter((a) =>
      a.note.toLowerCase().includes(q) ||
      a.entity_key.toLowerCase().includes(q) ||
      (a.submitted_by || '').toLowerCase().includes(q),
    );
  }, [annotations, search]);

  const signalCounts: Record<Signal, number> = {
    pursuing: 0, exploring: 0, monitoring: 0, passing: 0, not_now: 0,
  };
  for (const s of signals) signalCounts[s.signal]++;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Decisions Log
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Institutional memory.
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Every intent the team has set and every note attached to a finding, in one searchable
          place. Use it to answer &ldquo;when did we decide to pass on X?&rdquo; or &ldquo;who said
          we&apos;d revisit Y in Q3?&rdquo;
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(SIGNAL_META) as Signal[]).map((s) => {
          const m = SIGNAL_META[s];
          const c = signalCounts[s];
          return (
            <button
              key={s}
              onClick={() => { setView('signals'); setSignalFilter(signalFilter === s ? 'all' : s); }}
              className={`bg-gr-surface rounded-md border border-gr-border p-4 text-left transition hover:border-gr-accent/40 ${
                signalFilter === s && view === 'signals' ? 'ring-1 ring-gr-accent' : ''
              }`}
            >
              <p className={`text-[10px] uppercase tracking-wider font-bold ${m.color}`}>{m.label}</p>
              <p className="text-2xl font-bold text-gr-text mt-1 tabular-nums">{c}</p>
            </button>
          );
        })}
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-5 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search entity, reason, or person…"
          className="flex-1 min-w-[220px] px-3 py-1.5 rounded bg-gr-bg border border-gr-border text-sm text-gr-text focus:outline-none focus:border-gr-accent"
        />
        <div className="flex gap-1">
          {(['all', 'signals', 'notes'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${
                view === v ? 'bg-gr-accent text-gr-text' : 'bg-gr-bg text-gr-muted hover:text-gr-text'
              }`}
            >
              {v === 'all' ? 'All' : v === 'signals' ? 'Intent only' : 'Notes only'}
            </button>
          ))}
        </div>
      </section>

      {loading && <p className="text-sm text-gr-subtle">Loading…</p>}

      {(view === 'all' || view === 'signals') && filteredSignals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-gr-text tracking-tight">Team intent</h2>
          {filteredSignals.map((s) => {
            const m = SIGNAL_META[s.signal];
            return (
              <article key={`s-${s.id}`} className="bg-gr-surface rounded-md border border-gr-border p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${m.bg} ${m.color}`}>
                      {m.label}
                    </span>
                    <span className="text-sm font-semibold text-gr-text">{s.entity_kind}</span>
                    <code className="text-xs text-gr-muted bg-gr-bg px-1.5 py-0.5 rounded">{s.entity_key}</code>
                  </div>
                  <span className="text-xs text-gr-subtle">
                    {s.submitted_by ? `${s.submitted_by} · ` : ''}{fmtAgo(s.submitted_at)}
                  </span>
                </div>
                {s.reason && <p className="text-sm text-gr-muted leading-relaxed">{s.reason}</p>}
              </article>
            );
          })}
        </section>
      )}

      {(view === 'all' || view === 'notes') && filteredAnnotations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-gr-text tracking-tight">Notes</h2>
          {filteredAnnotations.map((a) => {
            const m = NOTE_KIND_META[a.note_kind] ?? NOTE_KIND_META.comment;
            return (
              <article key={`a-${a.id}`} className="bg-gr-surface rounded-md border border-gr-border p-4">
                <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${m.cls}`}>
                      {m.label}
                    </span>
                    <span className="text-sm font-semibold text-gr-text">{a.entity_kind}</span>
                    <code className="text-xs text-gr-muted bg-gr-bg px-1.5 py-0.5 rounded">{a.entity_key}</code>
                  </div>
                  <span className="text-xs text-gr-subtle">
                    {a.submitted_by ? `${a.submitted_by} · ` : ''}{fmtAgo(a.submitted_at)}
                  </span>
                </div>
                <p className="text-sm text-gr-muted leading-relaxed">{a.note}</p>
              </article>
            );
          })}
        </section>
      )}

      {!loading && filteredSignals.length === 0 && filteredAnnotations.length === 0 && (
        <div className="bg-gr-surface border border-gr-border rounded-md p-10 text-center">
          <p className="text-gr-muted">
            {search ? 'No decisions match that search.' :
             'Nothing logged yet. Add intent or notes on any whitespace opportunity, launch, or category to start building team memory.'}
          </p>
        </div>
      )}
    </div>
  );
}
