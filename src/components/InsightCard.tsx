import { Card, Text } from '@tremor/react';
import { Insight } from '@/lib/types';

interface InsightCardProps {
  insight: Insight;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  leader: {
    bg: 'from-gr-success to-gr-raised',
    border: 'border-gr-success',
    icon: '👑',
  },
  gap: {
    bg: 'from-gr-accent-soft to-gr-raised',
    border: 'border-gr-accent-soft',
    icon: '📊',
  },
  trend: {
    bg: 'from-gr-accent-soft to-gr-raised',
    border: 'border-gr-accent-soft',
    icon: '📈',
  },
  comparison: {
    bg: 'from-gr-border to-gr-raised',
    border: 'border-gr-border',
    icon: '⚖️',
  },
};

export default function InsightCard({ insight }: InsightCardProps) {
  const style = typeStyles[insight.type] || typeStyles.trend;

  return (
    <Card
      className={`bg-gradient-to-br ${style.bg} border ${style.border} ring-0`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{style.icon}</span>
        <div>
          <Text className="text-xs uppercase tracking-wider text-gr-subtle mb-1">
            {insight.type === 'leader' ? 'Category Leader' :
             insight.type === 'gap' ? 'Market Gap' :
             insight.type === 'trend' ? 'Trend' : 'Comparison'}
          </Text>
          <Text className="text-gr-muted leading-relaxed">
            {insight.text}
          </Text>
        </div>
      </div>
    </Card>
  );
}
