import { cn } from '@/utils/cn';

interface PinMarkerProps {
  number: number;
  xPercent: number;
  yPercent: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function PinMarker({ number, xPercent, yPercent, isActive, onClick }: PinMarkerProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        'absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg transition-transform hover:scale-110 cursor-pointer',
        isActive
          ? 'bg-blue-600 ring-2 ring-blue-300 ring-offset-1'
          : 'bg-amber-500 ring-2 ring-white'
      )}
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      aria-label={`Pin ${number}`}
    >
      {number}
    </button>
  );
}
