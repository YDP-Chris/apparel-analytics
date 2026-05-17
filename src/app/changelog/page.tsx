'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Commit {
  sha: string;
  sha_full: string;
  timestamp: string;
  subject: string;
}

interface ChangelogEntry {
  date: string;
  headline: string | null;
  story_count: number;
  commits: Commit[];
  commit_count: number;
  new_pages: string[];
}

interface ChangelogPayload {
  available: boolean;
  as_of: string;
  window: { since: string | null; default_window_days: number };
  git_error: string | null;
  entries: ChangelogEntry[];
  summary: {
    days_with_activity: number;
    total_commits: number;
    total_pages_shipped: number;
    biggest_shipping_day: { date: string | null; commit_count: number };
  };
  error?: string;
}

function fmtAgo(iso: string | null | undefined): string {
  if (!iso) return "n/a";
  try {
    const ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms)) return iso;
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return iso || "n/a";
  }
}

function fmtDayHeader(d: string): string {
  // d = YYYY-MM-DD. Render as "May 16, 2026 (Sat)" without timezone shenanigans.
  try {
    const [y, m, day] = d.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !day) return d;
    const dt = new Date(Date.UTC(y, m - 1, day));
    const month = dt.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const weekday = dt.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" });
    return `${month} ${day}, ${y} (${weekday})`;
  } catch {
    return d;
  }
}

function isTodayStr(d: string): boolean {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return d === `${yyyy}-${mm}-${dd}`;
}

function readSinceParam(): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  return (url.searchParams.get("since") || "").trim();
}

