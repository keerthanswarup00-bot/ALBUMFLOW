import { useState } from 'react';
import { Check, Phone } from 'lucide-react';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';

interface ReviewCompletionModalProps {
  albumId: string;
  totalPages: number;
  studioName: string;
  ownerName: string;
  phoneNumber: string;
  studioLogoUrl?: string;
  onClose: () => void;
}

export function ReviewCompletionModal({
  albumId,
  totalPages,
  studioName,
  ownerName,
  phoneNumber,
  studioLogoUrl,
  onClose,
}: ReviewCompletionModalProps) {
  const [step, setStep] = useState<'initial' | 'submitted'>('initial');

  const { getPinRequests, getGeneralRequests } = useRequestStore();
  const { getRecordings } = useVoiceStore();
  const { submitReview, submitApproval } = useReviewCycleStore();

  const pinRequests = getPinRequests(albumId);
  const generalRequests = getGeneralRequests(albumId);
  const allVoiceRecordings = getRecordings(albumId);

  const totalChanges = pinRequests.length + generalRequests.length;
  const hasChanges = totalChanges > 0;
  const voiceCount = allVoiceRecordings.length;

  function handleSubmitFeedback() {
    submitReview(albumId);
    setStep('submitted');
  }

  function handleApproveAlbum() {
    submitApproval(albumId, [
      { label: 'I reviewed all pages', checked: true },
      { label: 'I checked names and spellings', checked: true },
      { label: 'I checked dates', checked: true },
      { label: 'I checked photo selections', checked: true },
      { label: 'I understand production will begin after approval', checked: true },
    ]);
    setStep('submitted');
  }

  function handleCallStudio() {
    const digits = phoneNumber.replace(/\D/g, '');
    window.location.href = `tel:${digits}`;
  }

  if (step === 'submitted') {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <Check className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Feedback Sent Successfully</h2>
                <p className="mt-1 text-sm text-gray-500">Your studio has received your review.</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                {studioLogoUrl ? (
                  <img src={studioLogoUrl} alt={studioName} className="h-10 w-10 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-bold text-lg">
                    {studioName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{studioName}</p>
                  {ownerName && <p className="text-xs text-gray-500">{ownerName}</p>}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {phoneNumber && (
                <button
                  onClick={handleCallStudio}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[48px]"
                >
                  <Phone className="h-5 w-5" />
                  Call Studio
                </button>
              )}
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (hasChanges) {
    return (
      <>
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <Check className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review Complete</h2>
                <p className="mt-1 text-sm text-gray-500">You have reviewed all {totalPages} spreads.</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-700">Changes Requested</span>
                <span className="text-sm font-bold text-gray-900">{totalChanges}</span>
              </div>
              {voiceCount > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm text-gray-700">Voice Notes</span>
                  <span className="text-sm font-bold text-gray-900">{voiceCount}</span>
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Submit your feedback to the studio.
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={handleSubmitFeedback}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer min-h-[48px]"
              >
                Submit Feedback
              </button>
              <button
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-[480px] rounded-2xl bg-white p-8 shadow-xl">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">🎉</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Album Ready For Approval</h2>
              <p className="mt-1 text-sm text-gray-500">
                You reviewed all {totalPages} spreads. No changes were requested.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleApproveAlbum}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-base font-bold text-white hover:bg-green-700 transition-colors cursor-pointer min-h-[48px]"
            >
              <Check className="h-5 w-5" />
              Approve Final Album
            </button>
            <button
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer min-h-[48px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
