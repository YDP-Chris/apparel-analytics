import { Card, Text } from '@tremor/react';
import { Insight } from '@/lib/types';

interface InsightCardProps {
  insight: Insight;
}

const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
  leader: {
    bg: 'from-emerald-900/20 to-emerald-900/5',
    border: 'border-emerald-800/50',
    icon: '👑',
  },
  gap: {
    bg: 'from-amber-900/20 to-amber-900/5',
    border: 'border-amber-800/50',
    icon: '📊',
  },
  trend: {
    bg: 'from-blue-900/20 to-blue-900/5',
    border: 'border-blue-800/50',
    icon: '📈',
  },
  comparison: {
    bg: 'from-violet-900/20 to-violet-900/5',
    border: 'border-violet-800/50',
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
          <Text className="text-xs uppercase tracking-wider text-gray-500 mb-1">
            {insight.type === 'leader' ? 'Category Leader' :
             insight.type === 'gap' ? 'Market Gap' :
             insight.type === 'trend' ? 'Trend' : 'Comparison'}
          </Text>
          <Text className="text-gray-200 leading-relaxed">
            {insight.text}
          </Text>
        </div>
      </div>
    </Card>
  );
}
