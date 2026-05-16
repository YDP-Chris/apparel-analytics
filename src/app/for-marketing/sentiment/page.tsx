import { ConfidenceBadge } from '@/components/ConfidenceBadge';

export default function SentimentPulsePage() {
  return (
    <div className="space-y-10">
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
      </header>

      <section className="bg-gr-surface rounded-md border border-gr-border p-10">
        <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-accent mb-3">
          Coming online · Monday 7:30 AM ET
        </p>
        <h2 className="text-2xl font-bold text-gr-text mb-4 tracking-tight">First run lands Monday morning</h2>
        <p className="text-gr-muted max-w-2xl leading-relaxed">
          Claude Sonnet reads the latest Reddit posts mentioning each brand and extracts 3-8
          recurring themes (e.g. &ldquo;fit issues&rdquo;, &ldquo;great durability&rdquo;,
          &ldquo;shipping problems&rdquo;) with sentiment and supporting post citations. Runs
          weekly to keep Claude costs predictable. Marketing uses this to know which messages land
          and which competitor weak spots to lean into; product uses it to know what to fix.
        </p>
        <div className="mt-6 pt-5 border-t border-gr-border/60 text-xs text-gr-subtle">
          Table: <code className="bg-gr-bg px-2 py-0.5 rounded">gymreapers_competitive.review_themes</code>
        </div>
      </section>
    </div>
  );
}
