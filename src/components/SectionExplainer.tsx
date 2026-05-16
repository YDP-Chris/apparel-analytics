'use client';

/**
 * SectionExplainer — "What you're looking at" + "How to read it" + "What to do
 * with it" cards. Drop one near the top of any data section to give first-time
 * viewers immediate comprehension without a tutorial.
 *
 * Default mode: a small bordered card with the three Q&A blocks always visible.
 * `collapsed` mode: a single-line summary that expands on click — use when the
 * section is otherwise self-explanatory and we just want a quick assist.
 *
 * Usage:
 *   <SectionExplainer
 *     what="Each row is one Amazon search Gymreapers competes on."
 *     howToRead="The rank number on the right is our top product in that search."
 *     whatToDo="If we're not in the top 10, that's a category to invest in or kill."
 *   />
 */

import { useState } from 'react';
import { trackEvent } from '@/lib/usage';

interface Props {
  what: string;
  howToRead?: string;
  whatToDo?: string;
  collapsed?: boolean;
}

export function SectionExplainer({ what, howToRead, whatToDo, collapsed = false }: Props) {
  const [open, setOpen] = useState(!collapsed);

  if (collapsed && !open) {
    return (
      <button
        type="button"
        onClick={() => {
          trackEvent('expand', { label: 'section_explainer', metadata: { kind: 'open' } });
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 text-xs text-gr-accent hover:text-gr-accent-hover font-semibold transition"
      >
        <span className="text-base leading-none">ⓘ</span>
        What am I looking at?
      </button>
    );
  }

  return (
    <div className="bg-gr-bg/60 border border-gr-border/60 rounded-md p-4 space-y-3 text-sm">
      <div className="flex items-start gap-3">
        <span className="text-gr-accent text-base leading-tight" aria-hidden="true">ⓘ</span>
        <div className="flex-1 space-y-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">What this shows</div>
            <p className="text-gr-text leading-relaxed">{what}</p>
          </div>
          {howToRead && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">How to read it</div>
              <p className="text-gr-muted leading-relaxed">{howToRead}</p>
            </div>
          )}
          {whatToDo && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-gr-subtle mb-1">What to do with it</div>
              <p className="text-gr-muted leading-relaxed">{whatToDo}</p>
            </div>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={() => {
              trackEvent('expand', { label: 'section_explainer', metadata: { kind: 'close' } });
              setOpen(false);
            }}
            className="text-xs text-gr-subtle hover:text-gr-text"
            aria-label="Collapse"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
