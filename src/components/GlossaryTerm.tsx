'use client';

/**
 * GlossaryTerm — inline jargon explainer.
 *
 * Wraps a jargon term in body text. On hover, shows the one-line short
 * definition. Click navigates to the full term on the /glossary page.
 *
 * Usage:
 *   <GlossaryTerm id="hhi">HHI</GlossaryTerm>
 *   <GlossaryTerm id="bought-past-month" />              // renders the term's label
 *   <GlossaryTerm id="hhi">brand concentration</GlossaryTerm>  // custom display text
 *
 * If a term id isn't in the registry, falls back to the children/label as
 * plain text (so a typo doesn't break the page).
 */

import Link from 'next/link';
import { findTerm } from './glossary';

interface Props {
  id: string;
  children?: React.ReactNode;
  /** When true, suppresses the underline so it blends in a paragraph. */
  subtle?: boolean;
}

export function GlossaryTerm({ id, children, subtle }: Props) {
  const term = findTerm(id);
  if (!term) {
    return <>{children}</>;
  }
  return (
    <Link
      href={`/glossary#${id}`}
      title={term.short}
      className={`text-gr-text underline decoration-dotted decoration-gr-muted underline-offset-2 hover:decoration-gr-accent hover:text-gr-accent transition cursor-help ${
        subtle ? 'no-underline border-b border-dotted border-gr-muted/50' : ''
      }`}
    >
      {children || term.label}
    </Link>
  );
}
