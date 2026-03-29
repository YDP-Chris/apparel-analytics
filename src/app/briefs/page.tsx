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
    <Card className="bg-white border-socal-sand-100 ring-0 shadow-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg ${accent} flex items-center justify-center text-sm`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-socal-stone-500 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-3">
        {lines.map((line, i) => {
          // Strip leading bullet characters
          const cleaned = line.replace(/^[\u2022\-\*]\s*/, '');
          return (
            <div key={i} className="flex gap-3 text-sm text-socal-stone-700 leading-relaxed">
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
        <div className="text-socal-stone-400 text-sm">Loading intelligence briefs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-socal-sunset-600 text-sm">{error}</div>
      </div>
    );
  }

  if (briefs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-socal-stone-400 text-sm">No briefs available yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-socal-stone-800 tracking-tight">
          Daily Intelligence Brief
        </h1>
        <p className="mt-2 text-socal-stone-500 max-w-2xl">
          AI-synthesized competitive intelligence across the premium athleisure market.
          Updated daily from news, product sitemaps, search trends, and social signals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Brief Timeline (sidebar) */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <h2 className="text-xs font-semibold text-socal-stone-400 uppercase tracking-wider mb-3">
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
                        ? 'bg-socal-ocean-50 text-socal-ocean-700 shadow-sm'
                        : 'text-socal-stone-500 hover:text-socal-stone-800 hover:bg-socal-sand-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{formatShortDate(brief.date)}</span>
                        <span className="ml-1.5 text-xs opacity-60">{formatWeekday(brief.date)}</span>
                      </div>
                      <span className={`text-xs ${isSelected ? 'text-socal-ocean-500' : 'text-socal-stone-400'}`}>
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
            <div className="border-b border-socal-sand-200 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-socal-ocean-500 animate-pulse" />
                <Text className="text-socal-stone-400 text-xs uppercase tracking-widest font-medium">
                  Intel Brief
                </Text>
              </div>
              <h2 className="text-2xl font-bold text-socal-stone-800">
                {formatDate(selectedBrief.date)}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-socal-stone-400">
                <span>
                  Based on {selectedBrief.article_count} articles
                </span>
                <span className="w-1 h-1 rounded-full bg-socal-stone-300" />
                <span>
                  {selectedBrief.companies?.length || 0} companies tracked
                </span>
                {selectedBrief.companies && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-socal-stone-300" />
                    <span className="text-socal-stone-400">
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
                accent="bg-socal-sunset-100 text-socal-sunset-600"
                icon="!"
              />

              <BriefSection
                title="Trends"
                content={selectedBrief.trends}
                accent="bg-socal-ocean-100 text-socal-ocean-600"
                icon="~"
              />

              <BriefSection
                title="Product Velocity"
                content={selectedBrief.product_velocity}
                accent="bg-socal-sage-100 text-socal-sage-600"
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
                accent="bg-socal-ocean-100 text-socal-ocean-700"
                icon=">"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
