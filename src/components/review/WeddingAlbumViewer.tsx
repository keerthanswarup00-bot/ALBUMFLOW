import { useEffect, useState, useCallback, forwardRef, useRef, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ArrowLeft } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUIStore } from '@/store/uiStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ReviewProgressTracker } from './ReviewProgressTracker';
import { ReviewCompletionModal } from './ReviewCompletionModal';
import { HelpBottomSheet } from './HelpBottomSheet';
import { PinMarker } from './PinMarker';
import { PinPopup } from './PinPopup';
import { NewPinEditor } from './NewPinEditor';
import { StickyBottomBar } from './StickyBottomBar';
import { FloatingBottomToolbar } from './FloatingBottomToolbar';
import { PinchZoomWrapper } from './PinchZoomWrapper';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { uploadVoiceNote } from '@/services/supabase/storage';
import type { ReviewAlbum, ReviewPage, ViewerRequestChange } from '@/types/viewer';

interface FlipBookHandle {
  pageFlip: () => {
    flipNext: () => void;
    flipPrev: () => void;
    flip: (page: number) => void;
  };
}

interface FlipEvent {
  data: unknown;
  object: unknown;
}

interface WeddingAlbumViewerProps {
  album: ReviewAlbum;
  pages: ReviewPage[];
  studioName?: string;
  phoneNumber?: string;
  studioLogoUrl?: string;
  targetPage?: number;
  targetRequestId?: string;
}

