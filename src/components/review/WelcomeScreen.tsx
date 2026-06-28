import { Eye } from 'lucide-react';

interface WelcomeScreenProps {
  albumTitle: string;
  clientName: string;
  studioName: string;
  studioLogoUrl: string;
  onStart: () => void;
}

export function WelcomeScreen({ albumTitle, clientName, studioName, studioLogoUrl, onStart }: WelcomeScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#2c1810] safe-area-inset">
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-sm">
          {studioLogoUrl ? (
            <img src={studioLogoUrl} alt={studioName} className="mb-6 h-16 w-16 rounded-2xl object-cover shadow-lg" />
          ) : (
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 shadow-lg">
              <Eye className="h-8 w-8 text-white/60" />
            </div>
          )}

          <p className="text-sm font-medium tracking-wide text-white/50 uppercase">{studioName}</p>

          <h1 className="mt-3 text-2xl font-bold text-white">{albumTitle}</h1>

          {clientName && (
            <p className="mt-1 text-sm text-white/40">{clientName}</p>
          )}

          <div className="mt-2 flex items-center gap-1.5 text-xs text-white/30">
            <span>Album Preview</span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-12">
        <button
          onClick={onStart}
          className="w-full rounded-xl bg-white/10 px-4 py-3.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 active:bg-white/25 transition-colors cursor-pointer"
        >
          View Album
        </button>
      </div>
    </div>
  );
}
