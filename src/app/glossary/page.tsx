import Link from 'next/link';
import { GLOSSARY, TERMS_BY_CATEGORY, findTerm } from '@/components/glossary';

const CATEGORY_LABELS = {
  metric:   'Metrics',
  method:   'Methodology',
  source:   'Sources',
  platform: 'Platforms',
  concept:  'Concepts',
} as const;

const CATEGORY_DESCRIPTIONS = {
  metric:   'Numbers we measure and what they mean.',
  method:   'How the data is captured, validated, and rated.',
  source:   'Where each signal originates.',
  platform: 'Third-party systems we read from.',
  concept:  'Strategic ideas the dashboard is built around.',
} as const;

const CATEGORY_ORDER: (keyof typeof CATEGORY_LABELS)[] = ['concept', 'metric', 'method', 'platform', 'source'];

export default function GlossaryPage() {
  return (
    <div className="space-y-12">
      <header className="pb-2">
        <p className="text-gr-accent font-bold text-xs uppercase tracking-[0.25em] mb-3">
          Glossary
        </p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gr-text">
          Every term, defined.
        </h1>
        <p className="text-gr-muted mt-4 max-w-2xl text-lg leading-relaxed">
          Anything underlined dotted on any page links here. {GLOSSARY.length} terms total,
          grouped by what kind of thing they are. Use the in-page links to cross-reference
          related concepts.
        </p>
      </header>

      {/* Quick jump */}
      <nav className="bg-gr-surface border border-gr-border rounded-md p-5 flex flex-wrap gap-2 text-xs">
        <span className="text-gr-subtle font-bold uppercase tracking-wider mr-2">Jump to:</span>
        {CATEGORY_ORDER.map((cat) => (
          <Link
            key={cat}
            href={`#category-${cat}`}
            className="px-2 py-0.5 rounded bg-gr-bg text-gr-muted hover:text-gr-accent hover:bg-gr-raised transition font-semibold"
          >
            {CATEGORY_LABELS[cat]} ({TERMS_BY_CATEGORY[cat].length})
          </Link>
        ))}
      </nav>

      {CATEGORY_ORDER.map((cat) => {
        const terms = TERMS_BY_CATEGORY[cat];
        if (terms.length === 0) return null;
        return (
          <section key={cat} id={`category-${cat}`} className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-gr-subtle mb-2">
                {CATEGORY_DESCRIPTIONS[cat]}
              </p>
              <h2 className="text-2xl font-bold text-gr-text tracking-tight">
                {CATEGORY_LABELS[cat]}
              </h2>
            </div>
            <div className="space-y-3">
              {terms.map((t) => (
                <article
                  key={t.id}
                  id={t.id}
                  className="bg-gr-surface border border-gr-border rounded-md p-6 scroll-mt-24"
                >
                  <h3 className="text-lg font-bold text-gr-text mb-1">{t.label}</h3>
                  <p className="text-sm text-gr-accent font-semibold mb-3">{t.short}</p>
                  <p className="text-sm text-gr-muted leading-relaxed">{t.long}</p>
                  {t.example && (
                    <div className="mt-3 pt-3 border-t border-gr-border/60">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Example</span>
                      <p className="text-sm text-gr-muted leading-relaxed mt-1 italic">{t.example}</p>
                    </div>
                  )}
                  {t.related && t.related.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gr-border/60 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle">Related</span>
                      {t.related.map((rid) => {
                        const r = findTerm(rid);
                        if (!r) return null;
                        return (
                          <Link
                            key={rid}
                            href={`#${rid}`}
                            className="px-2 py-0.5 rounded bg-gr-bg text-gr-accent hover:bg-gr-raised transition font-semibold"
                          >
                            {r.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <section className="bg-gr-surface border border-gr-border rounded-md p-6">
        <h2 className="text-xl font-bold text-gr-text mb-3">Missing a term?</h2>
        <p className="text-sm text-gr-muted leading-relaxed">
          If you ran into jargon somewhere on the dashboard that isn&apos;t defined here, that&apos;s
          a bug — ping Chris and it&apos;ll get added. The goal is that anyone can land on any page
          and understand everything on it.
        </p>
      </section>
    </div>
  );
}
