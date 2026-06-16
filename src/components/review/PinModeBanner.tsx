import { MapPin, X } from 'lucide-react';

interface PinModeBannerProps {
  onCancel: () => void;
}

export function PinModeBanner({ onCancel }: PinModeBannerProps) {
  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-6 w-6 text-white" />
        <span className="text-base font-bold text-white">Tap where to place your pin</span>
      </div>
      <button
        onClick={onCancel}
        className="flex h-11 items-center gap-2 rounded-lg bg-white/20 px-4 text-base font-bold text-white hover:bg-white/30 transition-colors cursor-pointer"
      >
        <X className="h-5 w-5" />
        Cancel
      </button>
    </div>
  );
}
