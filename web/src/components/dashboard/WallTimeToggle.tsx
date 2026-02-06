/**
 * WallTimeToggle — Toggle between wall time and active time views
 * GH #60: Dashboard wall time vs active time toggle
 *
 * Wall time = total elapsed time (start to finish)
 * Active time = actual working time (from time tracking)
 */

import { useState } from 'react';
import { useMetrics, formatDuration, type MetricsPeriod } from '@/hooks/useMetrics';
import { Clock, Timer, ToggleLeft, ToggleRight } from 'lucide-react';

interface WallTimeToggleProps {
  period: MetricsPeriod;
}

export function WallTimeToggle({ period }: WallTimeToggleProps) {
  const [showActive, setShowActive] = useState(false);
  const { data: metrics } = useMetrics(period);

  const wallTime = metrics?.duration ? (metrics.duration.avgMs * (metrics.duration.runs || 1)) : 0;
  const activeTime = metrics?.duration?.avgMs || 0;
  const efficiency = wallTime > 0 ? (activeTime / wallTime) * 100 : 0;

  const displayTime = showActive ? activeTime : wallTime;
  const label = showActive ? 'Active Time' : 'Wall Time';
  const Icon = showActive ? Timer : Clock;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </h3>
        <button
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowActive(!showActive)}
        >
          {showActive ? (
            <ToggleRight className="w-4 h-4 text-purple-500" />
          ) : (
            <ToggleLeft className="w-4 h-4" />
          )}
          {showActive ? 'Active' : 'Wall'}
        </button>
      </div>

      <div className="text-2xl font-bold mb-1">
        {formatDuration(displayTime)}
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Wall time</span>
          <span className={!showActive ? 'font-medium text-foreground' : ''}>{formatDuration(wallTime)}</span>
        </div>
        <div className="flex justify-between">
          <span>Active time</span>
          <span className={showActive ? 'font-medium text-foreground' : ''}>{formatDuration(activeTime)}</span>
        </div>
        <div className="flex justify-between pt-1 border-t">
          <span>Efficiency</span>
          <span className="font-medium" style={{ color: efficiency > 70 ? '#22c55e' : efficiency > 40 ? '#f59e0b' : '#ef4444' }}>
            {Math.round(efficiency)}%
          </span>
        </div>
      </div>
    </div>
  );
}
