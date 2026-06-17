import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Eye, Pin, ThumbsUp, MessageSquare } from 'lucide-react';

interface WelcomeScreenProps {
  albumTitle: string;
  clientName: string;
  onStart: () => void;
}

const features = [
  { icon: Pin, text: 'Tap to place a pin and leave feedback on specific photos' },
  { icon: MessageSquare, text: 'Request changes with a comment or voice message' },
  { icon: ThumbsUp, text: 'Mark spreads as "Looks Good" when you\'re happy' },
];

export function WelcomeScreen({ albumTitle, clientName, onStart }: WelcomeScreenProps) {
  const [dontShowAgain, setDontShowAgain] = useLocalStorage<Record<string, boolean>>(
    'albumflow_welcome_dismissed',
    {}
  );

  const albumKey = albumTitle.replace(/\s+/g, '_').toLowerCase();
  if (dontShowAgain[albumKey]) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <Eye className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">{albumTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{clientName}</p>
        </div>

        <div className="px-6 pb-4">
          <ul className="flex flex-col gap-2.5">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.text} className="flex items-start gap-2.5 text-xs text-gray-600 leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-blue-600" />
                  </span>
                  {feature.text}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => {
              if (dontShowAgain[albumKey]) return;
              onStart();
            }}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer"
          >
            Start Viewing Album
          </button>

          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={!!dontShowAgain[albumKey]}
              onChange={(e) =>
                setDontShowAgain((prev) => ({
                  ...prev,
                  [albumKey]: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Don't show this again
          </label>
        </div>
      </div>
    </div>
  );
}
