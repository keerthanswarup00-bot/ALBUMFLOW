interface FloatingActionPillsProps {
  isReviewed: boolean;
  saving: boolean;
  onRequestChange: () => void;
  onVoice: () => void;
  onLooksGood: () => void;
  onUndo: () => void;
}

export function FloatingActionPills({
  isReviewed,
  saving,
  onRequestChange,
  onVoice,
  onLooksGood,
  onUndo,
}: FloatingActionPillsProps) {
  if (isReviewed) {
    return (
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20">
        <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 shadow-lg border border-gray-200/80">
          <button
            onClick={onRequestChange}
            className="flex items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors cursor-pointer min-h-[48px]"
          >
            <span className="text-base">✏️</span>
            <span>Request Change</span>
          </button>
          <button
            onClick={onVoice}
            className="flex items-center gap-1.5 rounded-full bg-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-300 transition-colors cursor-pointer min-h-[48px]"
          >
            <span className="text-base">🎤</span>
            <span>Voice Note</span>
          </button>
          <div className="mx-1 h-6 w-px bg-gray-200" />
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer min-h-[48px]"
          >
            Undo
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 border border-green-200 min-h-[48px]">
            <span>✓</span>
            Looks Good
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20">
      <div className="pointer-events-auto mx-auto flex w-fit items-center gap-3 rounded-2xl bg-white/95 backdrop-blur-md px-5 py-3 shadow-lg border border-gray-200/80">
        <button
          onClick={onRequestChange}
          className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-base font-bold text-white hover:bg-orange-600 active:bg-orange-700 transition-colors cursor-pointer min-h-[48px] shadow-sm"
        >
          <span className="text-lg">✏️</span>
          <span>Request Change</span>
        </button>
        <button
          onClick={onVoice}
          className="flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3 text-base font-bold text-gray-700 hover:bg-gray-200 active:bg-gray-300 transition-colors cursor-pointer min-h-[48px]"
        >
          <span className="text-lg">🎤</span>
          <span>Voice Note</span>
        </button>
        <button
          onClick={onLooksGood}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-base font-bold text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[48px] shadow-sm"
        >
          {saving ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <span className="text-lg">✓</span>
          )}
          <span>Looks Good</span>
        </button>
      </div>
    </div>
  );
}
