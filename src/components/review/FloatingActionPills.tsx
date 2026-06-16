import { Check } from 'lucide-react';

interface FloatingActionPillsProps {
  isReviewed: boolean;
  saving: boolean;
  onComment: () => void;
  onVoice: () => void;
  onApprove: () => void;
  onUndo: () => void;
  className?: string;
}

export function FloatingActionPills({
  isReviewed,
  saving,
  onComment,
  onVoice,
  onApprove,
  onUndo,
  className = '',
}: FloatingActionPillsProps) {
  if (isReviewed) {
    return (
      <div className={`pointer-events-none fixed bottom-0 left-0 right-0 z-20 landscape:bottom-3 ${className}`}>
        <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 shadow-lg border border-gray-200/80">
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer min-h-[44px]"
          >
            <span className="text-base">✏</span>
            <span>Comment</span>
          </button>
          <button
            onClick={onVoice}
            className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer min-h-[44px]"
          >
            <span className="text-base">🎤</span>
            <span>Voice</span>
          </button>
          <div className="mx-1 h-6 w-px bg-gray-200" />
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer min-h-[44px]"
          >
            Undo
          </button>
          <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 border border-green-200 min-h-[44px]">
            <Check className="h-4 w-4" />
            Done
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pointer-events-none fixed bottom-0 left-0 right-0 z-20 landscape:bottom-3 ${className}`}>
      <div className="pointer-events-auto mx-auto flex w-fit items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-2 shadow-lg border border-gray-200/80">
        <button
          onClick={onComment}
          className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer min-h-[44px]"
        >
          <span className="text-base">✏</span>
          <span>Comment</span>
        </button>
        <button
          onClick={onVoice}
          className="flex items-center gap-1.5 rounded-full bg-white border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer min-h-[44px]"
        >
          <span className="text-base">🎤</span>
          <span>Voice</span>
        </button>
        <button
          onClick={onApprove}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm min-h-[44px]"
        >
          {saving ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>Approve</span>
        </button>
      </div>
    </div>
  );
}
