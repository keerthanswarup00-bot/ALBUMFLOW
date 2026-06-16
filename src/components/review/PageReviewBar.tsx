import { useState } from 'react';
import { Check } from 'lucide-react';

interface PageReviewBarProps {
  currentPage: number;
  totalPages: number;
  isReviewed: boolean;
  onMarkReviewed: () => void;
  onUndoReview: () => void;
  saving?: boolean;
  onRequestChanges?: () => void;
  onVoiceMessage?: () => void;
}

export function PageReviewBar({
  currentPage,
  totalPages,
  isReviewed,
  onMarkReviewed,
  onUndoReview,
  saving,
  onRequestChanges,
  onVoiceMessage,
}: PageReviewBarProps) {
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  function handleApprove() {
    setShowApproveConfirm(true);
  }

  function confirmApprove() {
    onMarkReviewed();
    setShowApproveConfirm(false);
  }

  return (
    <>
      <div className="mx-2 mb-2 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg border border-gray-200/80 px-3 py-2 safe-area-bottom landscape:mx-0 landscape:mb-0 landscape:rounded-none landscape:px-2 landscape:py-1.5">
        {/* Row 1: Spread indicator */}
        <div className="flex items-center justify-center mb-2">
          <span className="text-xs font-semibold text-gray-500 tracking-wide">
            Spread {currentPage + 1} of {totalPages}
          </span>
          {isReviewed && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
              <Check className="h-3 w-3" />
              Done
            </span>
          )}
        </div>

        {/* Row 2: Action buttons — always show Comment/Voice even after approval */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRequestChanges}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="text-sm">✏</span>
            <span>Comment</span>
          </button>
          <button
            onClick={onVoiceMessage}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white border border-gray-300 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="text-sm">🎤</span>
            <span>Voice</span>
          </button>
          {isReviewed ? (
            <>
              <button
                onClick={onUndoReview}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Undo
              </button>
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 border border-green-200 whitespace-nowrap">
                <Check className="h-3.5 w-3.5" />
                Done
              </div>
            </>
          ) : (
            <button
              onClick={handleApprove}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
            >
              {saving ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              <span>Approve</span>
            </button>
          )}
        </div>
      </div>

      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Approve This Spread?</h3>
            <p className="mt-2 text-sm text-gray-500">
              Mark this spread as reviewed. You can undo this later.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="flex-1 rounded-xl border-2 border-gray-300 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
