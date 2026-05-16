'use client';

import { useEffect, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';

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
    <div className="space-y-6">
      <header>
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Product · Demand Signals
          </p>
          <ConfidenceBadge source="amazon_bsr" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">What&apos;s actually selling</h1>
        <p className="text-gr-muted mt-2 max-w-3xl">
          Top products in our tracked Amazon categories sorted by Amazon&apos;s &ldquo;bought in
          past month&rdquo; volume bucket. This is the closest public proxy to monthly unit sales —
          a 3K+ label means at least 3,000 bought in the last month.
        </p>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6">
        <h2 className="text-lg font-bold text-gr-text mb-4">Top sellers across categories ({topVolume.length})</h2>
        {topVolume.length === 0 ? (
          <p className="text-sm text-gr-muted">No products with volume data captured yet. Amazon shows this on most cards once a product has &gt;500/month.</p>
        ) : (
          <div className="space-y-2">
            {topVolume.slice(0, 30).map((p, i) => (
              <a
                key={`${p.asin}-${i}`}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-baseline gap-3 text-sm hover:bg-gr-bg rounded p-2 -m-2 ${
                  p.is_gymreapers ? 'text-gr-accent' : 'text-gr-muted'
                }`}
                title={p.title}
              >
                <span className="w-10 text-right font-bold">{p.bought_past_month_label}</span>
                <span className="w-32 text-xs text-gr-subtle truncate flex-shrink-0">{p.category}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-xs">{fmtPrice(p.price)}</span>
                <span className="text-xs text-gr-subtle w-14 text-right">{fmtReviews(p.reviews)}r</span>
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
