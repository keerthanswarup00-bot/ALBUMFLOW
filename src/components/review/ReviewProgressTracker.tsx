import { cn } from '@/utils/cn';

interface ReviewProgressTrackerProps {
  currentSpread: number;
  reviewedCount: number;
  totalPages: number;
  completionPercent: number;
  albumTitle: string;
  onBack?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleHelp: () => void;
  onToggleSummary: () => void;
  onTogglePreview?: () => void;
  isPreviewMode?: boolean;
  requestCount?: number;
  onToggleRequests?: () => void;
  className?: string;
}

export function ReviewProgressTracker({
  currentSpread,
  reviewedCount,
  totalPages,
  completionPercent,
  albumTitle,
  onBack,
  isPreviewMode,
  onBack: _onBack,
  ..._rest
}: ReviewProgressTrackerProps) {
  return (
    <div className={cn('bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top select-none', _rest.className)}>
      <div className="flex items-center justify-between px-3 py-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0 flex-1 px-2">
          <span className="text-sm font-bold text-gray-800 tabular-nums shrink-0">
            Spread {currentSpread + 1} of {totalPages}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-2 w-20 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 tabular-nums">
              {reviewedCount}/{totalPages}
            </span>
          </div>
          {completionPercent === 100 && (
            <button
              onClick={_rest.onToggleSummary}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[40px] shadow-sm"
            >
              Finish Review
            </button>
          )}
          {completionPercent < 100 && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg">
              {totalPages - reviewedCount} spread{(totalPages - reviewedCount) !== 1 ? 's' : ''} remaining
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
