import { useRef, useState, useEffect, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface ZoomableImageProps {
  children: ReactNode;
  isZoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
  disabled?: boolean;
}

export function ZoomableImage({ children, isZoomed, onZoomChange, disabled }: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastDist = useRef(0);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  function resetZoom() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
    onZoomChange(false);
  }

  // Pinch zoom (touch)
  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (e.touches.length === 1 && isZoomed) {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      translateStart.current = { ...translate };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (disabled) return;
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / (lastDist.current || 1);
      lastDist.current = dist;

      setScale((prev) => {
        const next = Math.max(1, Math.min(prev * delta, 5));
        if (next > 1) onZoomChange(true);
        else onZoomChange(false);
        return next;
      });
    } else if (e.touches.length === 1 && isPanning.current) {
      const deltaX = e.touches[0].clientX - panStart.current.x;
      const deltaY = e.touches[0].clientY - panStart.current.y;
      setTranslate({
        x: translateStart.current.x + deltaX / scale,
        y: translateStart.current.y + deltaY / scale,
      });
    }
  }

  function handleTouchEnd() {
    isPanning.current = false;
    if (scale <= 1) {
      setTranslate({ x: 0, y: 0 });
      onZoomChange(false);
    }
  }

  // Double-tap zoom
  const lastTap = useRef(0);
  function handleClick() {
    if (disabled) return;
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (isZoomed) {
        resetZoom();
      } else {
        setScale(2.5);
        onZoomChange(true);
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  }

  // Mouse drag pan
  function handleMouseDown(e: React.MouseEvent) {
    if (disabled || !isZoomed) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanning.current || !isZoomed) return;
    const deltaX = e.clientX - panStart.current.x;
    const deltaY = e.clientY - panStart.current.y;
    setTranslate({
      x: translateStart.current.x + deltaX / scale,
      y: translateStart.current.y + deltaY / scale,
    });
  }

  function handleMouseUp() {
    isPanning.current = false;
  }

  // Zoom state is intentionally not reset in an effect.
  // Parent component remounts this via `key` prop on page change.

  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (disabled) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => {
        const next = Math.max(1, Math.min(prev * delta, 5));
        if (next > 1) onZoomChange(true);
        else {
          setTranslate({ x: 0, y: 0 });
          onZoomChange(false);
        }
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [disabled, onZoomChange]);

  return (
    <div
      ref={wheelRef}
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      )}
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="transition-transform duration-100 ease-out"
        style={{
          transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
          touchAction: isZoomed ? 'none' : 'pan-y',
        }}
      >
        {children}
      </div>

      {isZoomed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetZoom();
          }}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer"
        >
          Reset Zoom
        </button>
      )}
    </div>
  );
}
