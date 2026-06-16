import { CheckCircle, Building2, Phone, ArrowLeft } from 'lucide-react';

interface ReviewCompletedPageProps {
  albumTitle: string;
  studioName: string;
  ownerName: string;
  phoneNumber: string;
  studioLogoUrl?: string;
  onBack: () => void;
}

export function ReviewCompletedPage({
  albumTitle,
  studioName,
  ownerName,
  phoneNumber,
  studioLogoUrl,
  onBack,
}: ReviewCompletedPageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Review Complete!</h1>
          <p className="mt-2 text-sm text-gray-500">
            &ldquo;{albumTitle}&rdquo; has been approved.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Your designer has been notified and will proceed with the next steps.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            {studioLogoUrl ? (
              <img src={studioLogoUrl} alt={studioName} className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-900">{studioName}</p>
              {ownerName && (
                <p className="text-xs text-gray-500">{ownerName}</p>
              )}
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            If you have any questions, feel free to reach out to the studio directly.
          </p>

          {phoneNumber && (
            <a
              href={`tel:${phoneNumber.replace(/\D/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Call {studioName}
            </a>
          )}
        </div>

        <button
          onClick={onBack}
          className="mt-6 mx-auto flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to album
        </button>

        <p className="mt-6 text-center text-xs text-gray-400">
          AlbumFlow &middot; Album proofing for photographers &amp; designers
        </p>
      </div>
    </div>
  );
}
