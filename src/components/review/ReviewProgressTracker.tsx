import { cn } from '@/utils/cn';
import { BarChart3, Maximize2, Minimize2, HelpCircle, MessageSquare, ArrowLeft, Eye } from 'lucide-react';

interface ReviewProgressTrackerProps {
  currentSpread: number;
  reviewedCount: number;
  totalPages: number;
  completionPercent: number;
  albumTitle: string;
  isFullscreen: boolean;
  isPreviewMode?: boolean;
  onBack?: () => void;
  onToggleFullscreen: () => void;
  onToggleHelp: () => void;
  onToggleSummary: () => void;
  onTogglePreview?: () => void;
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
  isFullscreen,
  isPreviewMode,
  onBack,
  onToggleFullscreen,
  onToggleHelp,
  onToggleSummary,
  onTogglePreview,
  requestCount,
  onToggleRequests,
  className,
}: ReviewProgressTrackerProps) {
  return (
    <div className={cn('bg-white/95 backdrop-blur-sm border-b border-gray-200 safe-area-top select-none', className)}>
      <div className="flex items-center justify-between px-2 py-1 landscape:py-0.5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer sm:h-11 sm:w-11"
            aria-label="Back"
          >
            <ArrowLeft className="h-7 w-7 sm:h-6 sm:w-6" />
          </button>
        )}
        <div className="min-w-0 flex-1 px-1.5 sm:px-1 flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800 tabular-nums sm:text-xs shrink-0">
            {currentSpread + 1}/{totalPages}
          </span>
          <h1 className="truncate text-sm font-semibold text-gray-500 leading-tight sm:text-xs">{albumTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-0 sm:gap-0.5">
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
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
          {onTogglePreview && (
            <button
              onClick={onTogglePreview}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl transition-colors cursor-pointer sm:h-11 sm:w-11',
                isPreviewMode ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100 active:bg-gray-200'
              )}
              aria-label={isPreviewMode ? 'Exit preview' : 'Preview'}
            >
              <Eye className="h-7 w-7 sm:h-6 sm:w-6" />
            </button>
          )}
          <button
            onClick={onToggleRequests}
            className="relative flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer sm:h-11 sm:w-11"
            aria-label="View requests"
          >
            <MessageSquare className="h-7 w-7 sm:h-6 sm:w-6" />
            {requestCount !== undefined && requestCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white sm:h-4 sm:min-w-[14px] sm:text-[8px]">
                {requestCount > 9 ? '9+' : requestCount}
              </span>
            )}
          </button>
          <button
            onClick={onToggleSummary}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer sm:h-11 sm:w-11"
            aria-label="Review summary"
          >
            <BarChart3 className="h-7 w-7 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer sm:h-11 sm:w-11"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-7 w-7 sm:h-6 sm:w-6" />
            ) : (
              <Maximize2 className="h-7 w-7 sm:h-6 sm:w-6" />
            )}
          </button>
          <button
            onClick={onToggleHelp}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer sm:h-11 sm:w-11"
            aria-label="Help"
          >
            <HelpCircle className="h-7 w-7 sm:h-6 sm:w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
