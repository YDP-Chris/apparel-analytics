'use client';

/**
 * /three-horizons — CEO conversation document, three time horizons.
 *
 * Now (next 90 days): what to ship/announce/fix this quarter.
 *   - Top reposition action (free revenue), active promos, decisions in flight,
 *     Gymreapers own TM filings signaling imminent launches.
 *
 * Next (next 365 days): what to develop next season.
 *   - Top next-SKU recs, top entry opportunities, IP coverage (REIGN/CARBON X/TERRYTRAIN),
 *     top apparel-entry candidate from whitespace+demand crossover.
 *
 * Then (1-3 years): where Gymreapers should be by 2028.
 *   - Apparel thesis statement, peer repositioning (LULU pivot), international signals,
 *     voice cluster trajectory.
 *
 * Pure assembly from existing /pulse/* endpoints. No new backend.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import HubTabs from '@/components/HubTabs';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

// ----- minimal shapes for cross-endpoint assembly -----
interface NextSku { rank: number | null; product_name: string | null; category: string | null; subcategory: string | null; score: number | null; target_cluster_label: string | null; journey_stage: string | null; }
interface NextSkusPayload { available: boolean; recommendations?: NextSku[]; }

interface EntryOpp { score: number | null; peer_brand_name: string | null; recommended_category: string | null; recommended_subcategory: string | null; rationale: string | null; gymreapers_cluster_label: string | null; }
interface EntryOppsPayload { available: boolean; opportunities?: EntryOpp[]; }

interface Reposition { sku_title: string | null; reposition_type: string; rationale: string | null; impact_score: number; confidence: string | null; target_cluster_label: string | null; }
interface RepositionPayload { available: boolean; recommendations?: Reposition[]; kpis?: { total: number; high_confidence_count: number; by_type: Record<string, number> }; }

interface Trademark { brand_slug?: string | null; mark_text: string | null; filing_date: string | null; goods_services?: string | null; }
interface TrademarksPayload { available: boolean; filings?: Trademark[]; }

interface InternationalSignal { brand_slug: string; signal_type: string; signal_value: string; country_code: string | null; first_seen: string | null; }
interface InternationalPayload { available: boolean; signals?: InternationalSignal[]; }

interface PromoSummary { brand_slug: string; promos: number; avg_disc: number; max_disc: number; }
interface PromoPayload { available: boolean; today?: PromoSummary[]; lw_summary?: { promo_skus_today: number; promo_skus_lw: number }; }

interface EarningsItem { brand_slug?: string; quote: string | null; speaker?: string | null; date?: string | null; theme?: string | null; }
interface EarningsPayload { available: boolean; highlights?: EarningsItem[]; }

interface ExecBriefPayload {
  available: boolean;
  apparel?: { top_candidate?: { subcategory: string; stage_label: string; total_score: number; peer_max_brand: string | null } | null; gr_apparel_skus?: number; top_candidate_peer_name?: string | null; };
  decisions_in_flight?: number;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '-';
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return d; }
}

function prettySub(s: string | null | undefined): string {
  if (!s) return '-';
  return s.replace(/_/g, ' ');
}

function HorizonHeader({ eyebrow, title, window, ask }: { eyebrow: string; title: string; window: string; ask: string }) {
  return (
    <header className="border-l-4 border-gr-accent pl-4 mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gr-accent">{eyebrow}</p>
      <h2 className="text-2xl font-extrabold tracking-tight text-gr-text mt-1">{title}</h2>
      <p className="text-xs text-gr-subtle mt-1">{window}</p>
      <p className="text-sm text-gr-muted mt-3 italic">The CEO ask: {ask}</p>
    </header>
  );
}

function HorizonCard({
  label,
  children,
  href,
}: {
  label: string;
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <section className="rounded-lg border border-gr-border bg-gr-card p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gr-subtle">{label}</p>
        {href && (
          <Link href={href} className="text-[11px] font-semibold uppercase tracking-wider text-gr-accent hover:text-gr-accent-hover">
            Drill in {'->'}
          </Link>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function ThreeHorizonsPage() {
  const [nextSkus, setNextSkus] = useState<NextSkusPayload | null>(null);
  const [entries, setEntries] = useState<EntryOppsPayload | null>(null);
  const [reposition, setReposition] = useState<RepositionPayload | null>(null);
  const [trademarks, setTrademarks] = useState<TrademarksPayload | null>(null);
  const [international, setInternational] = useState<InternationalPayload | null>(null);
  const [promo, setPromo] = useState<PromoPayload | null>(null);
  const [earnings, setEarnings] = useState<EarningsPayload | null>(null);
  const [execBrief, setExecBrief] = useState<ExecBriefPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    const h = { headers: { Authorization: `Bearer ${token}` } };
    const safe = <T,>(url: string, fb: T): Promise<T> =>
      fetch(url, h).then((r) => (r.ok ? (r.json() as Promise<T>) : (fb as T))).catch(() => fb);
    Promise.all([
      safe<NextSkusPayload>(`${PULSE_API}/pulse/next-skus`, { available: false }),
      safe<EntryOppsPayload>(`${PULSE_API}/pulse/entry-opportunities`, { available: false }),
      safe<RepositionPayload>(`${PULSE_API}/pulse/sku-reposition`, { available: false }),
      safe<TrademarksPayload>(`${PULSE_API}/pulse/trademarks`, { available: false }),
      safe<InternationalPayload>(`${PULSE_API}/pulse/international`, { available: false }),
      safe<PromoPayload>(`${PULSE_API}/pulse/promo`, { available: false }),
      safe<EarningsPayload>(`${PULSE_API}/pulse/earnings`, { available: false }),
      safe<ExecBriefPayload>(`${PULSE_API}/pulse/exec-brief`, { available: false }),
    ])
      .then(([sk, en, rp, tm, intl, pr, ea, eb]) => {
        setNextSkus(sk); setEntries(en); setReposition(rp); setTrademarks(tm);
        setInternational(intl); setPromo(pr); setEarnings(ea); setExecBrief(eb);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading horizons...</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;

  // ----- derived state for NOW horizon -----
  const topReposition = (reposition?.recommendations || [])
    .filter((r) => r.confidence === 'high' || (r.impact_score ?? 0) >= 70)
    .slice(0, 1)[0];
  const repositionByType = reposition?.kpis?.by_type || {};
  const repositionTotal = reposition?.kpis?.total ?? 0;
  const grOwnTms = (trademarks?.filings || []).filter((t) => (t.brand_slug || '').toLowerCase() === 'gymreapers').slice(0, 4);
  const promoToday = promo?.lw_summary?.promo_skus_today ?? null;
  const decisionsInFlight = execBrief?.decisions_in_flight ?? 0;

  // ----- derived state for NEXT horizon -----
  const topRec = (nextSkus?.recommendations || []).find((r) => r.rank === 1) || (nextSkus?.recommendations || [])[0];
  const otherRecs = (nextSkus?.recommendations || []).filter((r) => r !== topRec).slice(0, 4);
  const topEntries = (entries?.opportunities || []).slice(0, 3);
  const topCand = execBrief?.apparel?.top_candidate;

  // ----- derived state for THEN horizon -----
  // International signals (active, not gymreapers — peer expansion = competitive pressure)
  const intlPeer = (international?.signals || []).filter((s) => (s.brand_slug || '').toLowerCase() !== 'gymreapers').slice(0, 5);
  const peerPivotQuotes = (earnings?.highlights || []).slice(0, 3);

  return (
    <div className="space-y-12">
      {/* Header */}
      <HubTabs hub="play" />
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            Internal &middot; CEO Conversation
          </p>
          <ConfidenceBadge source="composite" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gr-text mb-2">
          Three horizons
        </h1>
        <p className="text-gr-muted leading-relaxed max-w-3xl">
          The CEO-facing read of where Gymreapers is now, what we&apos;re developing next, and the multi-year apparel thesis.
          Each horizon answers one ask, with supporting evidence from the live signal stack and links to drill in.
        </p>
      </header>

      <SectionExplainer
        what="Three horizons of strategic time: Now (next 90 days, committed and quick-win), Next (next season, planned launches and entries), Then (1-3 years, apparel thesis trajectory)."
        howToRead="Each section is one CEO ask. Evidence is pulled live from the underlying tools - reposition, next-skus, entry opportunities, trademarks, international, earnings."
        whatToDo="Use this page as the spine of the weekly CEO 1:1. Drill into any card to see the underlying tool."
      />

      {/* ============================================================== */}
      {/* NOW (90 days) */}
      {/* ============================================================== */}
      <section>
        <HorizonHeader
          eyebrow="Horizon 1"
          title="Now"
          window="Next 90 days &middot; committed launches, quick wins, defenses"
          ask="What do we ship, announce, or fix this quarter?"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <HorizonCard label="Free revenue inside the catalog" href="/reposition-radar">
            {topReposition ? (
              <>
                <p className="text-sm font-bold text-gr-text leading-snug">{topReposition.sku_title}</p>
                <p className="text-xs text-gr-muted leading-relaxed">{topReposition.rationale}</p>
                <div className="flex items-baseline gap-2 mt-2 text-[11px] text-gr-subtle">
                  <span className="font-bold uppercase tracking-wider text-gr-accent">{topReposition.reposition_type}</span>
                  <span>impact {Math.round(topReposition.impact_score)}</span>
                  {topReposition.target_cluster_label && (
                    <span>target: <span className="text-gr-text">{topReposition.target_cluster_label}</span></span>
                  )}
                </div>
                <p className="text-[11px] text-gr-subtle mt-3 pt-2 border-t border-gr-border/60">
                  Across the whole catalog: {repositionTotal} SKUs scored,
                  {' '}{repositionByType.rename || 0} rename, {repositionByType.remerchandise || 0} re-merchandise,
                  {' '}{repositionByType.rebundle || 0} re-bundle.
                </p>
              </>
            ) : (
              <p className="text-xs text-gr-subtle">No high-confidence reposition recommendations available.</p>
            )}
          </HorizonCard>

          <HorizonCard label="Gymreapers IP imminent" href="/trademarks">
            {grOwnTms.length > 0 ? (
              <>
                <p className="text-xs text-gr-muted leading-relaxed mb-2">
                  Filed marks signal product launches coming. Each is a name we&apos;re defending now.
                </p>
                <ul className="space-y-1.5">
                  {grOwnTms.map((t, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-bold text-gr-text">{t.mark_text || 'Unnamed mark'}</span>
                      {t.filing_date && (
                        <span className="text-[11px] text-gr-subtle ml-2">filed {fmtDate(t.filing_date.slice(0,10))}</span>
                      )}
                      {t.goods_services && (
                        <p className="text-[11px] text-gr-subtle leading-snug mt-0.5">{t.goods_services.slice(0, 90)}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs text-gr-subtle">No Gymreapers TM filings captured in the recent window.</p>
            )}
          </HorizonCard>

          <HorizonCard label="Pricing pressure right now" href="/promo-calendar">
            {promoToday != null ? (
              <>
                <div className="flex items-baseline gap-3 flex-wrap mb-2">
                  <span className="text-2xl font-bold text-gr-text tabular-nums">{promoToday}</span>
                  <span className="text-xs text-gr-muted">peer SKUs on sale today</span>
                </div>
                {(promo?.today || []).slice(0, 4).map((p) => (
                  <div key={p.brand_slug} className="text-[11px] text-gr-subtle">
                    <span className="text-gr-text font-semibold">{p.brand_slug}</span>: {p.promos} SKUs, avg {p.avg_disc}% off, max {p.max_disc}%
                  </div>
                ))}
                <p className="text-[11px] text-gr-subtle mt-3 pt-2 border-t border-gr-border/60">
                  Decisions in flight: <Link href="/log" className="text-gr-accent hover:text-gr-accent-hover font-semibold">{decisionsInFlight}</Link>
                </p>
              </>
            ) : (
              <p className="text-xs text-gr-subtle">No promo data captured.</p>
            )}
          </HorizonCard>
        </div>
      </section>

      {/* ============================================================== */}
      {/* NEXT (1 season / next 365 days) */}
      {/* ============================================================== */}
      <section>
        <HorizonHeader
          eyebrow="Horizon 2"
          title="Next"
          window="Next 365 days &middot; what we develop, who we hire, what we commit budget to"
          ask="What do we develop this season?"
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <HorizonCard label="Top next-SKU recommendation" href="/next-skus">
            {topRec ? (
              <>
                <p className="text-sm font-bold text-gr-text leading-snug">{topRec.product_name}</p>
                <p className="text-[11px] text-gr-subtle mt-1">
                  {prettySub(topRec.category)} / {prettySub(topRec.subcategory)} &middot; {topRec.journey_stage}
                </p>
                <p className="text-[11px] text-gr-muted mt-1">
                  Target voice: <span className="text-gr-text font-semibold">{topRec.target_cluster_label}</span>
                </p>
                <p className="text-2xl font-bold text-gr-text tabular-nums mt-2">{topRec.score ? Math.round(topRec.score) : '-'}</p>
                <p className="text-[9px] uppercase tracking-wider text-gr-subtle">score</p>
                {otherRecs.length > 0 && (
                  <div className="pt-3 mt-3 border-t border-gr-border/60">
                    <p className="text-[10px] uppercase tracking-wider text-gr-subtle font-bold mb-1.5">Also synthesized</p>
                    <ul className="space-y-1 text-[11px] text-gr-muted">
                      {otherRecs.map((r, i) => (
                        <li key={i}>
                          #{r.rank} {r.product_name}
                          {r.score != null && <span className="text-gr-subtle"> ({Math.round(r.score)})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gr-subtle">No next-SKU recommendations yet.</p>
            )}
          </HorizonCard>

          <HorizonCard label="Entry opportunities" href="/entry-opportunities">
            {topEntries.length > 0 ? (
              <ul className="space-y-3">
                {topEntries.map((e, i) => (
                  <li key={i} className="border-l-2 border-gr-accent/40 pl-3">
                    <p className="text-sm font-bold text-gr-text">
                      {prettySub(e.recommended_category)}
                      {e.recommended_subcategory && ` / ${prettySub(e.recommended_subcategory)}`}
                    </p>
                    <p className="text-[11px] text-gr-subtle">
                      via {e.peer_brand_name} &middot; score {Math.round(e.score || 0)}
                      {e.gymreapers_cluster_label && (
                        <span> &middot; serves <span className="text-gr-text">{e.gymreapers_cluster_label}</span></span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gr-subtle">No entry opportunities computed yet.</p>
            )}
          </HorizonCard>

          <HorizonCard label="Whitespace + demand crossover" href="/apparel-entry-candidates">
            {topCand ? (
              <>
                <p className="text-sm font-bold text-gr-text leading-snug capitalize">{prettySub(topCand.subcategory)}</p>
                <p className="text-[11px] text-gr-subtle mt-1">
                  <span className="text-gr-accent font-semibold">{topCand.stage_label}</span>
                  {' '}&middot; score <span className="tabular-nums font-bold text-gr-text">{topCand.total_score.toFixed(1)}</span> / 100
                </p>
                {topCand.peer_max_brand && (
                  <p className="text-[11px] text-gr-muted mt-2">
                    Peer leader here: <span className="text-gr-text font-semibold">{topCand.peer_max_brand}</span>. Deepest catalog in the bucket.
                  </p>
                )}
                {execBrief?.apparel?.gr_apparel_skus != null && (
                  <p className="text-[11px] text-gr-subtle mt-3 pt-2 border-t border-gr-border/60">
                    GR total apparel SKUs: <span className="text-gr-text font-bold tabular-nums">{execBrief.apparel.gr_apparel_skus}</span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gr-subtle">No top candidate available.</p>
            )}
          </HorizonCard>
        </div>
      </section>

      {/* ============================================================== */}
      {/* THEN (1-3 years) */}
      {/* ============================================================== */}
      <section>
        <HorizonHeader
          eyebrow="Horizon 3"
          title="Then"
          window="1 to 3 years out &middot; multi-year assortment thesis, brand position, defensibility"
          ask="Where is Gymreapers by 2028?"
        />

        {/* Big thesis statement */}
        <div className="rounded-lg border border-gr-accent/40 bg-gr-accent-soft/10 p-6 mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gr-accent mb-2">Apparel thesis</p>
          <p className="text-base text-gr-text leading-relaxed">
            Gymreapers stops being &quot;a knee-sleeves brand that also sells apparel.&quot; It becomes the apparel-first
            wardrobe for the strength athlete: joggers, hoodies, performance tees, lifting shorts, and sweatpants
            engineered for training, between-sets, recovery, identity, and meet-day moments. Knee sleeves, belts,
            and wraps remain the credibility backbone. Apparel becomes the volume driver and the brand-meaning carrier.
          </p>
          <p className="text-xs text-gr-muted mt-3 leading-relaxed">
            Off-thesis: yoga-specific, runway fashion, tennis, ballet. Adjacent-friendly: recovery wear,
            athleisure pieces that survive a gym session and still wear like loungewear.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HorizonCard label="Peers repositioning into our customer" href="/earnings">
            {peerPivotQuotes.length > 0 ? (
              <ul className="space-y-3">
                {peerPivotQuotes.map((q, i) => (
                  <li key={i} className="border-l-2 border-gr-accent/40 pl-3">
                    <p className="text-[13px] text-gr-text italic leading-snug">&ldquo;{q.quote}&rdquo;</p>
                    <p className="text-[10px] text-gr-subtle mt-1">
                      {[q.brand_slug, q.speaker, q.date && fmtDate(q.date.slice(0,10))].filter(Boolean).join(' &middot; ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gr-subtle">No earnings highlights captured yet. The Lululemon athletic-and-technical pivot lives here when populated.</p>
            )}
          </HorizonCard>

          <HorizonCard label="International / pre-launch motion" href="/international">
            {intlPeer.length > 0 ? (
              <ul className="space-y-2">
                {intlPeer.map((s, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-bold text-gr-text">{s.brand_slug}</span>
                    <span className="text-gr-subtle"> &middot; </span>
                    <span className="text-gr-muted">{s.signal_type}:</span>
                    <span className="text-gr-text"> {s.signal_value}</span>
                    {s.country_code && (
                      <span className="text-[10px] text-gr-subtle ml-2 bg-gr-border/40 px-1.5 py-0.5 rounded">{s.country_code}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gr-subtle">No active international signals captured.</p>
            )}
          </HorizonCard>
        </div>
      </section>

      {/* Footer prompt */}
      <footer className="rounded-lg border border-gr-border/60 bg-gr-bg/40 p-5 mt-8">
        <p className="text-xs text-gr-subtle leading-relaxed">
          The three CEO asks restated:
        </p>
        <ol className="list-decimal list-inside text-sm text-gr-text mt-2 space-y-1">
          <li><span className="font-bold">Now:</span> what do we ship, announce, or fix this quarter?</li>
          <li><span className="font-bold">Next:</span> what do we develop this season?</li>
          <li><span className="font-bold">Then:</span> where is Gymreapers by 2028?</li>
        </ol>
      </footer>
    </div>
  );
}
