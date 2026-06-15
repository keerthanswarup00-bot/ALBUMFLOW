import { useState } from 'react';
import { Check, Undo2, ChevronLeft, ChevronRight, FileEdit, Mic } from 'lucide-react';

interface PageReviewBarProps {
  currentPage: number;
  totalPages: number;
  isReviewed: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
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
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
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
    <div className="mx-2 mb-3 rounded-2xl bg-white/95 backdrop-blur-sm shadow-xl border border-gray-100/80 px-3 pb-3 pt-2 safe-area-bottom landscape:mx-1 landscape:mb-2 landscape:px-2 landscape:pb-2 landscape:pt-1.5">
      {/* Page indicator */}
      <div className="mb-2 text-center landscape:hidden">
        {showPageInput ? (
          <div className="flex items-center justify-center gap-1.5">
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
              className="h-8 w-16 rounded-lg border border-gray-200 px-2 text-center text-xs font-medium text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              autoFocus
              placeholder="#"
            />
            <span className="text-xs font-medium text-gray-400">of {totalPages}</span>
            <button
              onClick={handlePageSubmit}
              className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Go
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setShowPageInput(true); setPageInput(String(currentPage + 1)); }}
            className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            Page {currentPage + 1} of {totalPages}
          </button>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={!canGoPrev}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer landscape:h-10 landscape:w-10"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5 landscape:h-4 landscape:w-4" />
        </button>

        <div className="flex flex-1 flex-col gap-1.5">
          {isReviewed ? (
            <div className="flex gap-2">
              <button
                disabled
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 text-sm font-semibold text-green-700 cursor-default landscape:py-2 landscape:text-xs"
              >
                <Check className="h-5 w-5" />
                Page Reviewed
              </button>
              <button
                onClick={onUndoReview}
                disabled={saving}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer landscape:h-10 landscape:w-10"
                aria-label="Undo review"
              >
                <Undo2 className="h-5 w-5 landscape:h-4 landscape:w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onMarkReviewed}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer landscape:py-2 landscape:text-xs"
            >
              {saving ? (
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Check className="h-5 w-5" />
              )}
              This Page Looks Good
            </button>
          )}

          {/* Request + Voice buttons */}
          <div className="flex gap-1.5 landscape:gap-1">
            <button
              onClick={onRequestChanges}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer landscape:py-1.5 landscape:px-2 landscape:text-[11px]"
            >
              <FileEdit className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
              <span className="landscape:hidden">Request Changes</span>
              <span className="hidden landscape:inline">Changes</span>
            </button>
            <button
              onClick={onVoiceMessage}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer landscape:py-1.5 landscape:px-2 landscape:text-[11px]"
            >
              <Mic className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
              <span className="landscape:hidden">Voice Message</span>
              <span className="hidden landscape:inline">Voice</span>
            </button>
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer landscape:h-10 landscape:w-10"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5 landscape:h-4 landscape:w-4" />
        </button>
      </div>
    </div>
  );
}
