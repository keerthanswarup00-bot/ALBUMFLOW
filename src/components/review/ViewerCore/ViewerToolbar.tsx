import { ArrowLeft, MessageCircle, Mic, Undo2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ViewerToolbarProps {
  currentSpread: number;
  totalSpreads: number;
  canGoPrev: boolean;
  canGoNext: boolean;
  hasFeedback: boolean;
  visible: boolean;
  onPrev: () => void;
  onNext: () => void;
  onAddComment: () => void;
  onAddVoice: () => void;
  onUndo: () => void;
  onFinish: () => void;
  onBack: () => void;
}

export function ViewerToolbar({
  currentSpread,
  totalSpreads,
  canGoPrev,
  canGoNext,
  hasFeedback,
  visible,
  onPrev,
  onNext,
  onAddComment,
  onAddVoice,
  onUndo,
  onFinish,
  onBack,
}: ViewerToolbarProps) {
  const show = visible;

  return (
    <>
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between transition-opacity duration-500 ease-out"
        style={{
          opacity: show ? 1 : 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)',
          paddingBottom: 0,
          pointerEvents: show ? 'auto' : 'none',
        }}
      >
        <button
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <button
          onClick={onFinish}
          className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Finish Review
        </button>
      </div>

      {/* Bottom toolbar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-500 ease-out"
        style={{
          opacity: show ? 1 : 0,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          pointerEvents: show ? 'auto' : 'none',
        }}
      >
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-black/50 px-3 py-2 backdrop-blur-md">
          <button
            onClick={onAddComment}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Add comment"
          >
            <MessageCircle className="h-5 w-5" />
          </button>

          <button
            onClick={onAddVoice}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Add voice message"
          >
            <Mic className="h-5 w-5" />
          </button>

          {hasFeedback && (
            <button
              onClick={onUndo}
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Undo feedback"
            >
              <Undo2 className="h-5 w-5" />
            </button>
          )}

          <div className="mx-1 h-6 w-px bg-white/20" />

          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <span className="min-w-[4rem] text-center text-xs font-medium text-white/90 select-none">
            {currentSpread + 1} / {totalSpreads}
          </span>

          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
