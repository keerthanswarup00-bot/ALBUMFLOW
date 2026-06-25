import { useRef, useCallback, useEffect, useState } from 'react';

interface PinchZoomWrapperProps {
  children: React.ReactNode;
  isActive: boolean;
  isPinMode?: boolean;
  onZoomChange?: (zoomed: boolean) => void;
  onScaleChange?: (scale: number) => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_DELAY = 300;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_MIN_VELOCITY = 0.5;

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

export function PinchZoomWrapper({ children, isActive, isPinMode = false, onZoomChange, onScaleChange }: PinchZoomWrapperProps) {
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
  const momentumRef = useRef<{ vx: number; vy: number } | null>(null);
  const rafRef = useRef<number>(0);
  const lastMoveTime = useRef(0);
  const lastMovePos = useRef({ x: 0, y: 0 });
  const isPinModeRef = useRef(isPinMode);
  isPinModeRef.current = isPinMode;

  const isZoomed = scale > 1;

  const containerSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      containerSize.current = { width: rect.width, height: rect.height };
    }
  }, []);

  useEffect(() => {
    onZoomChange?.(isZoomed);
  }, [isZoomed, onZoomChange]);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  function constrainPosition(pos: { x: number; y: number }, s: number) {
    const { width, height } = containerSize.current;
    if (width === 0 || height === 0) return pos;
    const maxX = 0;
    const minX = -(width * (s - 1));
    const maxY = 0;
    const minY = -(height * (s - 1));
    return {
      x: clamp(pos.x, minX, maxX),
      y: clamp(pos.y, minY, maxY),
    };
  }

  const updateScale = useCallback((newScale: number, centerX?: number, centerY?: number) => {
    const s = clamp(newScale, MIN_SCALE, MAX_SCALE);
    const cw = containerSize.current.width;
    const ch = containerSize.current.height;
    if (s === 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }
    setScale((prevScale) => {
      setPosition((prev) => {
        let x = prev.x;
        let y = prev.y;
        if (centerX !== undefined && centerY !== undefined && cw > 0 && ch > 0) {
          const ratio = s / prevScale;
          x = centerX - ratio * (centerX - prev.x);
          y = centerY - ratio * (centerY - prev.y);
        }
        return constrainPosition({ x, y }, s);
      });
      return s;
    });
  }, []);

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

  const startMomentum = useCallback((vx: number, vy: number) => {
    if (momentumRef.current) return;
    if (Math.abs(vx) < MOMENTUM_MIN_VELOCITY && Math.abs(vy) < MOMENTUM_MIN_VELOCITY) return;

    const snapshot = scale;

    function tick() {
      const m = momentumRef.current;
      if (!m) return;
      m.vx *= MOMENTUM_FRICTION;
      m.vy *= MOMENTUM_FRICTION;
      if (Math.abs(m.vx) < MOMENTUM_MIN_VELOCITY && Math.abs(m.vy) < MOMENTUM_MIN_VELOCITY) {
        momentumRef.current = null;
        return;
      }
      setPosition((prev) => constrainPosition(
        { x: prev.x + m.vx, y: prev.y + m.vy },
        snapshot
      ));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [scale]);

  function stopMomentum() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    momentumRef.current = null;
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isActive || isPinModeRef.current) return;
    stopMomentum();

    if (e.touches.length === 2) {
      isPinching.current = true;
      isPanning.current = false;
      initialPinchDist.current = getPinchDistance(e.touches);
      initialScale.current = scale;
      initialPos.current = { ...position };
      pinchStart.current = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && isZoomed) {
      isPanning.current = true;
      initialPos.current = { ...position };
      pinchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMoveTime.current = Date.now();
      lastMovePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && !isZoomed) {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
        const nextScale = scale === 1 ? 2 : 1;
        updateScale(nextScale, e.touches[0].clientX, e.touches[0].clientY);
        lastTapRef.current = 0;
        e.preventDefault();
      } else {
        lastTapRef.current = now;
      }
    }
  }, [isActive, isZoomed, scale, position, updateScale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isActive || isPinModeRef.current) return;

    if (e.touches.length === 2 && isPinching.current) {
      const dist = getPinchDistance(e.touches);
      const ratio = dist / initialPinchDist.current;
      updateScale(initialScale.current * ratio, pinchStart.current?.x, pinchStart.current?.y);
      e.preventDefault();
      return;
    }

    if (e.touches.length === 1 && isPanning.current && isZoomed && pinchStart.current) {
      const dx = e.touches[0].clientX - pinchStart.current.x;
      const dy = e.touches[0].clientY - pinchStart.current.y;
      const now = Date.now();
      const dt = now - lastMoveTime.current;
      if (dt > 0) {
        lastMovePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastMoveTime.current = now;
      }
      setPosition(() =>
        constrainPosition(
          { x: initialPos.current.x + dx, y: initialPos.current.y + dy },
          scale
        )
      );
      e.preventDefault();
    }
  }, [isActive, isZoomed, scale, updateScale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isActive || isPinModeRef.current) return;

    if (e.touches.length === 0) {
      if (isPanning.current && isZoomed) {
        const dt = Date.now() - lastMoveTime.current;
        if (dt > 0 && dt < 150 && pinchStart.current) {
          const vx = (lastMovePos.current.x - pinchStart.current.x) / dt * 16;
          const vy = (lastMovePos.current.y - pinchStart.current.y) / dt * 16;
          startMomentum(vx, vy);
        }
      }
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
  }, [isActive, isZoomed, position, startMomentum]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isActive || isPinModeRef.current) return;
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = clamp(scale * delta, 1, MAX_SCALE);
    if (nextScale === 1) {
      resetZoom();
    } else {
      updateScale(nextScale, cx, cy);
    }
  }, [isActive, scale, resetZoom, updateScale]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <div
        className="w-full h-full"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale3d(${scale}, ${scale}, 1)`,
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

      {isZoomed && !isPinMode && (
        <div
          className="absolute inset-0 z-10"
          style={{ touchAction: 'none' }}
          onMouseDown={(e) => {
            stopMomentum();
            initialPos.current = { ...position };
            pinchStart.current = { x: e.clientX, y: e.clientY };
            isPanning.current = true;
            lastMoveTime.current = Date.now();
            lastMovePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
          }}
          onMouseMove={(e) => {
            if (!isPanning.current || !pinchStart.current) return;
            const dx = e.clientX - pinchStart.current.x;
            const dy = e.clientY - pinchStart.current.y;
            const now = Date.now();
            const dt = now - lastMoveTime.current;
            if (dt > 0) {
              lastMovePos.current = { x: e.clientX, y: e.clientY };
              lastMoveTime.current = now;
            }
            setPosition(() =>
              constrainPosition(
                { x: initialPos.current.x + dx, y: initialPos.current.y + dy },
                scale
              )
            );
          }}
          onMouseUp={() => {
            if (isPanning.current && isZoomed) {
              const dt = Date.now() - lastMoveTime.current;
              if (dt > 0 && dt < 150 && pinchStart.current) {
                const vx = (lastMovePos.current.x - pinchStart.current.x) / dt * 16;
                const vy = (lastMovePos.current.y - pinchStart.current.y) / dt * 16;
                startMomentum(vx, vy);
              }
            }
            isPanning.current = false;
            pinchStart.current = null;
          }}
          onMouseLeave={() => {
            isPanning.current = false;
            pinchStart.current = null;
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const nextScale = scale === 1 ? 2 : 1;
            if (nextScale === 1) {
              resetZoom();
            } else {
              updateScale(nextScale, cx, cy);
            }
          }}
        />
      )}

      {isZoomed && !isPinMode && (
        <button
          onClick={(e) => { e.stopPropagation(); resetZoom(); }}
          className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white text-base shadow-lg backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer"
          aria-label="Reset zoom"
        >
          ✕
        </button>
      )}
    </div>
  );
}
