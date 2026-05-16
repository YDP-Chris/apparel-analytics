'use client';

/**
 * Annotations — pin notes to any entity in the dashboard.
 *
 * Two surfaces in one component:
 *   - Existing annotations rendered as a stacked feed (with note_kind pill,
 *     timestamp, submitter)
 *   - Inline form to add a new note (collapsed by default)
 *
 * Usage:
 *   <Annotations
 *     entityKind="whitespace_query"
 *     entityKey="lifting_belt|13mm lever lifting belt"
 *     entityLabel="13mm lever lifting belt"
 *   />
 */

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';
const NAME_LS_KEY = 'ydp_inputs_submitter_name';

type NoteKind = 'comment' | 'action_taken' | 'hypothesis' | 'decision' | 'context';

interface Annotation {
  id: number;
  entity_kind: string;
  entity_key: string;
  note: string;
  note_kind: NoteKind;
  submitted_by: string | null;
  submitted_at: string;
}

const KIND_STYLES: Record<NoteKind, { bg: string; text: string; label: string }> = {
  comment:      { bg: 'bg-gr-raised',      text: 'text-gr-muted',  label: 'NOTE' },
  action_taken: { bg: 'bg-gr-success/15',  text: 'text-gr-success', label: 'ACTION' },
  hypothesis:   { bg: 'bg-gr-accent-soft', text: 'text-gr-accent', label: 'HYPOTHESIS' },
  decision:     { bg: 'bg-gr-accent/20',   text: 'text-gr-accent', label: 'DECISION' },
  context:      { bg: 'bg-gr-bg',          text: 'text-gr-subtle', label: 'CONTEXT' },
};

interface Props {
  entityKind: string;
  entityKey: string;
  entityLabel?: string;
}

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

export function Annotations({ entityKind, entityKey, entityLabel }: Props) {
  const [items, setItems] = useState<Annotation[]>([]);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [noteKind, setNoteKind] = useState<NoteKind>('comment');
  const [submitter, setSubmitter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSubmitter(localStorage.getItem(NAME_LS_KEY) || '');
    }
  }, []);

  const fetchAnnotations = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const params = new URLSearchParams({ entity_kind: entityKind, entity_key: entityKey });
    try {
      const r = await fetch(`${PULSE_API}/pulse/annotations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        setItems(j.items || []);
      }
    } catch {
      // ignore
    }
  }, [entityKind, entityKey]);

  useEffect(() => { fetchAnnotations(); }, [fetchAnnotations]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setSubmitting(true);
    setError(null);
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (submitter.trim() && typeof window !== 'undefined') {
      localStorage.setItem(NAME_LS_KEY, submitter.trim());
    }
    try {
      const r = await fetch(`${PULSE_API}/pulse/annotations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_kind: entityKind,
          entity_key: entityKey,
          note: note.trim(),
          note_kind: noteKind,
          submitted_by: submitter.trim() || undefined,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      trackEvent('submit', {
        label: `annotation:${noteKind}`,
        metadata: { entity_kind: entityKind, entity_key: entityKey, kind: noteKind },
      });
      setNote('');
      await fetchAnnotations();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((a) => {
            const s = KIND_STYLES[a.note_kind] ?? KIND_STYLES.comment;
            return (
              <div key={a.id} className="bg-gr-bg/60 rounded p-3 border border-gr-border/60">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>
                    {s.label}
                  </span>
                  <span className="text-xs text-gr-subtle">
                    {a.submitted_by ? `${a.submitted_by} · ` : ''}{fmtAgo(a.submitted_at)}
                  </span>
                </div>
                <p className="text-sm text-gr-text leading-relaxed">{a.note}</p>
              </div>
            );
          })}
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-gr-accent hover:text-gr-accent-hover font-semibold transition"
        >
          + Add a note{entityLabel ? ` to "${entityLabel}"` : ''}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2 bg-gr-bg/60 rounded p-3 border border-gr-border/60">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={noteKind}
              onChange={(e) => setNoteKind(e.target.value as NoteKind)}
              className="px-2 py-1 rounded bg-gr-surface border border-gr-border text-xs text-gr-text focus:outline-none focus:border-gr-accent"
            >
              <option value="comment">Comment</option>
              <option value="action_taken">Action taken</option>
              <option value="hypothesis">Hypothesis</option>
              <option value="decision">Decision</option>
              <option value="context">Context</option>
            </select>
            <input
              type="text"
              value={submitter}
              onChange={(e) => setSubmitter(e.target.value)}
              placeholder="Your name (optional)"
              className="flex-1 min-w-0 px-2 py-1 rounded bg-gr-surface border border-gr-border text-xs text-gr-text focus:outline-none focus:border-gr-accent"
            />
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What do you want to capture? (e.g. 'we tried this in Q2, learned X')"
            rows={3}
            className="w-full px-2 py-1.5 rounded bg-gr-surface border border-gr-border text-sm text-gr-text focus:outline-none focus:border-gr-accent"
            maxLength={2000}
          />
          <div className="flex items-center gap-2 justify-end">
            {error && <p className="text-xs text-gr-danger mr-auto">{error}</p>}
            <button
              type="button"
              onClick={() => { setOpen(false); setNote(''); setError(null); }}
              className="px-2 py-1 text-xs text-gr-muted hover:text-gr-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !note.trim()}
              className="px-3 py-1 rounded bg-gr-accent text-gr-text text-xs font-bold uppercase tracking-wider hover:bg-gr-accent-hover disabled:opacity-50 transition"
            >
              {submitting ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
