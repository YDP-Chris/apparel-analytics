'use client';

/**
 * /stories — the guided "big stories" flow. Instead of dropping the team into a
 * 50-page nav to wander, we route them through the biggest competitive moves in
 * rank order (IKEA showroom style), one at a time, each tied to a pillar with a
 * recommended move. Data from the Pi story engine via /pulse/stories.
 */

import { useEffect, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Story {
  id: string; type: string; rank: number; brand: string;
  headline: string; detail: string; magnitude: number; score: number;
  pillar: string; pillar_key: string; move: string; vs_us?: string | null;
  confidence?: 'high' | 'medium' | 'low'; confidence_note?: string | null; signals?: string[];
}

const TYPE_LABEL: Record<string, string> = {
  launch: 'Launch signal', velocity: 'Catalog velocity', trend: 'Search demand',
};

const CONF_STYLE: Record<string, string> = {
  high: 'text-gr-success border-gr-success',
  medium: 'text-amber-500 border-amber-500',
  low: 'text-gr-subtle border-gr-border',
};

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [flagged, setFlagged] = useState<Story[]>([]);
  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first (open any Gymreapers page to authenticate).'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/stories?n=6`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => { setStories(j.trusted || j.stories || []); setFlagged(j.flagged || []); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, stories.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stories.length]);

  if (loading) return <p className="text-sm text-gr-subtle">Loading the big stories…</p>;
  if (error) return <p className="text-sm text-gr-muted">{error}</p>;
  if (!stories.length) {
    return (
      <div className="max-w-2xl mx-auto">
        <p className="text-gr-muted mb-6">No decision-grade stories surfaced this cycle — nothing cleared the confidence bar. {flagged.length > 0 ? 'Unverified signals below.' : 'Quiet week across the field.'}</p>
        {flagged.length > 0 && <FlaggedPanel flagged={flagged} />}
      </div>
    );
  }

  const s = stories[i];
  const last = i === stories.length - 1;

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-2">The Big Stories</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gr-text">Start here</h1>
        <p className="text-gr-muted mt-2">The biggest competitive moves this cycle, in order. One at a time — decide the move, then advance.</p>
      </header>

      {/* Progress dots */}
      <div className="flex items-center gap-2 mb-6">
        {stories.map((st, idx) => (
          <button
            key={st.id}
            onClick={() => setI(idx)}
            aria-label={`Story ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-8 bg-gr-accent' : 'w-4 bg-gr-raised hover:bg-gr-border'}`}
          />
        ))}
        <span className="ml-auto text-xs text-gr-subtle font-mono">Story {i + 1} of {stories.length}</span>
      </div>

      {/* Story card */}
      <section className="bg-gr-surface border border-gr-border rounded-lg p-6 md:p-8 min-h-[340px] flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-5xl font-extrabold text-gr-accent leading-none">{s.rank}</span>
          <div>
            <span className="px-2 py-0.5 rounded bg-gr-raised text-gr-muted text-[10px] font-bold uppercase tracking-[0.1em]">{s.pillar}</span>
            {s.confidence && (
              <span className={`ml-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-[0.1em] ${CONF_STYLE[s.confidence] || ''}`}>{s.confidence} confidence</span>
            )}
            <div className="text-[11px] text-gr-subtle mt-1 uppercase tracking-wider">{TYPE_LABEL[s.type] || s.type}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-[10px] text-gr-subtle uppercase tracking-wider">Magnitude</div>
            <div className="w-24 h-1.5 bg-gr-raised rounded mt-1"><div className="h-1.5 bg-gr-accent rounded" style={{ width: `${s.magnitude}%` }} /></div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gr-text mb-3">{s.headline}</h2>
        <p className="text-gr-muted leading-relaxed mb-3">{s.detail}</p>
        {s.confidence_note && (
          <p className="text-xs text-gr-subtle mb-4 leading-relaxed"><span className="uppercase tracking-wider font-semibold">Confidence:</span> {s.confidence_note}{s.signals && s.signals.length > 0 ? ` · source: ${s.signals.join(', ')}` : ''}</p>
        )}

        {s.vs_us && (
          <div className="mb-4 border border-gr-border rounded p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gr-subtle mb-1">Where we stand</p>
            <p className="text-gr-muted text-sm leading-relaxed">{s.vs_us}</p>
          </div>
        )}

        <div className="mt-auto bg-gr-raised/60 border-l-2 border-gr-accent rounded p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gr-accent mb-1">The Move</p>
          <p className="text-gr-text text-sm leading-relaxed">{s.move}</p>
        </div>
      </section>

      {/* Nav */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setI((n) => Math.max(n - 1, 0))}
          disabled={i === 0}
          className="px-4 py-2 rounded bg-gr-surface border border-gr-border text-gr-muted text-sm font-semibold disabled:opacity-40 hover:text-gr-text"
        >
          ← Back
        </button>
        {last ? (
          <a href="/paper" className="px-5 py-2 rounded bg-gr-accent text-gr-text text-sm font-bold uppercase tracking-wider">
            Read the full report →
          </a>
        ) : (
          <button
            onClick={() => setI((n) => Math.min(n + 1, stories.length - 1))}
            className="px-5 py-2 rounded bg-gr-accent text-gr-text text-sm font-bold uppercase tracking-wider"
          >
            Next story →
          </button>
        )}
      </div>
      <p className="text-center text-[11px] text-gr-subtle mt-4">Use ← / → arrow keys to move through the stories.</p>

      {flagged.length > 0 && <div className="mt-10"><FlaggedPanel flagged={flagged} /></div>}
    </div>
  );
}

function FlaggedPanel({ flagged }: { flagged: Story[] }) {
  return (
    <section className="border border-dashed border-gr-border rounded-lg p-5">
      <p className="text-gr-subtle font-bold text-[11px] uppercase tracking-[0.2em] mb-1">Flagged for verification ({flagged.length})</p>
      <p className="text-gr-subtle text-xs mb-4">Signals we saw but do not trust yet — likely artifacts or low-base noise. Not presented as fact; verify before acting.</p>
      <div className="divide-y divide-gr-border/50">
        {flagged.map((s) => (
          <div key={s.id} className="py-3">
            <p className="text-gr-muted text-sm font-medium">{s.headline}</p>
            <p className="text-gr-subtle text-xs mt-0.5">{s.confidence_note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
