export default function TrendingTermsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Marketing · Trending Terms
        </p>
        <h1 className="text-3xl font-bold tracking-tight">What people are searching for right now</h1>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-8 text-center">
        <div className="text-5xl mb-3">📈</div>
        <h2 className="text-xl font-bold text-gr-text mb-2">Coming online — daily 5:30 AM ET</h2>
        <p className="text-gr-muted max-w-xl mx-auto leading-relaxed">
          This page joins two signals:{' '}
          <strong className="text-gr-text">Amazon autocomplete</strong> (popularity-ordered query
          completions for seeds like &ldquo;lifting belt&rdquo;, &ldquo;crossfit grips&rdquo;) and{' '}
          <strong className="text-gr-text">Google Trends</strong> for ~30 category keywords with WoW
          and MoM change percentages. The data agents are running for the first time now — full
          page lands tomorrow morning.
        </p>
        <div className="mt-6 text-xs text-gr-subtle">
          Tables: <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_bsr.autocomplete_snapshots</code>,{' '}
          <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_competitive.category_trends</code>
        </div>
      </section>
    </div>
  );
}
