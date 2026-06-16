import { useRef, useCallback, useEffect, useState } from 'react';

interface PinchZoomWrapperProps {
  children: React.ReactNode;
  isActive: boolean;
  onZoomChange?: (zoomed: boolean) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 2;
const DOUBLE_TAP_DELAY = 300;

export function PinchZoomWrapper({ children, isActive, onZoomChange }: PinchZoomWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const initialPinchDist = useRef(0);
  const initialScale = useRef(1);
  const initialPos = useRef({ x: 0, y: 0 });
  const pinchStart = useRef<{ x: number; y: number } | null>(null);
  const isPinching = useRef(false);
  const isPanning = useRef(false);

  const isZoomed = scale > 1;

  useEffect(() => {
    onZoomChange?.(isZoomed);
  }, [isZoomed, onZoomChange]);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  function getPinchDistance(touches: React.TouchList) {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isActive) return;

    if (e.touches.length === 2) {
      isPinching.current = true;
      isPanning.current = false;
      initialPinchDist.current = getPinchDistance(e.touches);
      initialScale.current = scale;
      initialPos.current = { ...position };
      pinchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && isZoomed) {
      isPanning.current = true;
      initialPos.current = { ...position };
      pinchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && !isZoomed) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        setScale(ZOOM_STEP);
        lastTapRef.current = 0;
        e.preventDefault();
      } else {
        lastTapRef.current = now;
      }
    }
  }, [isActive, isZoomed, scale, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isActive) return;

    if (e.touches.length === 2 && isPinching.current) {
      const dist = getPinchDistance(e.touches);
      const ratio = dist / initialPinchDist.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale.current * ratio));
      setScale(newScale);
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && isPanning.current && isZoomed && pinchStart.current) {
      const dx = e.touches[0].clientX - pinchStart.current.x;
      const dy = e.touches[0].clientY - pinchStart.current.y;
      setPosition({
        x: initialPos.current.x + dx,
        y: initialPos.current.y + dy,
      });
      e.preventDefault();
    }
  }, [isActive, isZoomed]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isActive) return;
    if (e.touches.length === 0) {
      isPinching.current = false;
      isPanning.current = false;
      pinchStart.current = null;
    }
    if (e.touches.length === 1 && isPinching.current) {
      isPinching.current = false;
      isPanning.current = true;
      pinchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialPos.current = { ...position };
    }
  }, [isActive, position]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isActive) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta)));
  }, [isActive, scale]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      {/* Transformed content — receives touch/wheel events */}
      <div
        className="w-full h-full"
        style={{
          transform: `scale(${scale}) translate(${position.x / (scale || 1)}px, ${position.y / (scale || 1)}px)`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {children}
      </div>

      {/* When zoomed: overlay blocks events from reaching flipbook, handles mouse pan */}
      {isZoomed && (
        <div
          className="absolute inset-0 z-10"
          style={{ touchAction: 'none' }}
          onMouseDown={(e) => {
            initialPos.current = { ...position };
            pinchStart.current = { x: e.clientX, y: e.clientY };
            isPanning.current = true;
            e.preventDefault();
          }}
          onMouseMove={(e) => {
            if (!isPanning.current || !pinchStart.current) return;
            setPosition({
              x: initialPos.current.x + (e.clientX - pinchStart.current.x),
              y: initialPos.current.y + (e.clientY - pinchStart.current.y),
            });
          }}
          onMouseUp={() => {
            isPanning.current = false;
            pinchStart.current = null;
          }}
          onMouseLeave={() => {
            isPanning.current = false;
            pinchStart.current = null;
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            resetZoom();
          }}
        />
      )}

      {/* Reset zoom button */}
      {isZoomed && (
        <button
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
          className="absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white text-sm shadow-lg backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer"
          aria-label="Reset zoom"
        >
          ✕
        </button>
      )}
    </div>
  );
}
