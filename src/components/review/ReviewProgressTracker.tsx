import { cn } from '@/utils/cn';

interface ReviewProgressTrackerProps {
  currentSpread: number;
  reviewedCount: number;
  totalPages: number;
  completionPercent: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleHelp: () => void;
  onToggleSummary: () => void;
  onTogglePreview?: () => void;
  className?: string;
  studioLogoUrl?: string;
  studioName?: string;
  hasFeedback?: boolean;
}

export function ReviewProgressTracker({
  currentSpread,
  totalPages,
  studioLogoUrl,
  studioName,
  hasFeedback,
  ..._rest
}: ReviewProgressTrackerProps) {
  return (
    <div className={cn('bg-bg-primary/95 backdrop-blur-sm border-b border-border-primary safe-area-top select-none', _rest.className)}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          {studioLogoUrl && (
            <img src={studioLogoUrl} alt={studioName || 'Studio'} className="h-6 w-6 rounded-full object-cover shrink-0" />
          )}
          <span className="text-sm font-bold text-gray-800 tabular-nums shrink-0">
            Spread {currentSpread + 1} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {hasFeedback ? (
              <span className="text-xs text-amber-600 font-medium">Has feedback</span>
            ) : (
              <span className="text-xs text-green-600 font-medium">Approved</span>
            )}
          </div>
          <button
            onClick={_rest.onToggleSummary}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap min-h-[44px]"
          >
            Finish Review
          </button>
        </div>
      </div>
    </div>
  );
}
