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
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-10">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
          Coming online · daily 5:30 AM ET
        </p>
        <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">First run lands tomorrow morning</h2>
        <p className="text-gr-muted max-w-2xl leading-relaxed">
          This page joins two signals:{' '}
          <strong className="text-gr-text">Amazon autocomplete</strong> (popularity-ordered query
          completions for seeds like &ldquo;lifting belt&rdquo;, &ldquo;crossfit grips&rdquo;) and{' '}
          <strong className="text-gr-text">Google Trends</strong> for ~30 category keywords with WoW
          and MoM change percentages. The data agents are running for the first time now.
        </p>
        <div className="mt-6 pt-5 border-t border-gr-border/60 text-xs text-gr-subtle">
          Tables: <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_bsr.autocomplete_snapshots</code>,{' '}
          <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_competitive.category_trends</code>
        </div>
      </section>
    </div>
  );
}
