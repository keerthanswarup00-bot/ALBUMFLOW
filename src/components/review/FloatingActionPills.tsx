interface FloatingActionPillsProps {
  isReviewed: boolean;
  saving: boolean;
  showOptions: boolean;
  onRequestChange: () => void;
  onAddComment: () => void;
  onAddVoice: () => void;
  onLooksGood: () => void;
  onUndo: () => void;
  onCloseOptions: () => void;
}

export function FloatingActionPills({
  isReviewed,
  saving,
  showOptions,
  onRequestChange,
  onAddComment,
  onAddVoice,
  onLooksGood,
  onUndo,
  onCloseOptions,
}: FloatingActionPillsProps) {
  if (showOptions) {
    return (
      <>
        <div className="fixed inset-0 z-20" onClick={onCloseOptions} />
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-[76px] safe-area-bottom">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/80 px-3 py-2.5">
            <button
              onClick={onAddComment}
              className="flex items-center gap-2 rounded-xl px-4 h-[44px] text-sm font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
            >
              <span className="text-base">💬</span>
              <span>Add Comment</span>
            </button>
            <button
              onClick={onAddVoice}
              className="flex items-center gap-2 rounded-xl px-4 h-[44px] text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <span className="text-base">🎤</span>
              <span>Record Voice</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  if (isReviewed) {
    return (
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 flex justify-center pb-4 safe-area-bottom">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/80 h-[52px] px-1">
          <button
            onClick={onRequestChange}
            className="flex items-center gap-1.5 rounded-full px-4 h-[44px] text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 transition-colors cursor-pointer"
          >
            <span className="text-base">✏️</span>
            <span>Change</span>
          </button>
          <div className="mx-0.5 h-6 w-px bg-gray-200" />
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 rounded-full px-3 h-[44px] text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Undo
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 h-[44px] text-sm font-bold text-green-700 border border-green-200">
            <span>✓</span>
            <span>Good</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 flex justify-center pb-4 safe-area-bottom">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/80 h-[52px] px-1">
        <button
          onClick={onRequestChange}
          className="flex items-center gap-1.5 rounded-full px-4 h-[44px] text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-colors cursor-pointer"
        >
          <span className="text-base">✏️</span>
          <span>Change</span>
        </button>
        <button
          onClick={onLooksGood}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full px-4 h-[44px] text-sm font-bold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {saving ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span className="text-base">✓</span>
          )}
          <span>Good</span>
        </button>
      </div>
    </div>
  );
}
