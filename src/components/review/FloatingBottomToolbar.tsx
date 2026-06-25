import { ChevronLeft, ChevronRight, MessageSquare, Mic, Undo2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FloatingBottomToolbarProps {
  currentSpread: number;
  totalSpreads: number;
  hasFeedback: boolean;
  isPinMode: boolean;
  visible: boolean;
  onAddComment: () => void;
  onAddVoice: () => void;
  onUndo: () => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function FloatingBottomToolbar({
  currentSpread,
  totalSpreads,
  hasFeedback,
  isPinMode,
  visible,
  onAddComment,
  onAddVoice,
  onUndo,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: FloatingBottomToolbarProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-20 flex items-center justify-center pb-4 safe-area-bottom transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )}
    >
      <div className="flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-lg px-2 py-1.5 shadow-xl border border-white/10">
        <button
          onClick={onAddComment}
          disabled={isPinMode}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-30 transition-colors cursor-pointer"
          aria-label="Add comment"
        >
          <MessageSquare className="h-4 w-4" />
        </button>

        <button
          onClick={onAddVoice}
          disabled={isPinMode}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-30 transition-colors cursor-pointer"
          aria-label="Add voice note"
        >
          <Mic className="h-4 w-4" />
        </button>

        {hasFeedback && (
          <button
            onClick={onUndo}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
        )}

        <div className="mx-1 h-5 w-px bg-white/15" />

        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
          aria-label="Previous"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="min-w-[3rem] text-center text-xs font-semibold text-white/80 tabular-nums select-none">
          {currentSpread + 1}/{totalSpreads}
        </span>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors cursor-pointer"
          aria-label="Next"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
