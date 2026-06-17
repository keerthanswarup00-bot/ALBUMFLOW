import { useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import { useReviewStore } from '@/store/reviewStore';

interface ReviewCompletionModalProps {
  albumId: string;
  totalPages: number;
  studioName: string;
  ownerName: string;
  phoneNumber: string;
  studioLogoUrl?: string;
  onClose: () => void;
}

type ModalStep = 'summary' | 'confirm' | 'success' | 'approved_success';

export function ReviewCompletionModal({
  albumId,
  totalPages,
  studioName,
  ownerName,
  phoneNumber,
  studioLogoUrl,
  onClose,
}: ReviewCompletionModalProps) {
  const [step, setStep] = useState<ModalStep>('summary');
  const [pendingAction, setPendingAction] = useState<'feedback' | 'approve' | null>(null);

  const { getPinRequests, getGeneralRequests } = useRequestStore();
  const { getRecordings } = useVoiceStore();
  const { submitReview, submitApproval } = useReviewCycleStore();
  const { getReviewedCount } = useReviewStore();

  const pinRequests = getPinRequests(albumId);
  const generalRequests = getGeneralRequests(albumId);
  const allVoiceRecordings = getRecordings(albumId);

  const totalChanges = pinRequests.length + generalRequests.length;
  const voiceCount = allVoiceRecordings.length;
  const hasFeedback = totalChanges > 0 || voiceCount > 0;

  const reviewedHalves = getReviewedCount(albumId);
  const reviewedSpreads = Math.floor(reviewedHalves / 2);

  function handleOpenConfirm(action: 'feedback' | 'approve') {
    setPendingAction(action);
    setStep('confirm');
  }

  function handleConfirm() {
    if (pendingAction === 'feedback') {
      submitReview(albumId);
      setStep('success');
    } else if (pendingAction === 'approve') {
      submitApproval(albumId, [
        { label: 'I reviewed all pages', checked: true },
        { label: 'I checked names and spellings', checked: true },
        { label: 'I checked dates', checked: true },
        { label: 'I checked photo selections', checked: true },
        { label: 'I understand production will begin after approval', checked: true },
      ]);
      setStep('approved_success');
    }
  }

  function handleCancelConfirm() {
    setPendingAction(null);
    setStep('summary');
  }

  function handleWhatsApp() {
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits) return;
    const message = 'Hello, I have completed my album review and submitted my feedback.';
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={step === 'summary' ? onClose : undefined} />

      {/* Summary step */}
      {step === 'summary' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Review Complete</h2>
                <p className="mt-1 text-sm text-gray-500">You have finished reviewing your album.</p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                <span className="text-sm text-gray-600">Changes Requested</span>
                <span className="text-sm font-bold text-gray-900">{totalChanges}</span>
              </div>
              {voiceCount > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                  <span className="text-sm text-gray-600">Voice Notes</span>
                  <span className="text-sm font-bold text-gray-900">{voiceCount}</span>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                <span className="text-sm text-gray-600">Spreads Reviewed</span>
                <span className="text-sm font-bold text-gray-900">{reviewedSpreads} / {totalPages}</span>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              Your feedback is ready to be sent to the studio.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {hasFeedback ? (
                <button
                  onClick={() => handleOpenConfirm('feedback')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[48px]"
                >
                  Submit Feedback
                </button>
              ) : (
                <button
                  onClick={() => handleOpenConfirm('approve')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors cursor-pointer min-h-[48px]"
                >
                  <Check className="h-4 w-4" />
                  Approve Album
                </button>
              )}
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Back to Album
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm step — Submit Feedback */}
      {step === 'confirm' && pendingAction === 'feedback' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-3 text-center">
              <h2 className="text-lg font-bold text-gray-900">Send Feedback?</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Your review will be sent to the studio.
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                After submission you will not be able to add new comments unless the studio uploads a new revision.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[48px]"
              >
                Send Feedback
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm step — Approve Album */}
      {step === 'confirm' && pendingAction === 'approve' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-3 text-center">
              <h2 className="text-lg font-bold text-gray-900">Approve Final Album?</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                You are confirming that no further changes are required.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors cursor-pointer min-h-[48px]"
              >
                <Check className="h-4 w-4" />
                Approve Album
              </button>
              <button
                onClick={handleCancelConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success — Feedback submitted */}
      {step === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Feedback Sent</h2>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  Thank you for reviewing your album. Your studio has received your feedback and will contact you once the requested changes are completed.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                {studioLogoUrl ? (
                  <img src={studioLogoUrl} alt={studioName} className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-bold text-base">
                    {studioName.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-900">{studioName}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {phoneNumber && (
                <button
                  onClick={handleWhatsApp}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors cursor-pointer min-h-[48px]"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Studio
                </button>
              )}
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success — Album approved */}
      {step === 'approved_success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Album Approved</h2>
                <p className="mt-1 text-sm text-gray-500 leading-relaxed">
                  Thank you for reviewing your album. Your approval has been sent to the studio.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                {studioLogoUrl ? (
                  <img src={studioLogoUrl} alt={studioName} className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-bold text-base">
                    {studioName.charAt(0)}
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-900">{studioName}</p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {phoneNumber && (
                <button
                  onClick={handleWhatsApp}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 transition-colors cursor-pointer min-h-[48px]"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Studio
                </button>
              )}
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
