'use client';

import { useEffect, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { trackEvent } from '@/lib/usage';

const PULSE_API =
  process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface AmazonProduct {
  rank: number | null;
  asin: string;
  title: string;
  price: number | null;
  reviews: number | null;
  rating: number | null;
  bought_past_month_label?: string | null;
  bought_past_month_est?: number | null;
  is_gymreapers?: boolean;
  url: string;
}

interface AmazonCategory {
  slug: string;
  name: string;
  top_5: AmazonProduct[];
}

interface AmazonPayload {
  snapshot_date: string;
  categories: AmazonCategory[];
}

function fmtPrice(p: number | null | undefined): string {
  if (p == null) return '—';
  return `$${p.toFixed(0)}`;
}

function fmtReviews(n: number | null | undefined): string {
  if (!n) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function DemandSignalsPage() {
  const [data, setData] = useState<AmazonPayload | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    fetch(`${PULSE_API}/pulse/amazon`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((j) => setData(j))
      .catch(() => {});
  }, []);

  if (!data) return <div className="text-center py-20 text-gr-subtle">Loading…</div>;

  // Flatten all top-5 products across categories and rank by bought_past_month_est
  const allProducts: Array<AmazonProduct & { category: string }> = [];
  for (const cat of data.categories) {
    for (const p of cat.top_5) {
      if (p.bought_past_month_est) {
        allProducts.push({ ...p, category: cat.name });
      }
    }
  }
  const topVolume = [...allProducts].sort(
    (a, b) => (b.bought_past_month_est || 0) - (a.bought_past_month_est || 0),
  );

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Demand Signals
          </p>
          <ConfidenceBadge source="amazon_bsr" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What&apos;s actually selling
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Top products in our tracked Amazon categories sorted by Amazon&apos;s{' '}
          <GlossaryTerm id="bought-past-month">bought-in-past-month</GlossaryTerm> volume bucket. This
          is the closest public proxy to monthly unit sales — a 3K+ label means at least 3,000
          bought in the last month.
        </p>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-8">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">Velocity leaders</p>
          <h2 className="text-2xl font-bold text-gr-text tracking-tight">
            Top sellers across categories <span className="text-gr-muted font-normal tabular-nums">({topVolume.length})</span>
          </h2>
        </div>
        <div className="mb-6">
          <SectionExplainer
            what="The single highest-volume products in our tracked Amazon categories, ranked by Amazon's monthly bought-band label."
            howToRead="The label on the left is Amazon's band — 10K+ beats 5K+ beats 3K+. Gymreapers/Victory Grips rows render in accent red. The category column tells you which Amazon search the product is winning."
            whatToDo="Treat each non-Gymreapers entry as a category-defining product to study — what's their hook, price, review count, image style. If we don't have a comparable SKU in a 5K+ category, that's a build-or-defer call."
          />
        </div>
        {topVolume.length === 0 ? (
          <p className="text-sm text-gr-muted">No products with volume data captured yet. Amazon shows this on most cards once a product has &gt;500/month.</p>
        ) : (
          <div className="space-y-1 -mx-2">
            {topVolume.slice(0, 30).map((p, i) => (
              <a
                key={`${p.asin}-${i}`}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('outbound', { label: 'product_link', metadata: { href: p.url.slice(0, 200) } })}
                className={`flex items-baseline gap-3 text-sm hover:bg-gr-bg rounded px-2 py-2 ${
                  p.is_gymreapers ? 'text-gr-accent' : 'text-gr-muted'
                }`}
                title={p.title}
              >
                <span className="w-12 text-right font-bold tabular-nums font-mono">{p.bought_past_month_label}</span>
                <span className="w-32 text-[11px] uppercase tracking-wider text-gr-subtle truncate flex-shrink-0">{p.category}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-xs tabular-nums">{fmtPrice(p.price)}</span>
                <span className="text-xs text-gr-subtle w-14 text-right tabular-nums">{fmtReviews(p.reviews)}r</span>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="text-xs text-gr-subtle">
        Snapshot: {data.snapshot_date} · Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_bsr.product_snapshots</code>
      </div>
    </div>
  );
}
