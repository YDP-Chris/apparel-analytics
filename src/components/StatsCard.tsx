import { Card, Text, Metric } from '@tremor/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function StatsCard({ title, value, subtitle, icon }: StatsCardProps) {
  return (
    <Card className="bg-gray-900 border-gray-800 ring-0">
      <div className="flex items-start justify-between">
        <div>
          <Text className="text-gray-400">{title}</Text>
          <Metric className="text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Metric>
          {subtitle && (
            <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
          )}
        </div>
        {icon && (
          <div className="text-gray-600">{icon}</div>
        )}
      </div>
    </Card>
  );
}
