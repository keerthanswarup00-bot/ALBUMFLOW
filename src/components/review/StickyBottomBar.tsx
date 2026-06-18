import { ChevronLeft, ChevronRight, MessageSquare, Mic, Undo2 } from 'lucide-react';

interface StickyBottomBarProps {
  currentSpread: number;
  totalSpreads: number;
  hasFeedback: boolean;
  isPinMode: boolean;
  onAddComment: () => void;
  onAddVoice: () => void;
  onUndo: () => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function StickyBottomBar({
  currentSpread,
  totalSpreads,
  hasFeedback,
  isPinMode,
  onAddComment,
  onAddVoice,
  onUndo,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: StickyBottomBarProps) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 safe-area-bottom">
      <div className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-2 rounded-t-2xl bg-bg-primary/95 backdrop-blur-md shadow-lg border border-border-primary/80 px-3 py-2.5">
        <div className="flex items-center gap-1">
          <button
            onClick={onAddComment}
            disabled={isPinMode}
            className="flex items-center gap-1.5 rounded-xl px-3.5 min-h-[44px] text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Add comment"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Comment</span>
          </button>
          <button
            onClick={onAddVoice}
            disabled={isPinMode}
            className="flex items-center gap-1.5 rounded-xl px-3.5 min-h-[44px] text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Add voice note"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Voice</span>
          </button>
          {hasFeedback && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1.5 rounded-xl px-3.5 min-h-[44px] text-sm font-semibold text-text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
              <span className="hidden sm:inline">Undo</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-text-secondary tabular-nums shrink-0">
            {currentSpread + 1} / {totalSpreads}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-text-secondary hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
