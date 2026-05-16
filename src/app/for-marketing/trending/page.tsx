'use client';

import { SuggestInput } from '@/components/SuggestInput';

export default function TrendingTermsPage() {
  return (
    <div className="space-y-10">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          For Marketing · Trending Terms
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          What people are searching for right now
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Two signals daily: <strong className="text-gr-text">Amazon autocomplete</strong> (popularity-ordered
          query completions) + <strong className="text-gr-text">Google Trends</strong> for ~30 category
          keywords with WoW/MoM deltas. First run lands at 5:30 AM ET.
        </p>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-8">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
          Coming online · daily 5:30 AM ET
        </p>
        <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">First run lands tomorrow morning</h2>
        <p className="text-gr-muted max-w-2xl leading-relaxed mb-5">
          Once data lands, this page will rank the top rising / falling search terms and let you
          drill into either signal. While we wait, you can already add terms to track.
        </p>
        <div className="pt-5 border-t border-gr-border/60 text-xs text-gr-subtle">
          Tables: <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_bsr.autocomplete_snapshots</code>,{' '}
          <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_competitive.category_trends</code>
        </div>
      </section>

      <section className="bg-gr-surface rounded-md border border-gr-border p-6 space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">Add to the tracker</p>
          <h2 className="text-2xl font-bold text-gr-text tracking-tight">Tell us what to watch</h2>
          <p className="text-sm text-gr-muted mt-2 max-w-2xl leading-relaxed">
            Suggestions queue for review. Approved terms land in the next scrape run.
          </p>
        </div>
        <SuggestInput kind="autocomplete_seed" parentLabel="Amazon search box" />
        <SuggestInput kind="category_trend_keyword" parentLabel="Google Trends" />
      </section>
    </div>
  );
}
