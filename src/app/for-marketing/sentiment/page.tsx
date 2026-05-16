export default function SentimentPulsePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-2">
          For Marketing · Sentiment Pulse
        </p>
        <h1 className="text-3xl font-bold tracking-tight">What people love and hate by brand</h1>
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-8 text-center">
        <div className="text-5xl mb-3">💬</div>
        <h2 className="text-xl font-bold text-gr-text mb-2">First run lands Monday 7:30 AM ET</h2>
        <p className="text-gr-muted max-w-xl mx-auto leading-relaxed">
          Claude Sonnet reads the latest Reddit posts mentioning each brand and extracts 3-8
          recurring themes (e.g. &ldquo;fit issues&rdquo;, &ldquo;great durability&rdquo;,
          &ldquo;shipping problems&rdquo;) with sentiment and supporting post citations. Runs
          weekly to keep Claude costs predictable. Marketing uses this to know which messages land
          and which competitor weak spots to lean into; product uses it to know what to fix.
        </p>
        <div className="mt-6 text-xs text-gr-subtle">
          Table: <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_competitive.review_themes</code>
        </div>
      </section>
    </div>
  );
}
