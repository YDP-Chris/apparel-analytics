'use client';

import { useState, useEffect } from 'react';
import { Card, Text } from '@tremor/react';
import { getSupabase, IntelBrief } from '@/lib/supabase';

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatWeekday(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

/** Render markdown-style bullet points as clean HTML */
function BriefSection({
  title,
  content,
  accent,
  icon,
}: {
  title: string;
  content: string | null;
  accent: string;
  icon: string;
}) {
  if (!content) return null;

  // Parse bullet points (lines starting with bullet chars)
  const lines = content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return (
    <Card className="bg-gr-surface border-gr-border ring-0">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg ${accent} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gr-muted uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {lines.map((line, i) => {
          // Strip leading bullet characters
          const cleaned = line.replace(/^[\u2022\-\*]\s*/, '');
          return (
            <div key={i} className="flex gap-3 text-sm text-gr-text leading-relaxed">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent}`} />
              <span>{cleaned}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function BriefsPage() {
  const [briefs, setBriefs] = useState<IntelBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<IntelBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBriefs() {
      try {
        const { data, error: fetchError } = await getSupabase()
          .from('ai_intel_briefs')
          .select('id, date, generated_at, article_count, companies, threats, trends, product_velocity, social_buzz, comebacks, actions')
          .order('date', { ascending: false });

        if (fetchError) {
          setError('Failed to load briefs. Please try again later.');
          setLoading(false);
          return;
        }

        setBriefs(data || []);
        if (data && data.length > 0) {
          setSelectedBrief(data[0]);
        }
      } catch {
        setError('Unable to connect to the database.');
      }
      setLoading(false);
    }

    fetchBriefs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gr-subtle text-sm">Loading intelligence briefs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gr-accent text-sm">{error}</div>
      </div>
    );
  }

  if (briefs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-gr-subtle text-sm">No briefs available yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gr-text tracking-tight">
          Daily Intelligence Brief
        </h1>
        <p className="mt-2 text-gr-muted max-w-2xl">
          AI-synthesized competitive intelligence across the strength market market.
          Updated daily from news, product sitemaps, search trends, and social signals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Brief Timeline (sidebar) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <h2 className="text-xs font-semibold text-gr-subtle uppercase tracking-wider mb-3">
              Archive
            </h2>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-2">
              {briefs.map((brief) => {
                const isSelected = selectedBrief?.id === brief.id;
                return (
                  <button
                    key={brief.id}
                    onClick={() => setSelectedBrief(brief)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm ${
                      isSelected
                        ? 'bg-gr-accent-soft text-gr-accent'
                        : 'text-gr-muted hover:text-gr-text hover:bg-gr-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{formatShortDate(brief.date)}</span>
                        <span className="ml-1.5 text-xs opacity-60">{formatWeekday(brief.date)}</span>
                      </div>
                      <span className={`text-xs ${isSelected ? 'text-gr-accent-hover' : 'text-gr-subtle'}`}>
                        {brief.article_count}
                      </span>
                    </div>
                    {isSelected && brief.companies && (
                      <div className="mt-1 text-xs opacity-70">
                        {brief.companies.length} companies
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Brief Content */}
        {selectedBrief && (
          <div className="lg:col-span-3 space-y-6">
            {/* Brief Header */}
            <div className="border-b border-gr-border pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-gr-accent-hover animate-pulse" />
                <Text className="text-gr-subtle text-xs uppercase tracking-widest font-medium">
                  Intel Brief
                </Text>
              </div>
              <h2 className="text-2xl font-bold text-gr-text">
                {formatDate(selectedBrief.date)}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gr-subtle">
                <span>
                  Based on {selectedBrief.article_count} articles
                </span>
                <span className="w-1 h-1 rounded-full bg-gr-subtle" />
                <span>
                  {selectedBrief.companies?.length || 0} companies tracked
                </span>
                {selectedBrief.companies && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-gr-subtle" />
                    <span className="text-gr-subtle">
                      {selectedBrief.companies.join(' / ')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Sections */}
            <div className="grid grid-cols-1 gap-6">
              <BriefSection
                title="Threats"
                content={selectedBrief.threats}
                accent="bg-gr-accent-soft text-gr-accent"
                icon="!"
              />

              <BriefSection
                title="Trends"
                content={selectedBrief.trends}
                accent="bg-gr-accent-soft text-gr-accent"
                icon="~"
              />

              <BriefSection
                title="Product Velocity"
                content={selectedBrief.product_velocity}
                accent="bg-gr-success text-gr-success"
                icon="#"
              />

              <BriefSection
                title="Social Buzz"
                content={selectedBrief.social_buzz}
                accent="bg-purple-100 text-purple-600"
                icon="@"
              />

              <BriefSection
                title="Comebacks"
                content={selectedBrief.comebacks}
                accent="bg-amber-100 text-amber-600"
                icon="&lt;"
              />

              <BriefSection
                title="Actions"
                content={selectedBrief.actions}
                accent="bg-gr-accent-soft text-gr-accent"
                icon=">"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
