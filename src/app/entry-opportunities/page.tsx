'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { trackEvent } from '@/lib/usage';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface PeerProductEvidence {
  handle: string | null;
  name: string | null;
  review_count: number | null;
  avg_rating: number | null;
  category: string | null;
  subcategory: string | null;
}

interface Evidence {
  gr_cluster?: { id: number; label: string };
  peer_cluster?: { id: number; label: string; brand: string };
  overlap_score?: number;
  overlap_reasoning?: string | null;
  shared_phrases?: string[];
  gr_sku_count?: number;
  peer_top_products?: PeerProductEvidence[];
  score_components?: {
    overlap_points?: number;
    peer_size_points?: number;
    gr_deficit_points?: number;
  };
}

interface Opportunity {
  id: number;
  score: number;
  peer_brand: string;
  peer_brand_name: string;
  recommended_category: string;
  recommended_subcategory: string | null;
  rationale: string | null;
  gymreapers_cluster_id: number | null;
  gymreapers_cluster_label: string | null;
  peer_cluster_id: number | null;
  peer_cluster_label: string | null;
  evidence: Evidence;
  computed_at: string | null;
}

interface Payload {
  available: boolean;
  reason?: string;
  opportunities: Opportunity[];
  kpis: {
    top_score: number | null;
    recommendation_count: number;
    category_count: number;
    peer_brand_count: number;
  };
  peer_brands: string[];
  categories: string[];
  brand_names: Record<string, string>;
  computed_at: string | null;
}

function prettyCat(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ');
}

