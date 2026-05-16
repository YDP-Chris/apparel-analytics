'use client';

/**
 * BrandHideButton + HiddenBrandsBanner — two small components that let a user
 * curate which brands they care about. Both backed by useHiddenBrands so they
 * stay in sync across the dashboard.
 *
 * Design intent:
 *   - Hide is one click, no confirm — it's reversible.
 *   - When something IS hidden, the banner makes it impossible to forget
 *     (avoids the "where did Lululemon go?" mystery).
 *   - The banner doubles as a roster of brand-suggestion submitters via
 *     <SuggestInput kind="brand"> so adding a new brand to track lives in
 *     the same surface as managing visibility.
 */

import { useHiddenBrands } from './useHiddenBrands';
import { SuggestInput } from './SuggestInput';
import { useState } from 'react';

interface HideProps {
  slug: string;
  name: string;
  /** Smaller variant for inline use in dense tables. */
  size?: 'sm' | 'md';
}

export function BrandHideButton({ slug, name, size = 'sm' }: HideProps) {
  const { isHidden, toggle } = useHiddenBrands();
  const hidden = isHidden(slug);
  const px = size === 'md' ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[10px]';

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); toggle(slug); }}
      className={`${px} rounded font-bold uppercase tracking-wider transition ${
        hidden
          ? 'bg-gr-accent-soft text-gr-accent hover:bg-gr-accent hover:text-gr-text'
          : 'text-gr-subtle hover:bg-gr-raised hover:text-gr-danger'
      }`}
      title={hidden ? `Show ${name} again` : `Hide ${name} from your view`}
      aria-label={hidden ? `Show ${name}` : `Hide ${name}`}
    >
      {hidden ? 'Show' : 'Hide'}
    </button>
  );
}

interface BrandLike {
  slug: string;
  name: string;
}

interface BannerProps {
  /** The full set of brands the page knows about — used to render the
      "you have these hidden" roster with names. */
  brands: BrandLike[];
  /** Optional: where the suggest-brand flow should appear inline. */
  showSuggestBrand?: boolean;
}

export function HiddenBrandsBanner({ brands, showSuggestBrand = true }: BannerProps) {
  const { hidden, show, clear } = useHiddenBrands();
  const [suggestOpen, setSuggestOpen] = useState(false);
  const hiddenList = brands.filter((b) => hidden.has(b.slug));

  if (hiddenList.length === 0 && !showSuggestBrand) return null;

  return (
    <div className="bg-gr-bg/60 border border-gr-border/60 rounded-md px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
      {hiddenList.length > 0 ? (
        <>
          <span className="text-gr-muted text-xs uppercase tracking-wider font-bold">
            Hidden from your view:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {hiddenList.map((b) => (
              <button
                key={b.slug}
                type="button"
                onClick={() => show(b.slug)}
                className="px-2 py-0.5 rounded text-xs bg-gr-surface text-gr-muted hover:text-gr-text hover:bg-gr-raised border border-gr-border transition"
                title="Click to bring this brand back into view"
              >
                {b.name} <span className="text-gr-accent ml-1">+ show</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-gr-accent hover:underline font-semibold ml-auto"
          >
            Show all
          </button>
        </>
      ) : (
        <span className="text-xs text-gr-subtle">
          Click any brand&apos;s &quot;Hide&quot; button to curate your view. Settings persist on this device only.
        </span>
      )}

      {showSuggestBrand && (
        <div className="basis-full pt-3 mt-2 border-t border-gr-border/60">
          {suggestOpen ? (
            <SuggestInput kind="brand" parentLabel="competitive set" />
          ) : (
            <button
              type="button"
              onClick={() => setSuggestOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-gr-accent hover:text-gr-accent-hover font-semibold transition"
            >
              <span className="text-base leading-none">+</span>
              Suggest a new brand to track
            </button>
          )}
        </div>
      )}
    </div>
  );
}
