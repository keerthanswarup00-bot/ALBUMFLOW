import { cn } from '@/utils/cn';

interface ReviewProgressTrackerProps {
  currentSpread: number;
  reviewedCount: number;
  totalPages: number;
  completionPercent: number;
  onBack?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleHelp: () => void;
  onToggleSummary: () => void;
  onTogglePreview?: () => void;
  requestCount?: number;
  onToggleRequests?: () => void;
  className?: string;
  studioLogoUrl?: string;
  studioName?: string;
}

export function ReviewProgressTracker({
  currentSpread,
  totalPages,
  completionPercent,
  onBack,
  studioLogoUrl,
  studioName,
  ..._rest
}: ReviewProgressTrackerProps) {
  return (
    <div className={cn('bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top select-none', _rest.className)}>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
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
          {studioLogoUrl && (
            <img src={studioLogoUrl} alt={studioName || 'Studio'} className="h-6 w-6 rounded-full object-cover shrink-0" />
          )}
          <span className="text-sm font-bold text-gray-800 tabular-nums shrink-0">
            Spread {currentSpread + 1} of {totalPages}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${Math.min(completionPercent, 100)}%` }}
            />
          </div>
          {completionPercent === 100 && (
            <button
              onClick={_rest.onToggleSummary}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Finish Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
