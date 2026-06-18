interface ProgressTrackerProps {
  progressPercent: number;
  progressLabel: string;
}

export function ProgressTracker({ progressPercent, progressLabel }: ProgressTrackerProps) {
  return (
    <div className="px-6 py-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">Review Progress</span>
        <span className="text-xs text-text-muted">{progressLabel}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-secondary">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${Math.min(progressPercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
