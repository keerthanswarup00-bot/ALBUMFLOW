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
      <div className="flex items-center justify-between px-2 py-1 landscape:py-0 landscape:px-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer landscape:h-8 landscape:w-8"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 landscape:h-4 landscape:w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1 px-1.5 landscape:px-1">
          <h1 className="truncate text-xs font-semibold text-gray-600 leading-tight landscape:text-[10px]">{albumTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-0 landscape:gap-0.5">
          <div className="hidden sm:flex items-center gap-1.5 mr-2 landscape:mr-1 landscape:gap-1">
            <div className="h-1.5 w-16 rounded-full bg-gray-200 overflow-hidden landscape:hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-gray-500 tabular-nums landscape:text-[9px]">
              {reviewedCount}/{totalPages}
            </span>
          </div>
          <button
            onClick={onToggleRequests}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer landscape:h-7 landscape:w-7"
            aria-label="View requests"
          >
            <MessageSquare className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
            {requestCount !== undefined && requestCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white landscape:h-3.5 landscape:min-w-[12px] landscape:text-[7px]">
                {requestCount > 9 ? '9+' : requestCount}
              </span>
            )}
          </button>
          <button
            onClick={onToggleSummary}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer landscape:h-7 landscape:w-7"
            aria-label="Review summary"
          >
            <BarChart3 className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer landscape:h-7 landscape:w-7"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
            ) : (
              <Maximize2 className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
            )}
          </button>
          <button
            onClick={onToggleHelp}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer landscape:h-7 landscape:w-7"
            aria-label="Help"
          >
            <HelpCircle className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
