'use client';

/**
 * ConfidenceBadge — surfaces the confidence rating of the data source backing
 * a particular insight/section. The registry below is the single source of
 * truth; the /methodology page reads from the same data shape so badges and
 * the methodology doc never drift apart.
 *
 * Usage:
 *   <ConfidenceBadge source="amazon_bsr" />
 *   <ConfidenceBadge source="reddit" size="sm" />
 *   <ConfidenceBadge source="amazon_bsr" inline />        // less padding, fits in a sentence
 */

import Link from 'next/link';
import { trackEvent } from '@/lib/usage';

export type DataSourceId =
  | 'amazon_bsr'
  | 'amazon_autocomplete'
  | 'shopify_catalog'
  | 'google_trends_brand'
  | 'google_trends_category'
  | 'reddit'
  | 'review_themes'
  | 'news'
  | 'launches'
  | 'jobs'
  | 'dtc_reviews'
  | 'fb_ads'
  | 'creator_posts'
  | 'composite';

interface SourceMeta {
  label: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  blurb: string;
}

// Keep in sync with /app/methodology/page.tsx
const SOURCES: Record<DataSourceId, SourceMeta> = {
  amazon_bsr:             { label: 'Amazon BSR',             confidence: 'HIGH',   blurb: 'Daily Amazon popularity rank + bought-past-month volume.' },
  amazon_autocomplete:    { label: 'Amazon autocomplete',    confidence: 'HIGH',   blurb: "Amazon's own popularity-ordered query completions." },
  shopify_catalog:        { label: 'Shopify catalogs',       confidence: 'HIGH',   blurb: 'Daily product-level pull from each brand\'s Shopify endpoint.' },
  google_trends_brand:    { label: 'Google Trends — brands', confidence: 'MEDIUM', blurb: 'Normalized 0-100 search interest score per brand.' },
  google_trends_category: { label: 'Google Trends — cats',   confidence: 'MEDIUM', blurb: '30 category keywords with WoW + MoM deltas.' },
  reddit:                 { label: 'Reddit posts',           confidence: 'LOW',    blurb: 'Reddit-only, fitness community skews male/powerlifting.' },
  review_themes:          { label: 'Reddit theme NLP',       confidence: 'MEDIUM', blurb: 'Claude-extracted themes — inherits Reddit\'s biases.' },
  news:                   { label: 'News articles',          confidence: 'MEDIUM', blurb: 'Trade press + Google News RSS. Skews toward bigger brands.' },
  launches:               { label: 'Launch detection',       confidence: 'MEDIUM', blurb: 'Sitemap-diff + classifier — regex-based, brand-specific.' },
  jobs:                   { label: 'Job postings',           confidence: 'MEDIUM', blurb: 'Greenhouse + Lever only — most strength brands invisible.' },
  dtc_reviews:            { label: 'D2C site reviews',       confidence: 'HIGH',   blurb: 'Yotpo / Bazaarvoice / Stamped review widgets.' },
  fb_ads:                 { label: 'FB Ad Library',          confidence: 'HIGH',   blurb: 'Meta\'s public Ad Library — authoritative for active ads.' },
  creator_posts:          { label: 'Creator monitor',        confidence: 'MEDIUM', blurb: 'YouTube via HTML scrape; TikTok currently blocked.' },
  composite:              { label: 'Composite',              confidence: 'MEDIUM', blurb: 'Synthesizes multiple sources — see methodology for the blend.' },
};

const STYLES = {
  HIGH:   { bg: 'bg-gr-success/15',     text: 'text-gr-success',  ring: 'ring-gr-success/40' },
  MEDIUM: { bg: 'bg-gr-accent-soft/50', text: 'text-gr-accent',   ring: 'ring-gr-accent/40' },
  LOW:    { bg: 'bg-gr-danger/10',      text: 'text-gr-danger',   ring: 'ring-gr-danger/40' },
};

interface BadgeProps {
  source: DataSourceId;
  size?: 'sm' | 'md';
  inline?: boolean;
  /** If true, hides the source label and shows only the H/M/L pill. */
  pillOnly?: boolean;
}

export function ConfidenceBadge({ source, size = 'sm', inline = false, pillOnly = false }: BadgeProps) {
  const meta = SOURCES[source];
  if (!meta) return null;
  const s = STYLES[meta.confidence];
  const px = size === 'md' ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const txt = size === 'md' ? 'text-xs' : 'text-[10px]';

  return (
    <Link
      href="/methodology"
      onClick={() => trackEvent('click', { label: 'confidence_badge', metadata: { source } })}
      className={`inline-flex items-center gap-1.5 rounded ring-1 ${s.bg} ${s.ring} ${px} ${txt} font-bold uppercase tracking-wider hover:opacity-80 transition ${inline ? '' : 'align-middle'}`}
      title={`${meta.label} — ${meta.confidence} confidence. ${meta.blurb} Click for methodology.`}
    >
      <span className={s.text}>{meta.confidence[0]}</span>
      {!pillOnly && <span className="text-gr-muted normal-case tracking-normal font-medium">{meta.label}</span>}
    </Link>
  );
}