export default function EntryOpportunitiesPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [peerFilter, setPeerFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    fetch(`${PULSE_API}/pulse/entry-opportunities`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j: Payload) => setData(j))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const all = data?.opportunities ?? [];
    return all.filter((o) => {
      if (peerFilter && o.peer_brand !== peerFilter) return false;
      if (categoryFilter && o.recommended_category !== categoryFilter) return false;
      return true;
    });
  }, [data, peerFilter, categoryFilter]);

  const handlePeerToggle = (slug: string) => {
    const next = peerFilter === slug ? null : slug;
    setPeerFilter(next);
    trackEvent('click', { label: 'entry_opps_peer_filter', metadata: { peer: next } });
  };

  const handleCategoryToggle = (cat: string) => {
    const next = categoryFilter === cat ? null : cat;
    setCategoryFilter(next);
    trackEvent('click', { label: 'entry_opps_category_filter', metadata: { category: next } });
  };

  if (loading) return <div className="text-center py-20 text-gr-subtle">Synthesizing entry opportunities...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;
  if (!data?.available) {
    return (
      <div className="space-y-12">
        <HubTabs hub="play" />
      <header className="pb-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
              For Product &middot; Entry Opportunities
            </p>
            <ConfidenceBadge source="composite" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
            What to enter next, in customer voice
          </h1>
        </header>
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            No synthesis yet
          </p>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            {data?.reason || 'The cluster-synthesis agent has not produced any entry_opportunities rows yet.'}
            <br />
            Run it manually with{' '}
            <code className="bg-gr-bg px-1.5 py-0.5 rounded">
              cd /mnt/data/agents/cluster-synthesis &amp;&amp; python3 main.py
            </code>
          </p>
        </section>
      </div>
    );
  }

  const opps = data.opportunities;
  const kpis = data.kpis;

  return (
    <div className="space-y-12">
      <HubTabs hub="play" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product &middot; Entry Opportunities
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What to enter next, in customer voice
        </h1>
        <p className="text-gr-muted mt-4 max-w-3xl text-lg leading-relaxed">
          We started with the 38 emergent customer-voice clusters Claude found across five brands.
          Wherever a Gymreapers cluster sounds like a peer cluster in another brand, we look at
          what THAT cluster actually buys at that peer, then check if Gymreapers has a SKU there
          yet. When the SKU shelf is empty and the voice match is strong, it shows up below.
        </p>
        <p className="text-gr-subtle mt-2 text-sm">
          Internal &middot; cluster synthesis &middot; {opps.length} recommendations &middot; refreshed {data.computed_at?.slice(0, 10) || 'today'}
        </p>
      </header>

      <SectionExplainer
        what="Each card is a (Gymreapers cluster, peer cluster) match scored 0-100. Overlap (40 pts) = how similar the two voice clusters are. Peer cluster size (20 pts) = how many reviews back the peer cluster up. GR deficit (40 pts) = 40 if Gymreapers has zero SKUs in that category today, dropping to 0 by 3+ SKUs."
        howToRead="Sorted by score. The rationale paragraph names the shared customer behavior. Peer top products are the actual handles those customers review at the peer brand. Filter by peer brand or category to drill in."
        whatToDo="The top 5 are the cleanest 'a customer who already trusts us is buying THIS at a competitor and we do not sell anything close' bets. Read the rationale, then pull the peer products list to see what shape the category actually takes there."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Top score</div>
          <div className="text-3xl font-bold text-gr-accent tabular-nums">
            {kpis.top_score !== null ? Math.round(kpis.top_score) : '-'}
          </div>
          <div className="text-xs text-gr-subtle mt-1">out of 100</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Recommendations</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.recommendation_count}</div>
          <div className="text-xs text-gr-subtle mt-1">scored candidates</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Categories</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.category_count}</div>
          <div className="text-xs text-gr-subtle mt-1">distinct entry lanes</div>
        </div>
        <div className="bg-gr-surface border border-gr-border rounded-md p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">Peer brands</div>
          <div className="text-3xl font-bold text-gr-text tabular-nums">{kpis.peer_brand_count}</div>
          <div className="text-xs text-gr-subtle mt-1">contributing evidence</div>
        </div>
      </section>

      <section className="bg-gr-surface border border-gr-border rounded-md p-5 space-y-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filter by peer brand</div>
          <div className="flex flex-wrap gap-2">
            {data.peer_brands.map((slug) => {
              const active = peerFilter === slug;
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => handlePeerToggle(slug)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition ${active ? 'bg-gr-accent text-gr-text' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
                >
                  {data.brand_names[slug] || slug}
                </button>
              );
            })}
            {peerFilter ? (
              <button
                type="button"
                onClick={() => setPeerFilter(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-gr-raised text-gr-subtle hover:text-gr-text"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-2">Filter by category</div>
          <div className="flex flex-wrap gap-2">
            {data.categories.map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryToggle(cat)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition ${active ? 'bg-gr-accent text-gr-text' : 'bg-gr-raised text-gr-muted hover:text-gr-text'}`}
                >
                  {prettyCat(cat)}
                </button>
              );
            })}
            {categoryFilter ? (
              <button
                type="button"
                onClick={() => setCategoryFilter(null)}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-gr-raised text-gr-subtle hover:text-gr-text"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gr-text tracking-tight">Ranked recommendations</h2>
          <p className="text-xs text-gr-subtle">{filtered.length} shown</p>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-gr-surface border border-gr-border rounded-md p-10 text-center text-gr-subtle">
            No recommendations match the current filters.
          </div>
        ) : null}

        {filtered.map((o, idx) => {
          const grSku = o.evidence?.gr_sku_count ?? null;
          const overlap = o.evidence?.overlap_score ?? null;
          const isTop5 = idx < 5 && !peerFilter && !categoryFilter;
          return (
            <article
              key={o.id}
              className={`rounded-md border p-5 transition ${isTop5 ? 'bg-gr-accent-soft border-gr-accent/40 ring-1 ring-gr-accent/30' : 'bg-gr-surface border-gr-border'}`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex items-baseline gap-3 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle tabular-nums">
                    #{idx + 1}
                  </span>
                  <h3 className="text-lg font-bold text-gr-text capitalize">
                    {prettyCat(o.recommended_category)}
                    {o.recommended_subcategory ? (
                      <span className="text-gr-muted font-normal ml-2 text-base">/ {prettyCat(o.recommended_subcategory)}</span>
                    ) : null}
                  </h3>
                </div>
                <div className="flex items-baseline gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Score</div>
                    <div className="text-2xl font-bold text-gr-accent tabular-nums leading-none">
                      {Math.round(o.score)}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gr-muted mb-3 leading-relaxed">
                <span className="font-semibold text-gr-text">{o.gymreapers_cluster_label || 'Gymreapers cluster'}</span>
                <span className="text-gr-subtle"> overlaps with </span>
                <span className="font-semibold text-gr-text">{o.peer_cluster_label || 'peer cluster'}</span>
                <span className="text-gr-subtle"> at {o.peer_brand_name}</span>
                {overlap !== null ? (
                  <span className="text-gr-subtle"> &middot; voice match {overlap.toFixed(2)}</span>
                ) : null}
              </p>

              {o.rationale ? (
                <p className="text-gr-text leading-relaxed mb-4">
                  {o.rationale}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 mb-3 items-center">
                <span className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gr-raised text-gr-text capitalize">
                  {prettyCat(o.recommended_category)}
                </span>
                <span className="inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gr-raised text-gr-muted">
                  peer: {o.peer_brand_name}
                </span>
                {grSku !== null ? (
                  <span className={`inline-flex items-baseline gap-1.5 px-2.5 py-1 rounded text-xs font-semibold ${grSku === 0 ? 'bg-gr-danger/15 text-gr-danger' : 'bg-gr-raised text-gr-muted'}`}>
                    GR SKUs in category: {grSku}
                  </span>
                ) : null}
              </div>

              {o.evidence?.peer_top_products && o.evidence.peer_top_products.length > 0 ? (
                <details className="text-sm">
                  <summary className="cursor-pointer text-gr-subtle hover:text-gr-text text-xs uppercase tracking-wider font-bold">
                    Peer top products ({o.evidence.peer_top_products.length})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {o.evidence.peer_top_products.map((p, i) => (
                      <li key={`${o.id}-${i}`} className="text-gr-muted text-sm">
                        <span className="text-gr-text">{p.name || p.handle || 'untitled'}</span>
                        <span className="text-gr-subtle">
                          {' '}&middot; {p.review_count ?? 0} reviews
                          {p.avg_rating !== null ? ` &middot; avg ${Number(p.avg_rating).toFixed(1)}` : ''}
                          {p.subcategory ? ` &middot; ${prettyCat(p.subcategory)}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
