'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGymreapersData } from '../gymreapers/_lib/GymreapersProvider';

const PULSE_API =
  process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface AmazonCategory {
  slug: string;
  name: string;
  organic_count: number;
  gymreapers: { present: boolean; top_rank: number | null };
  top_5: Array<{
    rank: number | null;
    asin: string;
    title: string;
    price: number | null;
    reviews: number | null;
    bought_past_month_label?: string | null;
    bought_past_month_est?: number | null;
    is_gymreapers?: boolean;
    url: string;
  }>;
  diff?: {
    movers_up: Array<{ asin: string; title: string; rank_prev: number; rank_curr: number; delta: number; url: string }>;
  };
}

interface AmazonOpportunity {
  query: string;
  category_name: string;
  total_reviews_in_top_n: number;
  avg_price: number | null;
  concentration_hhi: number;
  top_brands: Array<{ brand: string }>;
  opportunity_score: number;
}

interface AmazonPayload {
  snapshot_date: string;
  last_updated: string;
  totals: {
    categories_tracked: number;
    categories_with_gymreapers: number;
    whitespace_gaps: number;
  };
  categories: AmazonCategory[];
  top_opportunities: AmazonOpportunity[];
}

function fmtDate(d: string | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  return `$${p.toFixed(0)}`;
}

interface QaPayload {
  available: boolean;
  status_color?: 'green' | 'yellow' | 'red';
  fail_count?: number;
  warn_count?: number;
  finished_at?: string;
  findings?: Array<{
    check_name: string;
    scope: string;
    severity: 'PASS' | 'WARN' | 'FAIL';
    message: string;
  }>;
}

