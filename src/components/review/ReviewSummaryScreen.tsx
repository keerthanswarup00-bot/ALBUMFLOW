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
        <h2 className="text-lg font-bold text-gray-900">Review Summary</h2>
        <button
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <p className="text-base text-gray-500">{albumTitle}</p>
          {latestUpdate && (
            <p className="mt-0.5 text-sm text-purple-700 font-semibold">
              {latestUpdate.label} &middot; {new Date(latestUpdate.created_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          <div className="rounded-xl bg-green-50 p-4">
            <div className="flex items-center gap-2 text-base text-green-700">
              <Check className="h-5 w-5" />
              <span>Reviewed</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-green-800">{reviewedCount}</p>
            <p className="text-sm text-green-600">Spreads</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-base text-amber-700">
              <ListChecks className="h-5 w-5" />
              <span>Remaining</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-amber-800">{remaining}</p>
            <p className="text-sm text-amber-600">Spreads</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-base text-blue-700">
              <FileText className="h-5 w-5" />
              <span>Comments</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-blue-800">{generalRequests.length}</p>
            <p className="text-sm text-blue-600">Requests</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-base text-amber-700">
              <MapPin className="h-5 w-5" />
              <span>Pins</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-amber-800">{pinRequests.length}</p>
            <p className="text-sm text-amber-600">Requests</p>
          </div>
          <div className="rounded-xl bg-purple-50 p-4">
            <div className="flex items-center gap-2 text-base text-purple-700">
              <Mic className="h-5 w-5" />
              <span>Voice</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-purple-800">{allVoiceRecordings.length}</p>
            <p className="text-sm text-purple-600">Messages</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-base text-gray-600">
              <Eye className="h-5 w-5" />
              <span>Viewed</span>
            </div>
            <p className="mt-1 text-3xl font-bold text-gray-900">{viewedCount}</p>
            <p className="text-sm text-gray-400">Pages</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-base font-bold text-gray-700">Review Progress</span>
            <span className="text-base font-semibold text-gray-500">{completionPercent}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-green-600 transition-all duration-500"
              style={{ width: `${Math.min(completionPercent, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {reviewedCount} of {totalPages} pages reviewed
          </p>
        </div>

        {/* Status badge */}
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-700">Review Status</span>
            <span className={cn(
              'rounded-full px-4 py-1.5 text-sm font-bold',
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
              className="flex w-full items-center justify-between py-1 text-base font-bold text-gray-700 cursor-pointer"
            >
              <span>Pages Not Yet Reviewed ({unreviewedPages.length})</span>
              <ArrowRight
                className={cn(
                  'h-5 w-5 text-gray-400 transition-transform',
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
                    className="flex items-center justify-center rounded-lg border border-gray-200 px-3 py-3 text-base font-bold text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
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
                className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Clock className="h-5 w-5" />
                Timeline
              </button>
            )}
            {onShowCompare && latestUpdate && (
              <button
                onClick={onShowCompare}
                className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Eye className="h-5 w-5" />
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-4 text-lg font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer shadow-md"
            >
              <Send className="h-6 w-6" />
              Submit Review
            </button>
          </div>
        )}

        {/* Approve button (after album updated) */}
        {allReviewed && !approved && status === 'album_updated' && (
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={() => setShowApprovalChecklist(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-4 text-lg font-bold text-white hover:bg-green-800 transition-colors cursor-pointer shadow-md"
            >
              <CheckSquare className="h-6 w-6" />
              Approve Final Album
            </button>
          </div>
        )}

        {/* Also show approve if all reviewed and not submitted yet */}
        {allReviewed && !approved && status === 'draft_review' && (
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={() => setShowApprovalChecklist(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 py-4 text-lg font-bold text-white hover:bg-green-800 transition-colors cursor-pointer shadow-md"
            >
              <CheckSquare className="h-6 w-6" />
              Approve Final Album
            </button>
          </div>
        )}

        {/* Approved state */}
        {showApproved && (
          <div className="border-t border-gray-100 px-4 py-6">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-green-50 py-6">
              <Check className="h-12 w-12 text-green-600" />
              <p className="text-xl font-bold text-green-800">Album Approved Successfully</p>
              <p className="text-base text-green-600">
                {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        {approved && !showApproved && (
          <div className="border-t border-gray-100 px-4 py-4">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 py-4 text-base font-bold text-green-800 border-2 border-green-200">
              <Check className="h-6 w-6" />
              Album Approved
            </div>
          </div>
        )}

        {/* Approved: lock message */}
        {approved && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-center text-base text-gray-500">
              This album has been approved. Contact your designer if further changes are required.
            </div>
          </div>
        )}

        {/* All pages grid */}
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 text-base font-bold text-gray-700">All Pages</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              const isReviewed = unreviewedPages.length < totalPages && !unreviewedPages.includes(pageNum);
              return (
                <button
                  key={pageNum}
                  onClick={() => onNavigateToPage(pageNum)}
                  className={cn(
                    'flex items-center justify-center rounded-lg border px-2 py-2 text-sm font-bold transition-colors cursor-pointer',
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
            <h3 className="text-lg font-bold text-gray-900">Submit Review?</h3>
            <p className="mt-2 text-base text-gray-500">
              You are about to submit your review to the designer. You can still make changes later, but this review will be marked as submitted.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                className="flex-1 rounded-xl bg-blue-700 py-3.5 text-base font-bold text-white hover:bg-blue-800 transition-colors cursor-pointer"
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
            <h3 className="text-lg font-bold text-gray-900">Approve Final Album</h3>
            <p className="mt-2 text-base text-gray-500">
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
                    className="mt-0.5 h-6 w-6 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <span className="text-base text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowApprovalChecklist(false)}
                className="flex-1 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalApproval}
                disabled={!allChecked}
                className="flex-1 rounded-xl bg-green-700 py-3.5 text-base font-bold text-white hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
