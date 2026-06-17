import { useSearchParams } from 'react-router-dom';

function studioInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

function generateWhatsAppUrl(phone: string, studioName: string): string {
  const digits = phone.replace(/[\s\-+()]/g, '');
  const message = `Hi ${studioName}, I am unable to access my album. Can you please help me regain access? Thanks.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function AlbumUnavailablePage() {
  const [searchParams] = useSearchParams();
  const studioName = searchParams.get('studio_name') || '';
  const phoneNumber = searchParams.get('phone') || '';
  const noStudio = searchParams.get('no_studio') === '1';

  const initials = studioInitials(studioName);
  const whatsappUrl = studioName && phoneNumber
    ? generateWhatsAppUrl(phoneNumber, studioName)
    : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4 safe-area-inset">
      <div className="w-full max-w-[500px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 text-4xl">📷</span>
          <h1 className="text-2xl font-bold text-gray-900">Album Unavailable</h1>
          <p className="mt-3 text-base text-gray-500 leading-relaxed">
            This album is no longer available.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            It may have been archived, removed, or the link may have expired.
          </p>
        </div>

        {noStudio || !studioName ? (
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Please contact your photography studio for assistance.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-xl font-bold text-gray-600 tracking-wide select-none">
                {initials}
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">{studioName}</h2>
                <p className="mt-2 text-sm text-gray-500 font-mono tracking-wide">
                  📞 {phoneNumber}
                </p>
                <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                  Need access to your album?<br />
                  Contact the studio below.
                </p>
              </div>
            </div>

            {whatsappUrl && (
              <div className="mt-6">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-4 text-base font-bold text-white hover:bg-green-700 transition-colors cursor-pointer min-h-[52px]"
                >
                  💬 WhatsApp Studio
                </a>
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          AlbumFlow &middot; Album proofing for photographers &amp; designers
        </p>
      </div>
    </div>
  );
}