export default function TodayPage() {
  const { data: comp } = useGymreapersData();
  const [amz, setAmz] = useState<AmazonPayload | null>(null);
  const [qa, setQa] = useState<QaPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    fetch(`${PULSE_API}/pulse/amazon`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setAmz(j))
      .catch((e) => setError(String(e)));
    // Fetch QA status with a 1s timeout so a slow QA endpoint never degrades
    // the page it's protecting (per the Plan agent's last guardrail).
    const qaController = new AbortController();
    const qaTimeout = setTimeout(() => qaController.abort(), 1500);
    fetch(`${PULSE_API}/pulse/qa`, { headers: { Authorization: `Bearer ${token}` }, signal: qaController.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setQa(j))
      .catch(() => {})
      .finally(() => clearTimeout(qaTimeout));
  }, []);

  if (!comp && !amz) {
    return <div className="text-center py-20 text-gr-subtle">Loading today&apos;s brief…</div>;
  }

  // === Compute the curated insights ===

  // 1. Where we're WINNING — Amazon categories where Gymreapers/Victory Grips
  //    ranks in the top 5
  const wins = (amz?.categories || [])
    .filter((c) => c.gymreapers.present && (c.gymreapers.top_rank ?? 999) <= 5)
    .sort((a, b) => (a.gymreapers.top_rank || 999) - (b.gymreapers.top_rank || 999))
    .slice(0, 5);

  // 2. Where we're VULNERABLE — categories where competitors have rising
  //    rank movers (gainers) and Gymreapers is also present (real competitive
  //    threat), or categories where we're absent
  const vulnerabilities: Array<{ name: string; reason: string; href: string }> = [];
  for (const c of amz?.categories || []) {
    if (!c.gymreapers.present && c.organic_count >= 30) {
      vulnerabilities.push({
        name: c.name,
        reason: `Absent from top 100, ${c.organic_count} organic listings — competitor space`,
        href: '/gymreapers/amazon',
      });
    } else if (c.diff?.movers_up?.[0] && c.diff.movers_up[0].delta >= 10) {
      const mover = c.diff.movers_up[0];
      vulnerabilities.push({
        name: c.name,
        reason: `Competitor jumped ${mover.delta} spots: ${mover.title.slice(0, 50)}`,
        href: '/gymreapers/amazon',
      });
    }
  }
  const topVulns = vulnerabilities.slice(0, 4);

  // 3. Biggest opportunity — top whitespace gap (if data exists)
  const topOpp = (amz?.top_opportunities || []).find(
    (o) => o.total_reviews_in_top_n > 0,
  );

  // 4. Competitor moves — recent launches across non-Gymreapers brands
  const recentLaunches = (comp?.launchesSection?.recentDrops || [])
    .filter((d) => d.brand !== 'gymreapers')
    .slice(0, 5);

  // 5. Trends — top brand by WoW change
  const trendList = Object.entries(comp?.trends || {})
    .map(([slug, t]) => ({
      slug,
      name: comp?.brand_names[slug] || slug,
      ...t,
    }))
    .filter((t) => typeof t.wow_change === 'number');
  const topTrendUp = trendList.sort((a, b) => (b.wow_change || 0) - (a.wow_change || 0))[0];
  const topTrendDown = trendList.sort((a, b) => (a.wow_change || 0) - (b.wow_change || 0))[0];

  return (
    <div className="space-y-8">
      {/* DATA-QA STATUS BANNER — bold red on FAIL, bold yellow on WARN, hidden on green. */}
      {qa && qa.available && qa.status_color !== 'green' && (
        <section
          className={`rounded-md p-5 border-2 font-semibold ${
            qa.status_color === 'red'
              ? 'bg-gr-danger/15 border-gr-danger text-gr-text'
              : 'bg-gr-accent-soft border-gr-accent text-gr-text'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`text-3xl ${qa.status_color === 'red' ? 'animate-pulse' : ''}`}>
              {qa.status_color === 'red' ? '⚠' : '⚠'}
            </div>
            <div className="flex-1">
              <div className={`text-lg font-bold uppercase tracking-wider ${
                qa.status_color === 'red' ? 'text-gr-danger' : 'text-gr-accent'
              }`}>
                {qa.status_color === 'red'
                  ? `${qa.fail_count} data integrity FAIL — read carefully`
                  : `${qa.warn_count} data warning${(qa.warn_count || 0) > 1 ? 's' : ''} — heads up`}
              </div>
              <div className="text-sm mt-1 leading-relaxed">
                The dashboard is still showing the latest data we have, but some of it may be stale
                or incomplete. Verify any number before acting on it.
              </div>
              {(qa.findings || []).slice(0, 5).map((f, i) => (
                <div key={i} className="text-sm mt-2 font-mono">
                  <span className={`font-bold ${f.severity === 'FAIL' ? 'text-gr-danger' : 'text-gr-accent'}`}>
                    [{f.severity}]
                  </span>{' '}
                  <code className="text-xs">{f.scope}</code> — {f.message}
                </div>
              ))}
              {(qa.findings || []).length > 5 && (
                <div className="text-xs mt-2 text-gr-muted">
                  +{qa.findings!.length - 5} more · see /data-explorer for the full QA history
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <header className="bg-gradient-to-r from-gr-accent-soft to-gr-raised border border-gr-accent-soft rounded-md p-6">
        <div className="flex items-baseline justify-between mb-1">
          <div className="text-xs text-gr-subtle uppercase tracking-wider font-semibold">Today&apos;s brief</div>
          {qa && qa.available && qa.status_color === 'green' && (
            <div className="text-xs text-gr-success font-semibold uppercase tracking-wider">
              ✓ All data fresh
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gr-text mt-1">{fmtDate(amz?.snapshot_date || comp?.generated_at?.slice(0, 10))}</h1>
        <p className="text-gr-muted mt-2">
          The 3-5 things to know across the Gymreapers competitive set. Built for marketing and
          product to scan in under a minute — drill into the audience tabs above for depth.
        </p>
      </header>

      {error && (
        <div className="bg-gr-surface border border-gr-danger rounded p-4 text-sm text-gr-danger">
          Amazon data unavailable: {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Where we're winning */}
        <section className="bg-gr-surface rounded-md p-6 border border-gr-border">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-gr-text">Where we&apos;re winning</h2>
            <span className="text-xs text-gr-success font-semibold">{wins.length} wins</span>
          </div>
          {wins.length === 0 ? (
            <p className="text-sm text-gr-muted">No top-5 positions in today&apos;s Amazon snapshot.</p>
          ) : (
            <ul className="space-y-2">
              {wins.map((w) => (
                <li key={w.slug} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-gr-text">{w.name}</span>
                  <span className="text-gr-accent font-bold">#{w.gymreapers.top_rank}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/gymreapers/amazon" className="block mt-4 text-xs text-gr-accent hover:underline">
            See all positions →
          </Link>
        </section>

        {/* Where we're vulnerable */}
        <section className="bg-gr-surface rounded-md p-6 border border-gr-border">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-gr-text">Where we&apos;re vulnerable</h2>
            <span className="text-xs text-gr-danger font-semibold">{topVulns.length} flagged</span>
          </div>
          {topVulns.length === 0 ? (
            <p className="text-sm text-gr-muted">No critical vulnerabilities flagged today.</p>
          ) : (
            <ul className="space-y-3">
              {topVulns.map((v, i) => (
                <li key={i}>
                  <Link href={v.href} className="block hover:bg-gr-bg rounded p-2 -m-2">
                    <div className="text-sm font-semibold text-gr-text">{v.name}</div>
                    <div className="text-xs text-gr-muted mt-0.5">{v.reason}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Biggest opportunity */}
      {topOpp && (
        <section className="bg-gradient-to-br from-gr-bg to-gr-surface rounded-md p-6 border-l-4 border-gr-accent border-y border-r border-gr-border">
          <div className="text-xs text-gr-accent uppercase tracking-wider font-bold mb-2">Biggest opportunity</div>
          <h2 className="text-2xl font-bold text-gr-text mb-3">&ldquo;{topOpp.query}&rdquo;</h2>
          <p className="text-sm text-gr-muted mb-4">
            In <span className="font-semibold text-gr-text">{topOpp.category_name}</span> —{' '}
            <span className="text-gr-text font-semibold">{topOpp.total_reviews_in_top_n.toLocaleString()}</span> reviews
            across the top 20, avg price <span className="text-gr-text font-semibold">{fmtPrice(topOpp.avg_price)}</span>,
            top brand: <span className="text-gr-text font-semibold">{topOpp.top_brands[0]?.brand || '?'}</span>.
            {topOpp.concentration_hhi < 0.25 && ' Fragmented competition — room to enter.'}
          </p>
          <Link href="/gymreapers/amazon" className="text-sm text-gr-accent hover:underline font-semibold">
            See all whitespace opportunities →
          </Link>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Competitor moves */}
        <section className="bg-gr-surface rounded-md p-6 border border-gr-border">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-gr-text">Competitor moves</h2>
            <Link href="/gymreapers/launches" className="text-xs text-gr-accent hover:underline">All launches →</Link>
          </div>
          {recentLaunches.length === 0 ? (
            <p className="text-sm text-gr-muted">No recent competitor launches detected.</p>
          ) : (
            <ul className="space-y-2">
              {recentLaunches.map((l, i) => (
                <li key={i} className="text-sm">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-gr-bg rounded p-2 -m-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-gr-accent text-xs font-bold">{l.brandName}</span>
                      <span className="text-xs text-gr-subtle">{l.date}</span>
                    </div>
                    <div className="text-gr-text mt-0.5">{l.product_name || l.url.slice(0, 60)}</div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Search interest */}
        <section className="bg-gr-surface rounded-md p-6 border border-gr-border">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-bold text-gr-text">Search interest (brand WoW)</h2>
            <Link href="/for-marketing/trending" className="text-xs text-gr-accent hover:underline">Category terms →</Link>
          </div>
          {topTrendUp && topTrendUp.wow_change !== undefined && topTrendUp.wow_change !== null && (
            <div className="mb-3">
              <div className="text-xs text-gr-subtle">Biggest riser</div>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gr-text">{topTrendUp.name}</span>
                <span className="text-gr-success font-bold">+{topTrendUp.wow_change.toFixed(1)}%</span>
              </div>
            </div>
          )}
          {topTrendDown && topTrendDown.wow_change !== undefined && topTrendDown.wow_change !== null && topTrendDown.slug !== topTrendUp?.slug && (
            <div>
              <div className="text-xs text-gr-subtle">Biggest faller</div>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gr-text">{topTrendDown.name}</span>
                <span className="text-gr-danger font-bold">{topTrendDown.wow_change.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="text-xs text-gr-subtle text-center pt-4 border-t border-gr-border">
        Snapshot {fmtDate(amz?.snapshot_date)} · Updated {amz?.last_updated ? new Date(amz.last_updated).toLocaleString() : '—'}
      </div>
    </div>
  );
}
