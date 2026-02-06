/**
 * HourlyActivityChart — "Over Time" hourly activity bar chart
 * GH #59: Dashboard hourly activity chart
 *
 * Shows activity volume per hour as a compact bar chart.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart3 } from 'lucide-react';
import type { MetricsPeriod } from '@/hooks/useMetrics';

interface HourlyActivityChartProps {
  period: MetricsPeriod;
}

export function HourlyActivityChart({ period }: HourlyActivityChartProps) {
  const { data: activities = [] } = useQuery({
    queryKey: ['activity', 'hourly', period],
    queryFn: () => api.activity.list(500),
    staleTime: 60_000,
  });

  const hourlyBars = useMemo(() => {
    const hours = Array.from({ length: 24 }, () => 0);
    for (const a of activities) {
      hours[new Date(a.timestamp).getHours()]++;
    }
    const max = Math.max(...hours, 1);
    return hours.map((count, hour) => ({
      hour,
      count,
      height: (count / max) * 100,
      label: hour % 6 === 0 ? (hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`) : '',
    }));
  }, [activities]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        Activity Over Time
      </h3>

      <div className="flex items-end gap-[2px] h-[80px]">
        {hourlyBars.map((bar) => (
          <div key={bar.hour} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
              style={{
                height: `${Math.max(bar.height, 3)}%`,
                backgroundColor: bar.count > 0 ? `rgba(139, 92, 246, ${0.3 + (bar.height / 100) * 0.7})` : 'rgba(139, 92, 246, 0.08)',
              }}
              title={`${bar.hour}:00 — ${bar.count} activities`}
            />
          </div>
        ))}
      </div>

      {/* Axis labels */}
      <div className="flex items-end gap-1">
        <span className="text-[9px] text-muted-foreground/50 -rotate-90 origin-bottom-left translate-y-1 w-0">Events</span>
        <div className="flex-1 flex justify-between text-[9px] text-muted-foreground/50 mt-1 px-0.5">
          {hourlyBars.filter((b) => b.label).map((bar) => (
            <span key={bar.hour}>{bar.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
