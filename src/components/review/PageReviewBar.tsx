import { useState } from 'react';
import { Check, Undo2, FileEdit, Mic } from 'lucide-react';

interface PageReviewBarProps {
  currentPage: number;
  totalPages: number;
  isReviewed: boolean;
  onMarkReviewed: () => void;
  onUndoReview: () => void;
  saving?: boolean;
  onRequestChanges?: () => void;
  onVoiceMessage?: () => void;
  onGoToPage?: (page: number) => void;
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
  onGoToPage,
}: PageReviewBarProps) {
  const [showPageInput, setShowPageInput] = useState(false);
  const [pageInput, setPageInput] = useState('');

  function handlePageSubmit() {
    const page = parseInt(pageInput, 10);
    if (page >= 1 && page <= totalPages && onGoToPage) {
      onGoToPage(page);
    }
    setShowPageInput(false);
    setPageInput('');
  }

  return (
    <>
      {/* Bottom floating dock */}
      <div className="mx-3 mb-4 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-gray-100/80 px-4 pb-4 pt-3 safe-area-bottom landscape:mx-2 landscape:mb-3">
        {/* Page indicator */}
        <div className="mb-3 text-center">
          {showPageInput ? (
            <div className="flex items-center justify-center gap-2">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePageSubmit();
                  if (e.key === 'Escape') { setShowPageInput(false); setPageInput(''); }
                }}
                className="h-10 w-20 rounded-xl border border-gray-200 px-3 text-center text-sm font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                autoFocus
                placeholder="#"
              />
              <span className="text-sm font-medium text-gray-400">of {totalPages}</span>
              <button
                onClick={handlePageSubmit}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Go
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowPageInput(true); setPageInput(String(currentPage + 1)); }}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              Page {currentPage + 1} of {totalPages}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {isReviewed ? (
            <div className="flex gap-3">
              <div className="flex flex-1 items-center justify-center gap-2.5 rounded-xl bg-green-100 py-3.5 text-base font-semibold text-green-700 cursor-default">
                <Check className="h-6 w-6" />
                Page Reviewed
              </div>
              <button
                onClick={onUndoReview}
                disabled={saving}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Undo review"
              >
                <Undo2 className="h-6 w-6" />
              </button>
            </div>
          ) : (
            <button
              onClick={onMarkReviewed}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 py-3.5 text-base font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? (
                <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-6 w-6" />
              )}
              This Page Looks Good
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onRequestChanges}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <FileEdit className="h-6 w-6" />
              <span>Request Changes</span>
            </button>
            <button
              onClick={onVoiceMessage}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-xl border border-gray-200 py-3.5 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
            >
              <Mic className="h-6 w-6" />
              <span>Voice Note</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
