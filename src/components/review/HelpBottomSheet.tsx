interface HelpBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const helpItems = [
  'Swipe or tap arrows to change pages',
  'Pinch or double-tap to zoom into any detail',
  'Tap ✏ Comment to add notes on specific areas',
  'Tap 🎤 Voice to record spoken feedback',
  'Tap Submit Changes when you\'re finished',
];

export function HelpBottomSheet({ isOpen, onClose }: HelpBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      <style>{`@keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl" style={{ maxHeight: '50dvh', animation: 'slide-up 0.25s ease-out' }}>
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>
        <div className="px-5 pb-2">
          <h2 className="text-lg font-bold text-gray-900">Album Review Guide</h2>
        </div>
        <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 'calc(50dvh - 80px)' }}>
          <ul className="space-y-4">
            {helpItems.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                  {i + 1}
                </span>
                <p className="text-base leading-relaxed text-gray-700 pt-0.5">{item}</p>
              </li>
            ))}
          </ul>
          <button
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 active:bg-blue-800 transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </>
  );
}
