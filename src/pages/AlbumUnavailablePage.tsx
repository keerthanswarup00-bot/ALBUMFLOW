import { useSearchParams, Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';

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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-primary p-4 safe-area-inset">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 text-4xl">📷</span>
          <h1 className="text-2xl font-bold text-text-primary">Album Unavailable</h1>
          <p className="mt-3 text-base text-text-secondary leading-relaxed">
            This album is no longer available.
          </p>
          <p className="mt-1 text-sm text-text-muted">
            It may have been archived, removed, or the link may have expired.
          </p>
        </div>

        {noStudio || !studioName ? (
          <div className="text-center">
            <p className="text-sm text-text-muted">
              Please contact your photography studio for assistance.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border-primary bg-bg-elevated p-8 shadow-sm dark:shadow-black/40">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary text-xl font-bold text-text-secondary tracking-wide select-none">
                {initials}
              </div>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-text-primary">{studioName}</h2>
                <p className="mt-2 text-sm text-text-secondary font-mono tracking-wide">
                  📞 {phoneNumber}
                </p>
                <p className="mt-4 text-sm text-text-secondary leading-relaxed">
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

        <div className="mt-8 flex items-center justify-center gap-4 text-xs text-text-muted">
          <Link to={ROUTES.PRIVACY_POLICY} className="hover:text-text-secondary transition-colors">Privacy Policy</Link>
          <span>&middot;</span>
          <Link to={ROUTES.TERMS} className="hover:text-text-secondary transition-colors">Terms of Service</Link>
          <span>&middot;</span>
          <Link to={ROUTES.COOKIE_POLICY} className="hover:text-text-secondary transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}
