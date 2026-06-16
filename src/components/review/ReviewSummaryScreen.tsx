import { useState } from 'react';
import { X, Check, Eye, ArrowRight, ListChecks, CheckSquare, FileText, MapPin, Mic, Send, Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useReviewStore } from '@/store/reviewStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUpdateStore } from '@/store/updateStore';
import { useUIStore } from '@/store/uiStore';
import type { ApprovalChecklistItem } from '@/types/viewer';

interface ReviewSummaryScreenProps {
  albumId: string;
  albumTitle: string;
  totalPages: number;
  reviewedCount: number;
  viewedCount: number;
  completionPercent: number;
  unreviewedPages: number[];
  onNavigateToPage: (pageNumber: number) => void;
  onClose: () => void;
  onShowTimeline?: () => void;
  onShowCompare?: () => void;
}

const APPROVAL_CHECKLIST_ITEMS: ApprovalChecklistItem[] = [
  { label: 'I reviewed all pages', checked: false },
  { label: 'I checked names and spellings', checked: false },
  { label: 'I checked dates', checked: false },
  { label: 'I checked photo selections', checked: false },
  { label: 'I understand production will begin after approval', checked: false },
];

export function ReviewSummaryScreen({
  albumId,
  albumTitle,
  totalPages,
  reviewedCount,
  viewedCount,
  completionPercent,
  unreviewedPages,
  onNavigateToPage,
  onClose,
  onShowTimeline,
  onShowCompare,
}: ReviewSummaryScreenProps) {
  const [showUnreviewed, setShowUnreviewed] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showApprovalChecklist, setShowApprovalChecklist] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ApprovalChecklistItem[]>(
    APPROVAL_CHECKLIST_ITEMS.map((i) => ({ ...i }))
  );
  const [showApproved, setShowApproved] = useState(false);

  const { isAlbumApproved } = useReviewStore();
  const { getStatus, isApproved, submitReview, submitApproval } = useReviewCycleStore();
  const { getPinRequests, getGeneralRequests } = useRequestStore();
  const { getRecordings } = useVoiceStore();
  const { getLatestUpdate } = useUpdateStore();
  const { showToast } = useUIStore();

  const remaining = totalPages - reviewedCount;
  const allReviewed = remaining === 0 && totalPages > 0;
  const approved = isAlbumApproved(albumId) || isApproved(albumId);
  const status = getStatus(albumId);

  const allVoiceRecordings = getRecordings(albumId);
  const pinRequests = getPinRequests(albumId);
  const generalRequests = getGeneralRequests(albumId);
  const latestUpdate = getLatestUpdate(albumId);

  function handleSubmitReview() {
    submitReview(albumId);
    setShowSubmitConfirm(false);
    onClose();
    showToast('Review submitted to designer', 'success');
  }

  function handleToggleChecklist(index: number) {
    setChecklistItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }

  function handleFinalApproval() {
    submitApproval(albumId, checklistItems);
    setShowApprovalChecklist(false);
    setShowApproved(true);
    showToast('Album approved successfully', 'success');
  }

  const allChecked = checklistItems.every((i) => i.checked);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Review Summary</h2>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm text-gray-500">{albumTitle}</p>
          {latestUpdate && (
            <p className="mt-0.5 text-xs text-purple-600">
              {latestUpdate.label} &middot; {new Date(latestUpdate.created_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Stats cards: Pages Reviewed, Remaining, Requests, Voice */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <div className="rounded-xl bg-green-50 p-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="h-4 w-4" />
              <span>Reviewed</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-700">{reviewedCount}</p>
            <p className="text-xs text-green-500">Spreads</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <ListChecks className="h-4 w-4" />
              <span>Remaining</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-700">{remaining}</p>
            <p className="text-xs text-amber-500">Spreads</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <FileText className="h-4 w-4" />
              <span>General</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-700">{generalRequests.length}</p>
            <p className="text-xs text-blue-500">Requests</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <MapPin className="h-4 w-4" />
              <span>Pin</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-amber-700">{pinRequests.length}</p>
            <p className="text-xs text-amber-500">Requests</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-4">
            <div className="flex items-center gap-2 text-sm text-purple-600">
              <Mic className="h-4 w-4" />
              <span>Voice</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-purple-700">{allVoiceRecordings.length}</p>
            <p className="text-xs text-purple-500">Messages</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" />
              <span>Viewed</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900">{viewedCount}</p>
            <p className="text-xs text-gray-400">Pages</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">Review Progress</span>
            <span className="text-xs text-gray-400">{completionPercent}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${Math.min(completionPercent, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {reviewedCount} of {totalPages} pages reviewed
          </p>
        </div>

        {/* Status badge */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Review Status</span>
            <span className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              status === 'draft_review' && 'bg-gray-100 text-gray-700',
              status === 'review_submitted' && 'bg-blue-100 text-blue-700',
              status === 'designer_reviewing' && 'bg-amber-100 text-amber-700',
              status === 'album_updated' && 'bg-purple-100 text-purple-700',
              status === 'approved' && 'bg-green-100 text-green-700',
            )}>
              {status === 'draft_review' && 'Draft Review'}
              {status === 'review_submitted' && 'Review Submitted'}
              {status === 'designer_reviewing' && 'Designer Reviewing'}
              {status === 'album_updated' && 'Album Updated'}
              {status === 'approved' && 'Approved'}
            </span>
          </div>
        </div>

        {/* Unreviewed pages */}
        {unreviewedPages.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3">
            <button
              onClick={() => setShowUnreviewed(!showUnreviewed)}
              className="flex w-full items-center justify-between py-1 text-sm font-medium text-gray-700 cursor-pointer"
            >
              <span>Pages Not Yet Reviewed ({unreviewedPages.length})</span>
              <ArrowRight
                className={cn(
                  'h-4 w-4 text-gray-400 transition-transform',
                  showUnreviewed && 'rotate-90'
                )}
              />
            </button>
            {showUnreviewed && (
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {unreviewedPages.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => onNavigateToPage(pageNum)}
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timeline and Compare links */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex gap-3">
            {onShowTimeline && (
              <button
                onClick={onShowTimeline}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                Timeline
              </button>
            )}
            {onShowCompare && latestUpdate && (
              <button
                onClick={onShowCompare}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                Compare Changes
              </button>
            )}
          </div>
        </div>

        {/* Submit Review button */}
        {!approved && status === 'draft_review' && (
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Send className="h-5 w-5" />
              Submit Review
            </button>
          </div>
        )}

        {/* Approve button (after album updated) */}
        {allReviewed && !approved && status === 'album_updated' && (
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={() => setShowApprovalChecklist(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-5 w-5" />
              Approve Final Album
            </button>
          </div>
        )}

        {/* Also show approve if all reviewed and not submitted yet */}
        {allReviewed && !approved && status === 'draft_review' && (
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={() => setShowApprovalChecklist(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors cursor-pointer"
            >
              <CheckSquare className="h-5 w-5" />
              Approve Final Album
            </button>
          </div>
        )}

        {/* Approved state */}
        {showApproved && (
          <div className="border-t border-gray-100 px-4 py-6">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-green-50 py-6">
              <Check className="h-10 w-10 text-green-600" />
              <p className="text-lg font-semibold text-green-700">Album Approved Successfully</p>
              <p className="text-sm text-green-600">
                {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        {approved && !showApproved && (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-3.5 text-sm font-semibold text-green-700">
              <Check className="h-5 w-5" />
              Album Approved
            </div>
          </div>
        )}

        {/* Approved: lock message */}
        {approved && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center text-sm text-gray-500">
              This album has been approved. Contact your designer if further changes are required.
            </div>
          </div>
        )}

        {/* All pages grid */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 text-sm font-medium text-gray-700">All Pages</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isReviewed = unreviewedPages.length < totalPages && !unreviewedPages.includes(pageNum);
              return (
                <button
                  key={pageNum}
                  onClick={() => onNavigateToPage(pageNum)}
                  className={cn(
                    'flex items-center justify-center rounded-lg border px-2 py-2 text-xs font-medium transition-colors cursor-pointer',
                    isReviewed
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {pageNum}
                  {isReviewed && <Check className="ml-0.5 h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit Review confirmation */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Submit Review?</h3>
            <p className="mt-2 text-sm text-gray-500">
              You are about to submit your review to the designer. You can still make changes later, but this review will be marked as submitted.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval checklist */}
      {showApprovalChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Approve Final Album</h3>
            <p className="mt-2 text-sm text-gray-500">
              Please confirm each item before approving:
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {checklistItems.map((item, index) => (
                <label
                  key={index}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleChecklist(index)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowApprovalChecklist(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalApproval}
                disabled={!allChecked}
                className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Approve Album
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
