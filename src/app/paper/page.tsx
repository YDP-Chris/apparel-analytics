'use client';

/**
 * /paper — the team newspaper ("Field Report") as a dashboard page. Reads the
 * latest issue published by competitive-intel/monday_email.py --team from the
 * Pi (/pulse/newspaper/latest). This is the permanent, always-current mirror
 * of the Monday email.
 */

import { useEffect, useState } from 'react';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Row {
  slug: string; name: string; currency?: string;
  styles?: number | null; colors_per_style?: number | null;
  extended_pct?: number | null; avg_price?: number | null; has_data?: boolean; catalog?: boolean;
}
interface Mover { slug: string; name: string; wow: number; current?: number }
interface Issue {
  generated_at: string; week_of: string; masthead?: string; subtitle?: string;
  data: {
    vision?: { ambition: string; kpis: string[] };
    gr_reality?: string;
    big_stories?: { rank: number; headline: string; detail: string; pillar?: string; vs_us?: string | null; move: string; confidence?: string; confidence_note?: string | null }[];
    flagged_stories?: { headline: string; confidence_note?: string | null }[];
    one_to_watch?: { headline: string; body: string; pillar?: string };
    scorecard?: { title: string; rows: Row[] }[];
    shipping?: { slug: string; name: string; count: number }[];
    trend_line?: { risers: Mover[]; fallers: Mover[] };
    price_watch?: { slug: string; name: string; avg: number }[];
  };
}

const sym = (c?: string) => ({ USD: '$', GBP: '£', EUR: '€', CAD: 'C$' }[c || 'USD'] || `${c} `);
const num = (n?: number | null, d = 0) => (typeof n === 'number' ? n.toFixed(d) : 'n/a');

