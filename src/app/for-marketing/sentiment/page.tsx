'use client';

import { useEffect, useState } from 'react';
import { ConfidenceBadge } from '@/components/ConfidenceBadge';
import { SectionExplainer } from '@/components/SectionExplainer';
import { GlossaryTerm } from '@/components/GlossaryTerm';
import { trackEvent } from '@/lib/usage';

const PULSE_API = process.env.NEXT_PUBLIC_PULSE_API_URL || 'https://api.yadkindatapartners.com';
const TOKEN_KEY = 'ydp_pulse_token';

interface Theme {
  brand_slug: string;
  theme: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  post_count: number;
  example_posts?: Array<{ title?: string; url?: string; snippet?: string }> | null;
  captured_at?: string;
}

interface BrandMeta {
  slug: string;
  name: string;
}

const SENTIMENT_STYLES: Record<Theme['sentiment'], { bg: string; text: string; label: string }> = {
  positive: { bg: 'bg-gr-success/15', text: 'text-gr-success', label: '+ POSITIVE' },
  negative: { bg: 'bg-gr-danger/15',  text: 'text-gr-danger',  label: '- NEGATIVE' },
  mixed:    { bg: 'bg-gr-accent-soft/40', text: 'text-gr-accent', label: '~ MIXED' },
  neutral:  { bg: 'bg-gr-raised',     text: 'text-gr-muted',   label: '· NEUTRAL' },
};

export default function SentimentPulsePage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [brands, setBrands] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (!token) { setError('Sign in first.'); setLoading(false); return; }
    Promise.all([
      fetch(`${PULSE_API}/pulse/competitive`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))),
    ])
      .then(([comp]) => {
        setBrands(comp.brand_names || {});
        return fetch(`${PULSE_API}/pulse/themes`, { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((r) => (r && r.ok ? r.json() : { themes: [] }))
      .then((j) => setThemes(j.themes || []))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-20 text-gr-subtle">Loading themes…</div>;
  if (error) return <div className="text-center py-20 text-gr-danger">{error}</div>;

  // Group by brand
  const byBrand: Record<string, Theme[]> = {};
  for (const t of themes) {
    (byBrand[t.brand_slug] ??= []).push(t);
  }
  const brandOrder = Object.keys(byBrand).sort(
    (a, b) => (byBrand[b].length - byBrand[a].length),
  );

  return (
    <div className="space-y-12">
      <header className="pb-2">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em]">
            For Marketing · Sentiment Pulse
          </p>
          <ConfidenceBadge source="review_themes" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What people love and hate by brand
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Claude reads the last 14 days of Reddit posts and{' '}
          <GlossaryTerm id="d2c">D2C site reviews</GlossaryTerm> per brand and extracts 3-8 recurring
          themes with sentiment. Marketing uses this to know which hooks land and which competitor
          weak spots to lean into.
        </p>
      </header>

      {themes.length === 0 ? (
        <section className="bg-gr-surface rounded-md border border-gr-border p-10">
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
            First themes haven&apos;t landed yet
          </p>
          <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">Building up the data</h2>
          <p className="text-gr-muted max-w-2xl leading-relaxed">
            The NLP pipeline runs weekly Monday mornings. It needs at least 5 posts/reviews per
            brand to generate themes. Brands with thin social data will be skipped until they pass
            that threshold.
          </p>
        </section>
      ) : (
        <>
          <SectionExplainer
            what="One card per brand. Each row inside is a recurring theme Claude found in their reviews, ranked by how many posts mention it."
            howToRead='"Positive" themes are what customers love. "Negative" are what they complain about. "Mixed" themes have both sides showing up. "Neutral" themes are descriptive without strong sentiment.'
            whatToDo="Lean marketing copy into competitors' positive themes (e.g. if Lululemon's customers love 'restock alerts', a 'never-out-of-stock' Gymreapers campaign positions against that). Lean product fixes into their negative themes."
          />

          {brandOrder.map((slug) => {
            const list = byBrand[slug];
            const name = brands[slug] || slug;
            const themeCount = list.length;
            return (
              <section key={slug} className="bg-gr-surface rounded-md border border-gr-border p-6">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="text-xl font-bold text-gr-text tracking-tight">{name}</h2>
                  <span className="text-xs text-gr-subtle">{themeCount} theme{themeCount !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {list.map((t, i) => {
                    const s = SENTIMENT_STYLES[t.sentiment];
                    const examples = (t.example_posts || []).slice(0, 2);
                    return (
                      <div key={i} className="bg-gr-bg rounded p-3 border border-gr-border/60">
                        <div className="flex items-baseline justify-between gap-3 mb-1">
                          <div className="flex-1 text-sm font-semibold text-gr-text">{t.theme}</div>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.bg} ${s.text}`}>
                              {s.label}
                            </span>
                            <span className="text-xs text-gr-subtle tabular-nums">{t.post_count} post{t.post_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        {examples.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {examples.map((ex, j) => (
                              <a
                                key={j}
                                href={ex.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackEvent('outbound', { label: 'review_link', metadata: { href: (ex.url || '').slice(0, 200) } })}
                                className="block text-xs text-gr-muted hover:text-gr-accent italic"
                              >
                                &ldquo;{ex.snippet || ex.title || 'example'}&rdquo;
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </>
      )}

      <div className="text-xs text-gr-subtle">
        Source: <code className="bg-gr-bg px-1.5 py-0.5 rounded">gymreapers_competitive.review_themes</code> ·
        Runs weekly Mondays 7:30 AM ET.
      </div>
    </div>
  );
}
