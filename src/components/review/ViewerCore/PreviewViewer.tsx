import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useFullscreenManager } from './fullscreenManager';
import { ViewerToolbar } from './ViewerToolbar';
import { PinchZoomWrapper } from '@/components/review/PinchZoomWrapper';
import { PinMarker } from '@/components/review/PinMarker';
import { useRequestStore } from '@/store/requestStore';
import type { ReviewAlbum, ReviewPage, ViewerRequestChange } from '@/types/viewer';

interface FlipBookHandle {
  pageFlip: () => { flipNext: () => void; flipPrev: () => void; flip: (page: number) => void };
}

interface FlipEvent { data: unknown; object: unknown }

interface PreviewViewerProps {
  album: ReviewAlbum;
  pages: ReviewPage[];
  initialSpread: number;
  totalSpreads: number;
  isPinMode: boolean;
  targetRequestId?: string;
  focusedPinId: string | null;
  pendingPin: { xPercent: number; yPercent: number; label: string } | null;
  onExit: () => void;
  onFinishReview: () => void;
  onPinPlace: (xPercent: number, yPercent: number) => void;
  onViewRequest: (request: ViewerRequestChange) => void;
}

export function PreviewViewer({
  album, pages, initialSpread, totalSpreads, isPinMode, targetRequestId,
  focusedPinId, pendingPin,
  onExit, onFinishReview, onPinPlace, onViewRequest,
}: PreviewViewerProps) {
  const { mode } = useFullscreenManager(true);
  const [currentSpread, setCurrentSpread] = useState(initialSpread);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const albumContainerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = albumContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getRequestsByPage = useRequestStore((s) => s.getRequestsByPage);
  const currentPinRequests = useMemo(
    () => getRequestsByPage(album.id, currentSpread + 1).filter((r) => r.category === 'pin' && r.pin),
    [getRequestsByPage, album.id, currentSpread],
  );
  const hasFeedback = currentPinRequests.length > 0;

  const pageAspect = useMemo(() => {
    if (pages.length === 0) return 0.75;
    return pages[0].width / pages[0].height;
  }, [pages]);

  const pageWidth = useMemo(() => {
    if (containerSize.width === 0) return 500;
    const spreadAspect = 2 * pageAspect;
    const containerAspect = containerSize.width / containerSize.height;
    const targetW = containerSize.width;
    const targetH = containerSize.height;
    if (containerAspect > spreadAspect) {
      return Math.max(50, Math.min(Math.round(targetH * pageAspect), 2000));
    }
    return Math.max(50, Math.min(Math.round(targetW / 2), 2000));
  }, [pageAspect, containerSize]);

  const pageHeight = useMemo(
    () => (pageWidth === 0 ? 500 : Math.round(pageWidth / pageAspect)),
    [pageWidth, pageAspect],
  );

  const handleFlip = useCallback((e: FlipEvent) => {
    setCurrentSpread(Math.floor((e.data as number) / 2));
  }, []);

  const handleInit = useCallback((e: FlipEvent) => {
    const d = e.data as { page: number; mode: string };
    setCurrentSpread(Math.floor(d.page / 2));
  }, []);

  const getFlipApi = useCallback(() => {
    const ref = flipBookRef.current;
    if (!ref) { console.warn('[PreviewViewer] flipBookRef is null'); return undefined; }
    const api = ref.pageFlip();
    if (!api) { console.warn('[PreviewViewer] pageFlip() returned null/undefined'); return undefined; }
    return api;
  }, []);

  const goNext = useCallback(() => {
    const api = getFlipApi();
    if (!api) return;
    console.log('[PreviewViewer] goNext: calling flipNext()');
    api.flipNext();
  }, [getFlipApi]);

  const goPrev = useCallback(() => {
    const api = getFlipApi();
    if (!api) return;
    console.log('[PreviewViewer] goPrev: calling flipPrev()');
    api.flipPrev();
  }, [getFlipApi]);

  const canGoPrev = currentSpread > 0 && !isPinMode;
  const canGoNext = currentSpread < totalSpreads - 1 && !isPinMode;

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: show UI after navigation */
    setUiVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setUiVisible(false), 3000);
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [currentSpread]);

  useEffect(() => {
    const show = () => resetHideTimer();
    document.addEventListener('touchstart', show, { passive: true });
    document.addEventListener('click', show, { passive: true });
    return () => {
      document.removeEventListener('touchstart', show);
      document.removeEventListener('click', show);
    };
  }, [resetHideTimer]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'Escape') {
        if (mode !== 'standalone-pwa') document.exitFullscreen().catch(() => {});
        onExit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onExit, mode]);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-[#2c1810]"
      style={{ touchAction: 'none' }}
    >
      {/* Auto-hide overlay for tap-to-reveal */}
      {!uiVisible && (
        <div
          className="absolute inset-0 z-10"
          onTouchStart={(e) => { e.stopPropagation(); resetHideTimer(); }}
          onClick={() => resetHideTimer()}
        />
      )}

      {/* Album area */}
      <div ref={albumContainerRef} className="relative flex-1 overflow-hidden">
        <PinchZoomWrapper
          isActive={true}
          isPinMode={isPinMode}
        >
          {pages.length > 0 && (
            <HTMLFlipBook
              ref={flipBookRef}
              width={pageWidth}
              height={pageHeight}
              renderOnlyPageLengthChange={true}
              size="stretch"
              minWidth={100}
              maxWidth={2000}
              minHeight={150}
              maxHeight={3000}
              startPage={currentSpread * 2}
              flippingTime={800}
              usePortrait={false}
              showCover={false}
              drawShadow={true}
              maxShadowOpacity={0.7}
              showPageCorners={true}
              useMouseEvents={false}
              swipeDistance={9999}
              mobileScrollSupport={false}
              clickEventForward={false}
              disableFlipByClick={false}
              autoSize={true}
              startZIndex={0}
              className="w-full h-full"
              style={{ backgroundColor: 'transparent' }}
              onFlip={handleFlip}
              onInit={handleInit}
            >
              {pages.map((page) => (
                <div key={page.id} className="page" style={{ width: '100%', height: '100%' }}>
                  <div
                    className="page-image"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${page.medium_url ?? page.image_url})`,
                      backgroundSize: 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                </div>
              ))}
            </HTMLFlipBook>
          )}

          {/* Center gutter */}
          <div
            className="absolute top-0 bottom-0 left-1/2 w-[2px] pointer-events-none z-[5]"
            style={{
              background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.15) 70%, transparent 100%)',
              marginLeft: -1,
            }}
          />

          {/* Pin markers */}
          {!isPinMode && currentPinRequests.map((pin) => (
            <PinMarker
              key={pin.id}
              number={parseInt(pin.pin!.label, 10)}
              xPercent={pin.pin!.xPercent}
              yPercent={pin.pin!.yPercent}
              isActive={focusedPinId === pin.id}
              isTargeted={!!targetRequestId && pin.id === targetRequestId}
              onClick={() => onViewRequest(pin)}
            />
          ))}

          {pendingPin && (
            <PinMarker
              number={parseInt(pendingPin.label, 10)}
              xPercent={pendingPin.xPercent}
              yPercent={pendingPin.yPercent}
              isActive={true}
            />
          )}
        </PinchZoomWrapper>
      </div>

      {/* Toolbar */}
      <ViewerToolbar
        currentSpread={currentSpread}
        totalSpreads={totalSpreads}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        hasFeedback={hasFeedback}
        visible={uiVisible}
        onPrev={goPrev}
        onNext={goNext}
        onAddComment={() => onPinPlace(50, 50)}
        onAddVoice={() => {}}
        onUndo={() => {}}
        onFinish={onFinishReview}
        onBack={onExit}
      />
    </div>
  );
}
