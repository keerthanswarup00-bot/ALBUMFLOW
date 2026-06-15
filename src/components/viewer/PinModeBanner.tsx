import { MapPin, X } from 'lucide-react';

interface PinModeBannerProps {
  onCancel: () => void;
}

export function PinModeBanner({ onCancel }: PinModeBannerProps) {
  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-white" />
        <span className="text-sm font-medium text-white">Pin Mode Active</span>
      </div>
      <button
        onClick={onCancel}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-white/20 px-3 text-sm font-medium text-white hover:bg-white/30 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
        Cancel
      </button>
    </div>
  );
}
