import { Check } from 'lucide-react';

interface FloatingActionPillsProps {
  isReviewed: boolean;
  saving: boolean;
  onComment: () => void;
  onVoice: () => void;
  onApprove: () => void;
  onUndo: () => void;
}

export function FloatingActionPills({
  isReviewed,
  saving,
  onComment,
  onVoice,
  onApprove,
  onUndo,
}: FloatingActionPillsProps) {
  if (isReviewed) {
    return (
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 landscape:bottom-2">
        <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 shadow-lg border border-gray-200/80">
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="text-sm">✏</span>
            <span>Comment</span>
          </button>
          <button
            onClick={onVoice}
            className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-3.5 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="text-sm">🎤</span>
            <span>Voice</span>
          </button>
          <div className="mx-1 h-5 w-px bg-gray-200" />
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Undo
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-3.5 py-1.5 text-xs font-bold text-green-700 border border-green-200">
            <Check className="h-3.5 w-3.5" />
            Done
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 landscape:bottom-2">
      <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-3 py-1.5 shadow-lg border border-gray-200/80">
        <button
          onClick={onComment}
          className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
        >
          <span className="text-sm">✏</span>
          <span>Comment</span>
        </button>
        <button
          onClick={onVoice}
          className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
        >
          <span className="text-sm">🎤</span>
          <span>Voice</span>
        </button>
        <button
          onClick={onApprove}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
        >
          {saving ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          <span>Approve</span>
        </button>
      </div>
    </div>
  );
}
