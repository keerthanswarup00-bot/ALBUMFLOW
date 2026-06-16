import { useSearchParams } from 'react-router-dom';
import { Phone, Building2, AlertTriangle } from 'lucide-react';

export function AlbumUnavailablePage() {
  const [searchParams] = useSearchParams();
  const studioName = searchParams.get('studio_name') || 'the studio';
  const ownerName = searchParams.get('owner_name') || '';
  const phoneNumber = searchParams.get('phone') || '';
  const albumTitle = searchParams.get('album') || 'Album';

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Album Unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">
            &ldquo;{albumTitle}&rdquo; is no longer available for viewing.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{studioName}</p>
              {ownerName && (
                <p className="text-xs text-gray-500">{ownerName}</p>
              )}
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-600">
            If you have any questions or need assistance, please contact the studio directly.
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

        <p className="mt-6 text-center text-xs text-gray-400">
          AlbumFlow &middot; Album proofing for photographers &amp; designers
        </p>
      </div>
    </div>
  );
}
