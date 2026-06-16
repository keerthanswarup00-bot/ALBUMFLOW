import { useRef, useCallback } from 'react';
import { Pin } from 'lucide-react';

interface PinPlacementOverlayProps {
  onPlace: (xPercent: number, yPercent: number) => void;
  onCancel: () => void;
}

export function PinPlacementOverlay({ onPlace }: PinPlacementOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      const touch = e.touches[0] ?? (e as React.TouchEvent).changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const xPercent = ((clientX - rect.left) / rect.width) * 100;
    const yPercent = ((clientY - rect.top) / rect.height) * 100;

    onPlace(
      Math.max(0, Math.min(100, xPercent)),
      Math.max(0, Math.min(100, yPercent))
    );
  }, [onPlace]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-20 flex cursor-crosshair items-center justify-center touch-none"
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      <div className="pointer-events-none flex flex-col items-center gap-3">
        <div className="rounded-full bg-amber-400/30 p-6">
          <Pin className="h-14 w-14 text-amber-500" />
        </div>
        <span className="rounded-full bg-black/70 px-6 py-3 text-base font-bold text-white backdrop-blur-sm">
          Tap the exact area you want changed
        </span>
      </div>
    </div>
  );
}
