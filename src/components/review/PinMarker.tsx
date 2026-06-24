import { cn } from '@/utils/cn';

interface PinMarkerProps {
  number: number;
  xPercent: number;
  yPercent: number;
  isActive?: boolean;
  isTargeted?: boolean;
  onClick?: () => void;
}

export function PinMarker({ number, xPercent, yPercent, isActive, isTargeted, onClick }: PinMarkerProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-base font-black text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer select-none',
        isActive
          ? 'bg-blue-600 ring-2 ring-blue-300 ring-offset-2 ring-offset-transparent'
          : isTargeted
            ? 'bg-amber-500 ring-2 ring-white/80 ring-offset-1 animate-pulse-pin'
            : 'bg-amber-500 ring-2 ring-white/80 ring-offset-1'
      )}
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      aria-label={`Pin ${number}`}
    >
      {number}
    </button>
  );
}