export default function PaperPage() {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first (open any Gymreapers page to authenticate).'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/newspaper/latest`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status === 404 ? 'No issue published yet.' : `HTTP ${r.status}`)))
      .then(setIssue)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gr-subtle">Loading…</p>;
  if (error) return <p className="text-sm text-gr-muted">{error}</p>;
  if (!issue) return null;

  const d = issue.data;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Masthead */}
      <header className="text-center pb-6 border-b-2 border-gr-accent">
        <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.3em] mb-2">Gymreapers / Field Report</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gr-text">{issue.masthead || 'The Strength & Apparel Field Report'}</h1>
        <p className="text-gr-muted mt-2">{issue.subtitle} · Week of {issue.week_of}</p>
      </header>

      {/* Toward the vision */}
      {d.vision && (
        <section className="bg-gr-surface border border-gr-border rounded p-5">
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.2em] mb-2">Toward the Vision</p>
          <p className="text-gr-text mb-3">{d.vision.ambition}</p>
          <div className="flex flex-wrap gap-2">
            {d.vision.kpis.map((k) => (
              <span key={k} className="px-2.5 py-1 rounded bg-gr-raised text-gr-muted text-xs">{k}</span>
            ))}
          </div>
        </section>
      )}

      {/* The Big Stories — decision-grade, confidence-gated */}
      {d.big_stories && d.big_stories.length > 0 ? (
        <section>
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-3">The Big Stories — decision-grade</p>
          <div className="space-y-3">
            {d.big_stories.map((s) => {
              const cc = s.confidence === 'high' ? 'text-gr-success border-gr-success' : s.confidence === 'medium' ? 'text-amber-500 border-amber-500' : 'text-gr-subtle border-gr-border';
              return (
                <div key={s.rank} className="bg-gr-surface border-l-[3px] border-gr-accent rounded p-5">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-gr-accent font-extrabold text-xl">{s.rank}</span>
                    <span className="text-gr-text font-bold text-lg">{s.headline}</span>
                    {s.pillar && <span className="ml-auto px-2 py-0.5 rounded bg-gr-raised text-gr-muted text-[10px] tracking-[0.1em] uppercase">{s.pillar}</span>}
                  </div>
                  {s.confidence && (
                    <div className="mb-2">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-[0.1em] ${cc}`}>{s.confidence} confidence</span>
                      {s.confidence_note && <span className="text-gr-subtle text-xs ml-2">{s.confidence_note}</span>}
                    </div>
                  )}
                  <p className="text-gr-muted text-sm mb-2">{s.detail}</p>
                  {s.vs_us && <p className="text-gr-subtle text-sm mb-2"><span className="text-gr-muted font-semibold">Where we stand.</span> {s.vs_us}</p>}
                  <p className="text-gr-text text-sm"><span className="font-semibold">Move.</span> {s.move}</p>
                </div>
              );
            })}
          </div>
          <a href="/stories" className="inline-block mt-3 text-gr-accent text-sm font-semibold hover:underline">Walk through them one at a time →</a>

          {d.flagged_stories && d.flagged_stories.length > 0 && (
            <div className="mt-5 border border-dashed border-gr-border rounded p-4">
              <p className="text-gr-subtle font-bold text-[11px] uppercase tracking-[0.2em] mb-2">Flagged for verification ({d.flagged_stories.length}) — not confirmed</p>
              <div className="divide-y divide-gr-border/50">
                {d.flagged_stories.map((s, k) => (
                  <div key={k} className="py-2">
                    <p className="text-gr-muted text-sm">{s.headline}</p>
                    <p className="text-gr-subtle text-xs mt-0.5">{s.confidence_note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : d.one_to_watch ? (
        <section className="bg-gr-surface border-l-[3px] border-gr-accent rounded p-6">
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.2em] mb-2">
            One to Watch
            {d.one_to_watch.pillar && (
              <span className="ml-2 px-2 py-0.5 rounded bg-gr-raised text-gr-muted text-[10px] tracking-[0.1em]">{d.one_to_watch.pillar}</span>
            )}
          </p>
          <h2 className="text-2xl font-bold text-gr-text mb-2">{d.one_to_watch.headline}</h2>
          <p className="text-gr-muted leading-relaxed">{d.one_to_watch.body}</p>
        </section>
      ) : null}

      {/* Scorecard groups */}
      {(d.scorecard || []).map((g) => (
        <section key={g.title}>
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-3">Scorecard — {g.title}</p>
          <div className="bg-gr-surface border border-gr-border rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gr-raised text-gr-muted">
                  {['Brand', 'Styles', 'Colors', '2XL+', 'Avg'].map((h, i) => (
                    <th key={h} className={`px-3 py-2 text-[11px] uppercase tracking-wider font-bold ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.slug} className="border-t border-gr-border/50">
                    <td className="px-3 py-2 text-gr-text font-medium">
                      {r.name}
                      {r.catalog && <span className="text-gr-accent"> *</span>}
                      {r.currency && r.currency !== 'USD' && <span className="ml-1.5 text-[10px] text-gr-subtle">{r.currency}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gr-text">{r.styles ?? <span className="text-gr-subtle">n/a</span>}</td>
                    <td className="px-3 py-2 text-right text-gr-text">{num(r.colors_per_style, 1)}</td>
                    <td className="px-3 py-2 text-right text-gr-text">{typeof r.extended_pct === 'number' ? `${r.extended_pct.toFixed(0)}%` : 'n/a'}</td>
                    <td className="px-3 py-2 text-right text-gr-text">{typeof r.avg_price === 'number' ? `${sym(r.currency)}${r.avg_price.toFixed(0)}` : 'n/a'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {(d.scorecard || []).some((g) => g.rows.some((r) => r.catalog)) && (
        <p className="text-xs text-gr-subtle -mt-6">
          <span className="text-gr-accent">*</span> GR row from our master SKU catalog (active styles + avg MSRP). Peer rows from scraped storefronts — not a like-for-like count.
        </p>
      )}

      {/* What shipped */}
      {d.shipping && d.shipping.length > 0 && (
        <section>
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-3">What Shipped This Week</p>
          <div className="bg-gr-surface border border-gr-border rounded divide-y divide-gr-border/50">
            {d.shipping.map((r) => (
              <div key={r.slug} className="flex justify-between px-4 py-2.5">
                <span className="text-gr-text">{r.name}</span>
                <span className="text-gr-success font-bold">+{r.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trend line */}
      {d.trend_line && (d.trend_line.risers.length > 0 || d.trend_line.fallers.length > 0) && (
        <section>
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-3">Trend Line — Search, Week over Week</p>
          <div className="flex flex-wrap gap-2">
            {d.trend_line.risers.map((m) => (
              <span key={m.slug} className="px-3 py-1.5 rounded bg-gr-surface border border-gr-border text-gr-success text-sm">▲ {m.name} {m.wow >= 0 ? '+' : ''}{m.wow.toFixed(0)}%</span>
            ))}
            {d.trend_line.fallers.map((m) => (
              <span key={m.slug} className="px-3 py-1.5 rounded bg-gr-surface border border-gr-border text-gr-accent text-sm">▼ {m.name} {m.wow.toFixed(0)}%</span>
            ))}
          </div>
        </section>
      )}

      {/* Price watch */}
      {d.price_watch && d.price_watch.length > 0 && (
        <section>
          <p className="text-gr-accent font-bold text-[11px] uppercase tracking-[0.25em] mb-3">Price Watch — Avg Style (USD field)</p>
          <div className="bg-gr-surface border border-gr-border rounded p-4 space-y-2">
            {d.price_watch.map((r) => {
              const mx = Math.max(...d.price_watch!.map((x) => x.avg), 1);
              return (
                <div key={r.slug}>
                  <div className="flex justify-between text-sm text-gr-text"><span>{r.name}</span><span>${r.avg.toFixed(0)}</span></div>
                  <div className="h-1.5 bg-gr-raised rounded mt-1"><div className="h-1.5 bg-gr-accent rounded" style={{ width: `${(r.avg / mx) * 100}%` }} /></div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <footer className="pt-6 border-t border-gr-border text-xs text-gr-subtle flex items-center justify-between">
        <span>Data freshness: {issue.generated_at}</span>
        <a href="/exec-brief" className="text-gr-accent hover:underline">Exec summary →</a>
      </footer>
    </div>
  );
}
