import { cn } from '@/utils/cn';
import { BarChart3, Maximize2, Minimize2, HelpCircle, MessageSquare, ArrowLeft } from 'lucide-react';

interface ReviewProgressTrackerProps {
  reviewedCount: number;
  totalPages: number;
  completionPercent: number;
  albumTitle: string;
  isFullscreen: boolean;
  onBack?: () => void;
  onToggleFullscreen: () => void;
  onToggleHelp: () => void;
  onToggleSummary: () => void;
  requestCount?: number;
  onToggleRequests?: () => void;
  className?: string;
}

export function ReviewProgressTracker({
  reviewedCount,
  totalPages,
  completionPercent,
  albumTitle,
  isFullscreen,
  onBack,
  onToggleFullscreen,
  onToggleHelp,
  onToggleSummary,
  requestCount,
  onToggleRequests,
  className,
}: ReviewProgressTrackerProps) {
  return (
    <div className={cn('bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top', className)}>
      {/* Top row: title + actions */}
      <div className="flex items-center justify-between px-1 py-1.5 landscape:py-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1 px-2">
          <h1 className="truncate text-sm font-semibold text-gray-900">{albumTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 ml-2">
          <button
            onClick={onToggleRequests}
            className="relative flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="View requests"
            title="View Requests"
          >
            <MessageSquare className="h-4 w-4" />
            {requestCount !== undefined && requestCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {requestCount > 9 ? '9+' : requestCount}
              </span>
            )}
          </button>
          <button
            onClick={onToggleSummary}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Review summary"
            title="Review Summary"
          >
            <BarChart3 className="h-4 w-4" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={onToggleHelp}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Help"
            title="Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress info */}
      <div className="px-4 pb-2 landscape:hidden">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-600">Album Review Progress</span>
          <span className="text-xs text-gray-400">
            {reviewedCount} / {totalPages} Spreads Reviewed
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min(completionPercent, 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-medium text-gray-500">
            {completionPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}
