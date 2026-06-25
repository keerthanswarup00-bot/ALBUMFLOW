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

function constrainPosition(pos: { x: number; y: number }, s: number, width: number, height: number) {
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

function getPinchDistance(touches: TouchList) {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function PinchZoomWrapper({ children, isActive, isPinMode = false, onZoomChange, onScaleChange }: PinchZoomWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const initialPinchDist = useRef(0);
  const initialScale = useRef(1);
  const initialPos = useRef({ x: 0, y: 0 });
  const pinchCenter = useRef<{ x: number; y: number } | null>(null);
  const isPinching = useRef(false);
  const isPanning = useRef(false);
  const momentumRef = useRef<{ vx: number; vy: number } | null>(null);
  const rafRef = useRef<number>(0);
  const lastMoveTime = useRef(0);
  const lastMovePos = useRef({ x: 0, y: 0 });
  const isPinModeRef = useRef(isPinMode);
  const isActiveRef = useRef(isActive);
  const isZoomed = scale > 1;
  const containerSize = useRef({ width: 0, height: 0 });
  const scaleRef = useRef(scale);
  const positionRef = useRef(position);

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

  function getContainerRelPos(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
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
          const rel = getContainerRelPos(centerX, centerY);
          x = rel.x - ratio * (rel.x - prev.x);
          y = rel.y - ratio * (rel.y - prev.y);
        }
        return constrainPosition({ x, y }, s, cw, ch);
      });
      return s;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const startMomentum = useCallback((vx: number, vy: number) => {
    if (momentumRef.current) return;
    if (Math.abs(vx) < MOMENTUM_MIN_VELOCITY && Math.abs(vy) < MOMENTUM_MIN_VELOCITY) return;

    const snapshot = scaleRef.current;

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
        snapshot,
        containerSize.current.width,
        containerSize.current.height,
      ));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  function stopMomentum() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    momentumRef.current = null;
  }

  const updateScaleRef = useRef(updateScale);
  const resetZoomRef = useRef(resetZoom);
  const startMomentumRef = useRef(startMomentum);

  useEffect(() => {
    isPinModeRef.current = isPinMode;
    isActiveRef.current = isActive;
    scaleRef.current = scale;
    positionRef.current = position;
    updateScaleRef.current = updateScale;
    resetZoomRef.current = resetZoom;
    startMomentumRef.current = startMomentum;
  });

  useEffect(() => {
    const el = transformRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (!isActiveRef.current || isPinModeRef.current) return;
      stopMomentum();

      if (e.touches.length === 2) {
        isPinching.current = true;
        isPanning.current = false;
        initialPinchDist.current = getPinchDistance(e.touches);
        initialScale.current = scaleRef.current;
        initialPos.current = { ...positionRef.current };
        pinchCenter.current = getContainerRelPos(
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
        );
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && scaleRef.current > 1) {
        isPanning.current = true;
        initialPos.current = { ...positionRef.current };
        const rel = getContainerRelPos(e.touches[0].clientX, e.touches[0].clientY);
        pinchCenter.current = rel;
        lastMoveTime.current = Date.now();
        lastMovePos.current = { ...rel };
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && scaleRef.current <= 1) {
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
          const nextScale = scaleRef.current === 1 ? 2 : 1;
          const rel = getContainerRelPos(e.touches[0].clientX, e.touches[0].clientY);
          updateScaleRef.current(nextScale, rel.x, rel.y);
          lastTapRef.current = 0;
          e.preventDefault();
        } else {
          lastTapRef.current = now;
        }
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!isActiveRef.current || isPinModeRef.current) return;

      if (e.touches.length === 2 && isPinching.current) {
        const dist = getPinchDistance(e.touches);
        const ratio = dist / initialPinchDist.current;
        updateScaleRef.current(initialScale.current * ratio, pinchCenter.current?.x, pinchCenter.current?.y);
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1 && isPanning.current && scaleRef.current > 1 && pinchCenter.current) {
        const now = Date.now();
        const dt = now - lastMoveTime.current;
        const rel = getContainerRelPos(e.touches[0].clientX, e.touches[0].clientY);
        if (dt > 0) {
          lastMovePos.current = { ...rel };
          lastMoveTime.current = now;
        }
        setPosition(() =>
          constrainPosition(
            { x: initialPos.current.x + rel.x - pinchCenter.current!.x, y: initialPos.current.y + rel.y - pinchCenter.current!.y },
            scaleRef.current,
            containerSize.current.width,
            containerSize.current.height,
          )
        );
        e.preventDefault();
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isActiveRef.current || isPinModeRef.current) return;

      if (e.touches.length === 0) {
        if (isPanning.current && scaleRef.current > 1) {
          const dt = Date.now() - lastMoveTime.current;
          if (dt > 0 && dt < 150 && pinchCenter.current) {
            const vx = (lastMovePos.current.x - pinchCenter.current.x) / dt * 16;
            const vy = (lastMovePos.current.y - pinchCenter.current.y) / dt * 16;
            startMomentumRef.current(vx, vy);
          }
        }
        isPinching.current = false;
        isPanning.current = false;
        pinchCenter.current = null;
      }
      if (e.touches.length === 1 && isPinching.current) {
        isPinching.current = false;
        isPanning.current = true;
        const rel = getContainerRelPos(e.touches[0].clientX, e.touches[0].clientY);
        pinchCenter.current = rel;
        initialPos.current = { ...positionRef.current };
      }
    }

    function onWheel(e: WheelEvent) {
      if (!isActiveRef.current || isPinModeRef.current) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rel = getContainerRelPos(e.clientX, e.clientY);
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const nextScale = clamp(scaleRef.current * delta, 1, MAX_SCALE);
      if (nextScale === 1) {
        resetZoomRef.current();
      } else {
        updateScaleRef.current(nextScale, rel.x, rel.y);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [isActive, isPinMode]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <div
        ref={transformRef}
        className="w-full h-full"
        style={{
          touchAction: 'none',
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale3d(${scale}, ${scale}, 1)`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
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
            pinchCenter.current = { x: e.clientX, y: e.clientY };
            isPanning.current = true;
            lastMoveTime.current = Date.now();
            lastMovePos.current = { x: e.clientX, y: e.clientY };
            e.preventDefault();
          }}
          onMouseMove={(e) => {
            if (!isPanning.current || !pinchCenter.current) return;
            const dx = e.clientX - pinchCenter.current.x;
            const dy = e.clientY - pinchCenter.current.y;
            const now = Date.now();
            const dt = now - lastMoveTime.current;
            if (dt > 0) {
              lastMovePos.current = { x: e.clientX, y: e.clientY };
              lastMoveTime.current = now;
            }
            setPosition(() =>
              constrainPosition(
                { x: initialPos.current.x + dx, y: initialPos.current.y + dy },
                scale,
                containerSize.current.width,
                containerSize.current.height,
              )
            );
          }}
          onMouseUp={() => {
            if (isPanning.current && isZoomed) {
              const dt = Date.now() - lastMoveTime.current;
              if (dt > 0 && dt < 150 && pinchCenter.current) {
                const vx = (lastMovePos.current.x - pinchCenter.current.x) / dt * 16;
                const vy = (lastMovePos.current.y - pinchCenter.current.y) / dt * 16;
                startMomentum(vx, vy);
              }
            }
            isPanning.current = false;
            pinchCenter.current = null;
          }}
          onMouseLeave={() => {
            isPanning.current = false;
            pinchCenter.current = null;
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const rel = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            const nextScale = scale === 1 ? 2 : 1;
            if (nextScale === 1) {
              resetZoom();
            } else {
              updateScale(nextScale, rel.x, rel.y);
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
