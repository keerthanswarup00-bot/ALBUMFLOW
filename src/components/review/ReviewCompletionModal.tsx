import { useState } from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';

interface ReviewCompletionModalProps {
  albumId: string;
  totalPages: number;
  studioName: string;
  phoneNumber: string;
  studioLogoUrl?: string;
  onClose: () => void;
}

type ModalStep = 'summary' | 'confirm' | 'success';

export function ReviewCompletionModal({
  albumId,
  totalPages,
  phoneNumber,
  onClose,
}: ReviewCompletionModalProps) {
  const [step, setStep] = useState<ModalStep>('summary');

  const { getPinRequests, getGeneralRequests } = useRequestStore();
  const { getRecordings } = useVoiceStore();
  const { submitReview } = useReviewCycleStore();

  const pinRequests = getPinRequests(albumId);
  const generalRequests = getGeneralRequests(albumId);
  const allVoiceRecordings = getRecordings(albumId);

  const totalChanges = pinRequests.length + generalRequests.length;
  const voiceCount = allVoiceRecordings.length;
  const autoApproved = totalPages;

  function handleOpenConfirm() {
    setStep('confirm');
  }

  function handleConfirm() {
    submitReview(albumId);
    setStep('success');
  }

  function handleWhatsApp() {
    const digits = phoneNumber.replace(/\D/g, '');
    if (!digits) return;
    const message = totalChanges > 0 && voiceCount > 0
      ? `Hello, I have completed my album review. ${totalChanges} change request${totalChanges !== 1 ? 's' : ''} and ${voiceCount} voice note${voiceCount !== 1 ? 's' : ''} submitted.`
      : totalChanges > 0
      ? `Hello, I have completed my album review. ${totalChanges} change request${totalChanges !== 1 ? 's' : ''} submitted.`
      : `Hello, I have completed my album review and approved all ${totalPages} pages.`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank');
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={step === 'summary' ? onClose : undefined} aria-hidden="true" />

      {step === 'summary' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-bg-primary p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Review Complete</h2>
                <p className="mt-1 text-sm text-text-secondary">You have finished reviewing your album.</p>
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2.5">
                <span className="text-sm text-green-700 font-medium">Approved Automatically</span>
                <span className="text-sm font-bold text-green-700">{autoApproved} pages</span>
              </div>
              {totalChanges > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-bg-secondary px-4 py-2.5">
                  <span className="text-sm text-text-secondary">Change Requests</span>
                  <span className="text-sm font-bold text-text-primary">{totalChanges}</span>
                </div>
              )}
              {voiceCount > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-bg-secondary px-4 py-2.5">
                  <span className="text-sm text-text-secondary">Voice Notes</span>
                  <span className="text-sm font-bold text-text-primary">{voiceCount}</span>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleOpenConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[48px]"
              >
                {totalChanges > 0 || voiceCount > 0 ? 'Submit Review' : 'Submit Approval'}
              </button>
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-primary py-3 text-sm font-bold text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer min-h-[48px]"
              >
                Back to Album
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-bg-primary p-6 shadow-xl">
            <div className="flex flex-col gap-3 text-center">
              <h2 className="text-lg font-bold text-text-primary">Submit Review?</h2>
              <p className="text-sm text-text-secondary leading-relaxed">
                {totalChanges > 0 || voiceCount > 0
                  ? `Your feedback will be sent to the studio. ${totalChanges} change request${totalChanges !== 1 ? 's' : ''} ${voiceCount > 0 ? `and ${voiceCount} voice note${voiceCount !== 1 ? 's' : ''} ` : ''}will be reviewed.`
                  : 'All pages are approved. Your confirmation will be sent to the studio.'}
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                After submission you will not be able to add new comments unless the studio uploads a new revision.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={handleConfirm}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[48px]"
              >
                Submit Review
              </button>
              <button
                onClick={() => setStep('summary')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-primary py-3 text-sm font-bold text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[400px] rounded-2xl bg-bg-primary p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary">Review Submitted</h2>
                <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                  {totalChanges > 0 || voiceCount > 0
                    ? 'Thank you for reviewing your album. Your studio has received your feedback.'
                    : 'Thank you for reviewing your album. Your studio has received your approval.'}
                </p>
              </div>
            </div>

            {totalChanges > 0 || voiceCount > 0 ? (
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-green-700">Approved</span>
                  <span className="text-sm font-bold text-green-700">{autoApproved - (totalChanges > 0 || voiceCount > 0 ? 1 : 0)} pages</span>
                </div>
                {totalChanges > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-bg-secondary px-4 py-2.5">
                    <span className="text-sm text-text-secondary">Changes Requested</span>
                    <span className="text-sm font-bold text-text-primary">{totalChanges}</span>
                  </div>
                )}
                {voiceCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-bg-secondary px-4 py-2.5">
                    <span className="text-sm text-text-secondary">Voice Notes</span>
                    <span className="text-sm font-bold text-text-primary">{voiceCount}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-center">
                <p className="text-sm font-medium text-green-700">All {autoApproved} pages approved</p>
              </div>
            )}

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
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-border-primary py-3 text-sm font-bold text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer min-h-[48px]"
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
