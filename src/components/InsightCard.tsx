import { Card, Text } from '@tremor/react';
import { Insight } from '@/lib/types';

interface InsightCardProps {
  insight: Insight;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  leader: {
    bg: 'from-socal-sage-50 to-socal-sand-50',
    border: 'border-socal-sage-200',
    icon: '👑',
  },
  gap: {
    bg: 'from-socal-sunset-50 to-socal-sand-50',
    border: 'border-socal-sunset-200',
    icon: '📊',
  },
  trend: {
    bg: 'from-socal-ocean-50 to-socal-sand-50',
    border: 'border-socal-ocean-200',
    icon: '📈',
  },
  comparison: {
    bg: 'from-socal-sand-100 to-socal-sand-50',
    border: 'border-socal-sand-200',
    icon: '⚖️',
  },
};

export default function InsightCard({ insight }: InsightCardProps) {
  const style = typeStyles[insight.type] || typeStyles.trend;

  return (
    <Card
      className={`bg-gradient-to-br ${style.bg} border ${style.border} ring-0 shadow-soft`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{style.icon}</span>
        <div>
          <Text className="text-xs uppercase tracking-wider text-socal-stone-400 mb-1">
            {insight.type === 'leader' ? 'Category Leader' :
             insight.type === 'gap' ? 'Market Gap' :
             insight.type === 'trend' ? 'Trend' : 'Comparison'}
          </Text>
          <Text className="text-socal-stone-600 leading-relaxed">
            {insight.text}
          </Text>
        </div>
      </div>
    </Card>
  );
}