export default function ChangelogPage() {
  const [data, setData] = useState<ChangelogPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinceInput, setSinceInput] = useState<string>("");

  useEffect(() => {
    setSinceInput(readSinceParam());
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) {
      setError("Sign in via /today first.");
      setLoading(false);
      return;
    }
    const since = readSinceParam();
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    setLoading(true);
    fetch(`${PULSE_API}/pulse/changelog${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: ChangelogPayload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const totalEntries = useMemo(() => data?.entries.length ?? 0, [data]);

  const applySince = (next: string) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("since", next);
    else url.searchParams.delete("since");
    window.location.href = url.toString();
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading changelog...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data) return <div className="text-center py-20 text-gr-subtle">No data.</div>;

  const summary = data.summary;
  const biggest = summary.biggest_shipping_day;
  const windowSince = data.window.since;

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Cross-cutting &middot; Changelog
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What shipped, day by day
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          Auto-derived release log. Each row is one day: the daily digest headline if Claude wrote one,
          plus the actual commits that landed. The dashboard self-documents.
        </p>
        <p className="text-xs text-gr-subtle mt-2 tabular-nums">
          As of {data.as_of} &middot; {totalEntries} day{totalEntries === 1 ? "" : "s"} shown
          {windowSince ? ` (since ${windowSince})` : " (last 30 days)"}
        </p>
      </header>

      <SectionExplainer
        what="Joins gymreapers_competitive.daily_digests (the morning what-to-know-today brief) against the git log of the apparel-analytics dashboard repo. One row per calendar day."
        howToRead="Headline is from the daily digest agent if it ran that morning - if no headline, only commits landed. New pages are scraped from commit subjects via regex on /route patterns. Commits already exclude merges."
        whatToDo="Skim the latest few days to see what's new without reading every PR. Use the date filter to scope to a release window. If a commit subject looks important and you want detail, copy the short SHA into git log."
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Days with activity</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{summary.days_with_activity}</div>
          <div className="text-xs text-gr-muted mt-1">in the visible window</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Total commits</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{summary.total_commits}</div>
          <div className="text-xs text-gr-muted mt-1">excluding merges</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Pages shipped</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{summary.total_pages_shipped}</div>
          <div className="text-xs text-gr-muted mt-1">unique /routes mentioned in subjects</div>
        </div>
        <div className="bg-gr-surface rounded-md border border-gr-border p-5">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Biggest shipping day</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{biggest.commit_count}</div>
          <div className="text-xs text-gr-muted mt-1 tabular-nums">
            {biggest.date ? fmtDayHeader(biggest.date) : "none yet"}
          </div>
        </div>
      </section>

      {/* Filter */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] uppercase tracking-wider font-bold text-gr-subtle mr-1">Filter</span>
          <label className="text-xs text-gr-muted">Since</label>
          <input
            type="date"
            value={sinceInput}
            onChange={(e) => setSinceInput(e.target.value)}
            className="px-3 py-1.5 rounded text-sm bg-gr-bg border border-gr-border text-gr-text focus:outline-none focus:border-gr-accent"
          />
          <button
            type="button"
            onClick={() => applySince(sinceInput)}
            className="px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider bg-gr-accent/15 text-gr-accent hover:bg-gr-accent/25"
          >
            Apply
          </button>
          {(sinceInput || windowSince) && (
            <button
              type="button"
              onClick={() => { setSinceInput(""); applySince(""); }}
              className="px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border border-gr-border text-gr-muted hover:text-gr-text"
            >
              Clear
            </button>
          )}
          {data.git_error && (
            <span className="ml-auto text-xs text-gr-warning">
              git log warning: {data.git_error}
            </span>
          )}
        </div>
      </section>

      {/* Timeline */}
      <section>
        <h2 className="text-2xl font-bold text-gr-text mb-4">Release timeline</h2>
        {data.entries.length === 0 ? (
          <div className="bg-gr-surface rounded-md border border-gr-border p-10 text-center text-sm text-gr-muted">
            No activity in the visible window.
          </div>
        ) : (
          <div className="space-y-5">
            {data.entries.map((entry) => {
              const isToday = isTodayStr(entry.date);
              return (
                <article
                  key={entry.date}
                  className={`bg-gr-surface rounded-md border p-5 ${
                    isToday ? "border-gr-accent/60" : "border-gr-border"
                  }`}
                >
                  {/* Day header */}
                  <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <h3 className="text-lg font-bold text-gr-text tabular-nums">
                        {fmtDayHeader(entry.date)}
                      </h3>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gr-accent/15 text-gr-accent">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-3 text-xs text-gr-muted tabular-nums">
                      <span>{entry.commit_count} commit{entry.commit_count === 1 ? "" : "s"}</span>
                      {entry.new_pages.length > 0 && (
                        <span>
                          {entry.new_pages.length} page{entry.new_pages.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {entry.story_count > 0 && (
                        <span>{entry.story_count} stor{entry.story_count === 1 ? "y" : "ies"}</span>
                      )}
                    </div>
                  </div>

                  {/* Daily digest headline */}
                  {entry.headline && (
                    <div className="mb-4 pb-4 border-b border-gr-border">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">
                        Daily digest headline
                      </div>
                      <p className="text-gr-text leading-relaxed">{entry.headline}</p>
                    </div>
                  )}

                  {/* New pages */}
                  {entry.new_pages.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
                        New / touched pages
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.new_pages.map((p) => (
                          <a
                            key={p}
                            href={p}
                            className="px-2 py-0.5 rounded text-xs font-mono bg-gr-bg border border-gr-border text-gr-text hover:border-gr-accent hover:text-gr-accent"
                          >
                            {p}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Commits */}
                  {entry.commits.length === 0 ? (
                    <div className="text-xs text-gr-subtle italic">
                      No commits this day - digest only.
                    </div>
                  ) : (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">
                        Commits
                      </div>
                      <ul className="divide-y divide-gr-border">
                        {entry.commits.map((c) => (
                          <li key={c.sha_full} className="py-1.5 flex items-baseline gap-3 text-sm">
                            <code className="text-[11px] font-mono text-gr-subtle tabular-nums shrink-0">
                              {c.sha}
                            </code>
                            <span className="text-gr-text flex-1 break-words">{c.subject}</span>
                            <span className="text-[11px] text-gr-subtle tabular-nums shrink-0">
                              {fmtAgo(c.timestamp)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