const WeddingAlbumViewer = forwardRef<HTMLDivElement, WeddingAlbumViewerProps>((props, ref) => {
  const { album, pages, studioName = 'Studio', phoneNumber = '', studioLogoUrl = '', targetPage, targetRequestId } = props;
  const [currentSpread, setCurrentSpread] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ xPercent: number; yPercent: number; label: string } | null>(null);
  const [showNewPinEditor, setShowNewPinEditor] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ViewerRequestChange | null>(null);
  const [selectedPinPos, setSelectedPinPos] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const albumContainerRef = useRef<HTMLDivElement>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [focusedPinId, setFocusedPinId] = useState<string | null>(null);
  const [albumContainerSize, setAlbumContainerSize] = useState({ width: 0, height: 0 });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const isMobile = useIsMobile();
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef<number | undefined>(undefined);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isMobile) {
      hideTimerRef.current = window.setTimeout(() => setUiVisible(false), 3000);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [isMobile, resetHideTimer, currentSpread]);

  const pageAspectRatio = useMemo(() => {
    if (pages.length === 0) return 0.75;
    return pages[0].width / pages[0].height;
  }, [pages]);

  const pageWidth = useMemo(() => {
    if (albumContainerSize.width === 0 || albumContainerSize.height === 0) return 400;
    const spreadAspect = 2 * pageAspectRatio;
    const containerAspect = albumContainerSize.width / albumContainerSize.height;
    const heightFactor = isMobile ? 0.98 : 0.88;
    const widthFactor = isMobile ? 0.99 : 0.96;
    const targetHeight = albumContainerSize.height * heightFactor;
    const targetWidth = albumContainerSize.width * widthFactor;
    if (containerAspect > spreadAspect) {
      return Math.round(Math.min(targetHeight * pageAspectRatio * 2, targetWidth) / 2);
    }
    return Math.round(targetWidth / 2);
  }, [albumContainerSize, pageAspectRatio, isMobile]);

  const pageHeight = useMemo(() => {
    if (pageWidth === 0) return 600;
    return Math.round(pageWidth / pageAspectRatio);
  }, [pageWidth, pageAspectRatio]);

  useEffect(() => {
    const el = albumContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setAlbumContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totalSpreads = Math.floor(pages.length / 2);
  const currentPageLeft = currentSpread * 2;
  const currentPageRight = currentPageLeft + 1;

  const {
    markPageViewed,
    getReviewedCount,
    ensureAlbum,
  } = useReviewStore();

  const {
    addRequest,
    getRequestsByPage,
    deleteRequest,
    updateRequest,
    clearDraft,
  } = useRequestStore();

  const {
    addRecording,
    getRecordingsByPage,
    deleteRecording,
  } = useVoiceStore();

  const { showToast } = useUIStore();

  const reviewedHalves = getReviewedCount(album.id);
  const reviewedSpreads = Math.floor(reviewedHalves / 2);
  const completionPercent = totalSpreads > 0 ? Math.round((reviewedSpreads / totalSpreads) * 100) : 0;

  const currentPageRequests = getRequestsByPage(album.id, currentSpread + 1);
  const currentPageVoice = getRecordingsByPage(album.id, currentSpread + 1);
  const hasFeedback = currentPageRequests.length > 0 || currentPageVoice.length > 0;

  const currentPinRequests = currentPageRequests.filter((r) => r.category === 'pin' && r.pin);

  useEffect(() => {
    ensureAlbum(album.id, totalSpreads);
  }, [album.id, totalSpreads, ensureAlbum]);

  useEffect(() => {
    if (pages.length > 0) {
      markPageViewed(album.id, currentPageLeft + 1, pages.length);
      if (currentPageRight < pages.length) {
        markPageViewed(album.id, currentPageRight + 1, pages.length);
      }
    }
  }, [currentSpread, album.id, pages.length, markPageViewed, currentPageLeft, currentPageRight]);

  const handleFlipEvent = useCallback((e: FlipEvent) => {
    setCurrentSpread(Math.floor((e.data as number) / 2));
  }, []);

  const handleInitEvent = useCallback((e: FlipEvent) => {
    const initData = e.data as { page: number; mode: string };
    setCurrentSpread(Math.floor(initData.page / 2));
  }, []);

  const handleNext = useCallback(() => {
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flipNext();
    }
  }, []);

  const handlePrev = useCallback(() => {
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flipPrev();
    }
  }, []);

  const canGoPrev = currentSpread > 0 && !isPinMode;
  const canGoNext = currentSpread < totalSpreads - 1 && !isPinMode;

  function handleUndoFeedback() {
    const pageNumbers = [currentSpread + 1];
    if (currentPageRight < pages.length) {
      pageNumbers.push(currentSpread + 2);
    }
    for (const pn of pageNumbers) {
      const pageReqs = getRequestsByPage(album.id, pn);
      for (const req of pageReqs) {
        deleteRequest(album.id, req.id);
      }
      const pageVoices = getRecordingsByPage(album.id, pn);
      for (const v of pageVoices) {
        deleteRecording(album.id, v.id);
      }
    }
    if (pageNumbers.length > 0) {
      showToast('Feedback removed', 'success');
    }
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch { /* empty */ }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch { /* empty */ }
    }
  }

  const enterPreview = useCallback(() => {
    setIsPreviewMode(true);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  function toggleHelp() {
    setIsHelpOpen((prev) => !prev);
  }

  function handleAddComment() {
    setIsPinMode(true);
  }

  function handleAddVoice() {
    setShowVoiceRecorder(true);
  }

  function handlePinPlace(xPercent: number, yPercent: number) {
    setIsPinMode(false);
    const nextNum = currentPageRequests.filter((r) => r.category === 'pin').length + 1;
    setPendingPin({ xPercent, yPercent, label: String(nextNum) });
    setShowNewPinEditor(true);
  }

  function handleNewPinSave(message: string) {
    if (pendingPin) {
      addRequest(album.id, currentSpread + 1, 'pin', message, {
        xPercent: pendingPin.xPercent,
        yPercent: pendingPin.yPercent,
        label: pendingPin.label,
      });
      clearDraft(album.id);
      setPendingPin(null);
      setShowNewPinEditor(false);
      showToast('Comment added', 'success');
    }
  }

  function handleNewPinCancel() {
    setPendingPin(null);
    setShowNewPinEditor(false);
  }

  function handleViewRequest(request: ViewerRequestChange) {
    setSelectedRequest(request);
    if (request.pin) {
      setSelectedPinPos({ xPercent: request.pin.xPercent, yPercent: request.pin.yPercent });
    }
  }

  function handleDeleteRequest(id: string) {
    deleteRequest(album.id, id);
  }

  async function handleVoiceSend(duration: number, blob: Blob) {
    try {
      const result = await uploadVoiceNote(album.id, blob);
      addRecording(album.id, currentSpread + 1, duration, result.url);
      setShowVoiceRecorder(false);
      showToast('Voice message sent', 'success');
    } catch {
      showToast('Failed to upload voice message', 'error');
    }
  }

  function handleClosePinPopup() {
    setSelectedRequest(null);
    setSelectedPinPos(null);
  }

  useEffect(() => {
    const useFullRes = zoomScale >= 2;
    pages.forEach((page, i) => {
      const el = imageRefs.current[i];
      if (el) {
        el.style.backgroundImage = `url(${useFullRes ? page.image_url : (page.medium_url ?? page.image_url)})`;
      }
    });
  }, [zoomScale, pages]);

  function handleUserInteraction() {
  }

  const isHelpOpenRef = useRef(isHelpOpen);
  isHelpOpenRef.current = isHelpOpen;
  const showVoiceRecorderRef = useRef(showVoiceRecorder);
  showVoiceRecorderRef.current = showVoiceRecorder;
  const showNewPinEditorRef = useRef(showNewPinEditor);
  showNewPinEditorRef.current = showNewPinEditor;
  const selectedRequestRef = useRef(selectedRequest);
  selectedRequestRef.current = selectedRequest;
  const showCompletionRef = useRef(showCompletion);
  showCompletionRef.current = showCompletion;
  const isPreviewModeRef = useRef(isPreviewMode);
  isPreviewModeRef.current = isPreviewMode;
  const isFullscreenRef = useRef(isFullscreen);
  isFullscreenRef.current = isFullscreen;
  const isPinModeRef = useRef(isPinMode);
  isPinModeRef.current = isPinMode;

  const hasFlippedToTargetRef = useRef(false);

  useEffect(() => {
    if (!targetPage || hasFlippedToTargetRef.current || !flipBookRef.current?.pageFlip) return;
    if (pages.length === 0) return;

    const clampedPage = Math.max(1, Math.min(targetPage, totalSpreads));
    const pageIndex = (clampedPage - 1) * 2;

    requestAnimationFrame(() => {
      try {
        flipBookRef.current?.pageFlip()?.flip(pageIndex);
        hasFlippedToTargetRef.current = true;
      } catch {
        // Flipbook may not be ready yet
      }
    });
  }, [targetPage, pages, totalSpreads]);

  useEffect(() => {
    if (!targetRequestId || !targetPage || !hasFlippedToTargetRef.current) return;
    if (currentSpread !== targetPage - 1) return;

    const allRequests = getRequestsByPage(album.id, targetPage);
    const targetRequest = allRequests.find((r) => r.id === targetRequestId);

    if (targetRequest) {
      setSelectedRequest(targetRequest);
      if (targetRequest.pin) {
        setSelectedPinPos({ xPercent: targetRequest.pin.xPercent, yPercent: targetRequest.pin.yPercent });
      }
      setFocusedPinId(targetRequest.id);
    }
  }, [currentSpread, targetPage, targetRequestId, album.id, getRequestsByPage]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isHelpOpenRef.current) {
        if (e.key === 'Escape') setIsHelpOpen(false);
        return;
      }
      if (showVoiceRecorderRef.current || showNewPinEditorRef.current || selectedRequestRef.current || showCompletionRef.current) return;
      if (isPinModeRef.current) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNext();
          break;
        case 'Escape':
          if (isPreviewModeRef.current) {
            setIsPreviewMode(false);
          }
          if (isFullscreenRef.current) document.exitFullscreen().catch(() => {});
          break;
        case 'd':
        case 'D':
          setShowDebug((p) => !p);
          break;
        case 'f':
        case 'F':
          enterPreview();
          break;
        case '?':
          toggleHelp();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enterPreview, handleNext, handlePrev]);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Mobile: auto-request fullscreen, hide browser chrome
  useEffect(() => {
    if (!isMobile) return;

    document.documentElement.requestFullscreen().catch(() => {
      // Safari doesn't support requestFullscreen from user gesture.
      // Apply pseudo-fullscreen via viewport techniques instead.
    });

    const scrollHideChrome = () => {
      window.scrollTo(0, 1);
    };
    scrollHideChrome();
    window.addEventListener('scroll', scrollHideChrome);
    window.addEventListener('orientationchange', () => {
      setTimeout(scrollHideChrome, 300);
    });

    return () => {
      window.removeEventListener('scroll', scrollHideChrome);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [isMobile]);

  function handleInteraction() {
    handleUserInteraction();
    resetHideTimer();
  }

  return (
    <div
      ref={ref}
      className="fixed inset-0 flex flex-col bg-[#2c1810]"
      onTouchStart={handleInteraction}
      onMouseMove={handleInteraction}
    >
      {/* Mobile: minimal header overlay */}
      {isMobile && (
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-1 safe-area-top">
          <button
            onClick={() => window.history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm hover:bg-black/60 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowCompletion(true)}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Finish Review
          </button>
        </div>
      )}

      {/* Desktop: full header */}
      {!isMobile && (
        <ReviewProgressTracker
          currentSpread={currentSpread}
          reviewedCount={reviewedSpreads}
          totalPages={totalSpreads}
          completionPercent={completionPercent}
          isFullscreen={isFullscreen}
          studioLogoUrl={studioLogoUrl}
          studioName={studioName}
          onBack={() => window.history.back()}
          onToggleFullscreen={toggleFullscreen}
          onToggleHelp={toggleHelp}
          onToggleSummary={() => setShowCompletion(true)}
          onTogglePreview={enterPreview}
          hasFeedback={hasFeedback}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div ref={albumContainerRef} className="relative flex-1 overflow-hidden bg-[#2c1810]">
          <PinchZoomWrapper isActive={true} isPinMode={isPinMode} onZoomChange={setIsZoomed} onScaleChange={setZoomScale}>
            {pages.length > 0 && (
              <HTMLFlipBook
                ref={flipBookRef}
                width={pageWidth}
                height={pageHeight}
                  size="stretch"
                  minWidth={100}
                  maxWidth={2000}
                  minHeight={150}
                  maxHeight={3000}
                  startPage={0}
                  flippingTime={800}
                  usePortrait={false}
                  showCover={false}
                  drawShadow={true}
                  maxShadowOpacity={0.7}
                  showPageCorners={true}
                  useMouseEvents={isMobile ? false : !isZoomed && !isPinMode}
                  swipeDistance={isMobile ? 9999 : (isZoomed || isPinMode ? 9999 : 80)}
                  mobileScrollSupport={isMobile ? false : !isZoomed && !isPinMode}
                  clickEventForward={false}
                  disableFlipByClick={isMobile ? true : (isZoomed || isPinMode)}
                  autoSize={false}
                  startZIndex={0}
                  className="w-full h-full"
                  style={{ backgroundColor: 'transparent' }}
                  onFlip={handleFlipEvent}
                  onInit={handleInitEvent}
                >
                  {pages.map((page, i) => (
                    <div key={page.id} className="page" style={{ width: '100%', height: '100%' }}>
                      <div
                        ref={(el) => { imageRefs.current[i] = el; }}
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

            <div
              className="absolute top-0 bottom-0 left-1/2 w-[2px] pointer-events-none z-[5]"
              style={{
                background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.15) 70%, transparent 100%)',
                marginLeft: -1,
              }}
            />

            {!isPinMode && currentPinRequests.map((pin) => (
              <PinMarker
                key={pin.id}
                number={parseInt(pin.pin!.label, 10)}
                xPercent={pin.pin!.xPercent}
                yPercent={pin.pin!.yPercent}
                isActive={focusedPinId === pin.id}
                isTargeted={!!targetRequestId && pin.id === targetRequestId}
                onClick={() => {
                  setFocusedPinId(pin.id);
                  handleViewRequest(pin);
                }}
              />
            ))}

            {pendingPin && showNewPinEditor && (
              <PinMarker
                number={parseInt(pendingPin.label, 10)}
                xPercent={pendingPin.xPercent}
                yPercent={pendingPin.yPercent}
                isActive={true}
              />
            )}
          </PinchZoomWrapper>

          {showDebug && (
            <>
              <style>{`
                .page { border: 2px solid red !important; box-sizing: border-box; }
                .page-image { border: 2px solid blue !important; box-sizing: border-box; }
              `}</style>
              <div className="absolute top-2 left-2 bg-black/85 text-white text-xs font-mono p-3 rounded z-50 leading-tight">
                <div>Pages: {pages.length} | Spreads: {totalSpreads}</div>
                <div>Current: spread {currentSpread + 1} / {totalSpreads}</div>
                <div>Indices: [{currentSpread * 2}, {currentSpread * 2 + 1}]</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-3 h-3 inline-block bg-red-500 rounded-sm" /> Page div
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 inline-block bg-blue-500 rounded-sm" /> Image layer
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {pendingPin && showNewPinEditor && (
        <div
          className="absolute z-30"
          style={{
            left: `calc(${pendingPin.xPercent}% + 28px)`,
            top: `${pendingPin.yPercent}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <NewPinEditor
            pinNumber={parseInt(pendingPin.label, 10)}
            onSave={handleNewPinSave}
            onCancel={handleNewPinCancel}
          />
        </div>
      )}

      {selectedRequest && selectedPinPos && (
        <div
          className="absolute z-30"
          style={{
            left: `calc(${selectedPinPos.xPercent}% + 28px)`,
            top: `${selectedPinPos.yPercent}%`,
            transform: 'translateY(-50%)',
          }}
        >
          <PinPopup
            request={selectedRequest}
            onUpdate={(id, message) => updateRequest(album.id, id, { message })}
            onDelete={handleDeleteRequest}
            onClose={handleClosePinPopup}
          />
        </div>
      )}

      {isPinMode && (
        <div className="fixed inset-0 z-20" onClick={(e) => e.stopPropagation()}>
          <div
            className="absolute inset-0 cursor-crosshair"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
              const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
              handlePinPlace(xPercent, yPercent);
            }}
            onTouchStart={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const touch = e.touches[0];
              const xPercent = ((touch.clientX - rect.left) / rect.width) * 100;
              const yPercent = ((touch.clientY - rect.top) / rect.height) * 100;
              handlePinPlace(xPercent, yPercent);
              e.preventDefault();
            }}
          />
        </div>
      )}

      {/* Mobile: floating toolbar */}
      {isMobile && (
        <FloatingBottomToolbar
          currentSpread={currentSpread}
          totalSpreads={totalSpreads}
          hasFeedback={hasFeedback}
          isPinMode={isPinMode}
          visible={uiVisible && !isPinMode}
          onAddComment={handleAddComment}
          onAddVoice={handleAddVoice}
          onUndo={handleUndoFeedback}
          onPrev={handlePrev}
          onNext={handleNext}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />
      )}

      {/* Desktop: sticky bottom bar */}
      {!isMobile && !isPreviewMode && (
        <StickyBottomBar
          currentSpread={currentSpread}
          totalSpreads={totalSpreads}
          hasFeedback={hasFeedback}
          isPinMode={isPinMode}
          onAddComment={handleAddComment}
          onAddVoice={handleAddVoice}
          onUndo={handleUndoFeedback}
          onPrev={handlePrev}
          onNext={handleNext}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
        />
      )}

      <HelpBottomSheet isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {showCompletion && (
        <ReviewCompletionModal
          albumId={album.id}
          totalPages={totalSpreads}
          studioName={studioName}
          phoneNumber={phoneNumber}
          studioLogoUrl={studioLogoUrl}
          onClose={() => setShowCompletion(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceMessageRecorder
          onSend={handleVoiceSend}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}
    </div>
  );
});

WeddingAlbumViewer.displayName = 'WeddingAlbumViewer';

export default WeddingAlbumViewer;
