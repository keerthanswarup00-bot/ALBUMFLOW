import { useEffect, useState, useCallback, forwardRef, useRef, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUIStore } from '@/store/uiStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import { ReviewProgressTracker } from './ReviewProgressTracker';
import { ReviewSummaryScreen } from './ReviewSummaryScreen';
import { HelpBottomSheet } from './HelpBottomSheet';
import { PinMarker } from './PinMarker';
import { PinPopup } from './PinPopup';
import { NewPinEditor } from './NewPinEditor';
import { FloatingActionPills } from './FloatingActionPills';
import { PinchZoomWrapper } from './PinchZoomWrapper';
import { FloatingFeedbackCard } from './FloatingFeedbackCard';
import { FeedbackBottomSheet } from './FeedbackBottomSheet';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import { MessageSquare, Mic } from 'lucide-react';
import type { ReviewAlbum, ReviewPage, ViewerRequestChange } from '@/types/viewer';
import { ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';

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
}

const AUTO_HIDE_DELAY = 3000;

const WeddingAlbumViewer = forwardRef<HTMLDivElement, WeddingAlbumViewerProps>((props, ref) => {
  const { album, pages } = props;
  const [currentSpread, setCurrentSpread] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
  const [showMobileFeedback, setShowMobileFeedback] = useState(false);
  const [albumContainerSize, setAlbumContainerSize] = useState({ width: 0, height: 0 });

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pageAspectRatio = useMemo(() => {
    if (pages.length === 0) return 0.75;
    return pages[0].width / pages[0].height;
  }, [pages]);

  const pageWidth = useMemo(() => {
    if (albumContainerSize.width === 0 || albumContainerSize.height === 0) return 400;
    const spreadAspect = 2 * pageAspectRatio;
    const containerAspect = albumContainerSize.width / albumContainerSize.height;
    if (containerAspect > spreadAspect) {
      return Math.round(albumContainerSize.height * pageAspectRatio);
    }
    return Math.round(albumContainerSize.width / 2);
  }, [albumContainerSize, pageAspectRatio]);

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
    markPageReviewed,
    undoReview,
    getReviewedCount,
    getViewedCount,
    getUnreviewedPages,
    getPageStatus,
    ensureAlbum,
  } = useReviewStore();

  const {
    addRequest,
    getRequestsByPage,
    getRequestCount,
    deleteRequest,
    updateRequest,
    clearDraft,
    getUnsubmittedCount,
    markAllAsSubmitted,
  } = useRequestStore();

  const {
    addRecording,
    getRecordingCount,
  } = useVoiceStore();

  const { showToast } = useUIStore();

  const reviewedHalves = getReviewedCount(album.id);
  const viewedHalves = getViewedCount(album.id);
  const reviewedSpreads = Math.floor(reviewedHalves / 2);
  const viewedSpreads = Math.floor(viewedHalves / 2);
  const completionPercent = totalSpreads > 0 ? Math.round((reviewedSpreads / totalSpreads) * 100) : 0;
  const unreviewedHalves = getUnreviewedPages(album.id, pages.length);
  const unreviewedSpreads = totalSpreads > 0
    ? [...new Set(unreviewedHalves.map((p) => Math.ceil(p / 2)))]
    : [];

  const currentPageRequests = getRequestsByPage(album.id, currentSpread + 1);
  const totalRequests = getRequestCount(album.id);
  const totalVoiceRecordings = getRecordingCount(album.id);

  const currentPinRequests = currentPageRequests.filter((r) => r.category === 'pin' && r.pin);

  const unsubmittedCount = getUnsubmittedCount(album.id);
  const hasUnsentChanges = unsubmittedCount > 0 || totalVoiceRecordings > 0;

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

  const canGoPrev = currentSpread > 0;
  const canGoNext = currentSpread < totalSpreads - 1;

  const isCurrentReviewed = (() => {
    const leftIdx = currentSpread * 2;
    const rightIdx = leftIdx + 1;
    const leftPageStatus = getPageStatus(album.id, leftIdx + 1);
    const rightPageStatus = rightIdx < pages.length ? getPageStatus(album.id, rightIdx + 1) : 'reviewed';
    return leftPageStatus === 'reviewed' && rightPageStatus === 'reviewed';
  })();

  function handleMarkReviewed() {
    setIsSaving(true);
    setTimeout(() => {
      const leftIdx = currentSpread * 2;
      markPageReviewed(album.id, leftIdx + 1, pages.length);
      if (leftIdx + 2 <= pages.length) {
        markPageReviewed(album.id, leftIdx + 2, pages.length);
      }
      setIsSaving(false);
    }, 300);
  }

  function handleUndoReview() {
    const leftIdx = currentSpread * 2;
    undoReview(album.id, leftIdx + 1, pages.length);
    if (leftIdx + 2 <= pages.length) {
      undoReview(album.id, leftIdx + 2, pages.length);
    }
  }

  function handleNavigateToPage(spreadNumber: number) {
    const targetPage = Math.max(0, (spreadNumber - 1) * 2);
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flip(targetPage);
    }
    setShowSummary(false);
  }

  function togglePreviewMode() {
    setIsPreviewMode((p) => !p);
    setControlsVisible(true);
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
    setControlsVisible(true);
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

  function handleVoiceSend(duration: number, audioData: string) {
    addRecording(album.id, currentSpread + 1, duration, audioData);
    setShowVoiceRecorder(false);
    showToast('Voice message sent', 'success');
  }

  function handleClosePinPopup() {
    setSelectedRequest(null);
    setSelectedPinPos(null);
  }

  const { submitReview } = useReviewCycleStore();

  function handleSubmitChanges() {
    markAllAsSubmitted(album.id);
    submitReview(album.id);
    showToast('Changes submitted to designer', 'success');
  }

  // --- Image quality: swap to full-res when zoomed ---
  useEffect(() => {
    pages.forEach((page, i) => {
      const el = imageRefs.current[i];
      if (el) {
        el.style.backgroundImage = `url(${zoomScale > 1 ? page.image_url : (page.medium_url ?? page.image_url)})`;
      }
    });
  }, [zoomScale > 1, pages]);

  // --- Auto-hide controls in preview mode ---
  function startHideTimer() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!isPreviewMode) return;
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, AUTO_HIDE_DELAY);
  }

  function cancelHideTimer() {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  function handleUserInteraction() {
    if (isPreviewMode) {
      setControlsVisible(true);
      startHideTimer();
    }
  }

  function handleTapControls() {
    if (isPreviewMode) {
      setControlsVisible((p) => !p);
      if (controlsVisible) {
        cancelHideTimer();
      } else {
        startHideTimer();
      }
    }
  }

  useEffect(() => {
    if (isPreviewMode) {
      startHideTimer();
    } else {
      cancelHideTimer();
      setControlsVisible(true);
    }
    return () => cancelHideTimer();
  }, [isPreviewMode]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isHelpOpen) {
        if (e.key === 'Escape') setIsHelpOpen(false);
        return;
      }
      if (showVoiceRecorder || showNewPinEditor || selectedRequest || showSummary) return;

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
          if (isPreviewMode) {
            setIsPreviewMode(false);
            setControlsVisible(true);
          }
          if (isFullscreen) document.exitFullscreen().catch(() => {});
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
  }, [isHelpOpen, isFullscreen, isPreviewMode, showVoiceRecorder, showNewPinEditor, selectedRequest, showSummary, handleNext, handlePrev, enterPreview]);

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

  const previewFloatingButtons = isPreviewMode && controlsVisible && (
    <div className="fixed bottom-5 right-4 z-30 flex flex-col gap-2">
      <button
        onClick={(e) => { e.stopPropagation(); handleAddComment(); }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 active:bg-blue-800 transition-all cursor-pointer"
        aria-label="Add comment"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setShowVoiceRecorder(true); }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-xl hover:bg-purple-700 active:bg-purple-800 transition-all cursor-pointer"
        aria-label="Record voice"
      >
        <Mic className="h-6 w-6" />
      </button>
    </div>
  );

  return (
    <div
      ref={ref}
      className="fixed inset-0 flex flex-col bg-[#2c1810] safe-area-inset"
      onTouchStart={handleUserInteraction}
      onMouseMove={handleUserInteraction}
      onClick={handleUserInteraction}
    >
      {/* Header: overlay in preview, normal in regular mode */}
      {(isPreviewMode && controlsVisible) && (
        <div className="absolute top-0 left-0 right-0 z-30 transition-opacity duration-300 opacity-100">
          <div className="landscape:max-h-[52px] landscape:overflow-hidden">
            <ReviewProgressTracker
              currentSpread={currentSpread}
              albumTitle={album.title}
              reviewedCount={reviewedSpreads}
              totalPages={totalSpreads}
              completionPercent={completionPercent}
              isFullscreen={false}
              isPreviewMode={true}
              onBack={() => window.history.back()}
              onToggleFullscreen={toggleFullscreen}
              onToggleHelp={toggleHelp}
              onToggleSummary={() => setShowSummary(true)}
              onTogglePreview={togglePreviewMode}
              requestCount={totalRequests + totalVoiceRecordings}
              onToggleRequests={() => setShowMobileFeedback(true)}
            />
          </div>
        </div>
      )}

      {!isPreviewMode && !isFullscreen && (
        <div className="landscape:max-h-[52px] landscape:overflow-hidden">
          <ReviewProgressTracker
            currentSpread={currentSpread}
            albumTitle={album.title}
            reviewedCount={reviewedSpreads}
            totalPages={totalSpreads}
            completionPercent={completionPercent}
            isFullscreen={false}
            onBack={() => window.history.back()}
            onToggleFullscreen={toggleFullscreen}
            onToggleHelp={toggleHelp}
            onToggleSummary={() => setShowSummary(true)}
            onTogglePreview={enterPreview}
            requestCount={totalRequests + totalVoiceRecordings}
            onToggleRequests={() => setShowMobileFeedback(true)}
          />
        </div>
      )}

      {/* Top-right toolbar */}
      {!isPreviewMode && !isFullscreen && (
        <div className="hidden sm:flex absolute right-3 top-16 z-20 items-center gap-1.5">
          {totalRequests > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm border border-gray-200/80">
              <MessageSquareText className="h-4 w-4 text-blue-500" />
              {totalRequests}
            </span>
          )}
          {totalVoiceRecordings > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm border border-gray-200/80">
              🎤
              {totalVoiceRecordings}
            </span>
          )}
          <button
            onClick={handleSubmitChanges}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed min-h-[36px]"
            disabled={!hasUnsentChanges}
          >
            Submit Changes
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden" onClick={(e) => { if (isPreviewMode) { e.stopPropagation(); handleTapControls(); } }}>
        {/* Album area */}
        <div ref={albumContainerRef} className="relative flex-1 overflow-hidden bg-[#2c1810]">
          <PinchZoomWrapper isActive={true} onZoomChange={setIsZoomed} onScaleChange={setZoomScale}>
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
                  useMouseEvents={!isZoomed}
                  swipeDistance={isZoomed ? 9999 : 50}
                  mobileScrollSupport={!isZoomed}
                  clickEventForward={false}
                  disableFlipByClick={isZoomed}
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

            {/* Spine shadow */}
            <div
              className="absolute top-0 bottom-0 left-1/2 w-[2px] pointer-events-none z-[5]"
              style={{
                background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.15) 70%, transparent 100%)',
                marginLeft: -1,
              }}
            />
          </PinchZoomWrapper>

          {/* Nav arrows: always visible, but auto-hide in preview */}
          <div className={`transition-opacity duration-300 ${isPreviewMode && !controlsVisible ? 'opacity-0 pointer-events-none' : ''}`}>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              disabled={!canGoPrev}
              className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-black/40 text-white shadow-lg backdrop-blur-sm hover:bg-black/60 active:bg-black/70 disabled:opacity-0 disabled:cursor-default transition-all cursor-pointer"
              aria-label="Previous spread"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              disabled={!canGoNext}
              className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-black/40 text-white shadow-lg backdrop-blur-sm hover:bg-black/60 active:bg-black/70 disabled:opacity-0 disabled:cursor-default transition-all cursor-pointer"
              aria-label="Next spread"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </div>

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

        {/* Desktop feedback card: hidden in preview */}
        {!isFullscreen && !isPreviewMode && (
          <FloatingFeedbackCard
            comments={currentPageRequests}
            voiceCount={totalVoiceRecordings}
            onAddComment={handleAddComment}
            onViewComment={(id) => {
              const req = currentPageRequests.find((r) => r.id === id);
              if (req) handleViewRequest(req);
            }}
            focusedPinId={focusedPinId}
            onPinFocus={setFocusedPinId}
          />
        )}

        {/* Mobile feedback bubble: hidden in preview */}
        {!isFullscreen && !isPreviewMode && (currentPageRequests.length > 0 || totalVoiceRecordings > 0) && (
          <button
            onClick={() => setShowMobileFeedback(true)}
            className="lg:hidden absolute right-3 top-3 z-20 flex h-12 items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-4 shadow-lg border border-gray-200/80 hover:bg-white transition-all cursor-pointer"
          >
            <MessageSquareText className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">{currentPageRequests.length + totalVoiceRecordings}</span>
          </button>
        )}
      </div>

      {/* Pin markers */}
      {!isPinMode && currentPinRequests.map((pin) => (
        <PinMarker
          key={pin.id}
          number={parseInt(pin.pin!.label, 10)}
          xPercent={pin.pin!.xPercent}
          yPercent={pin.pin!.yPercent}
          isActive={focusedPinId === pin.id}
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
          />
        </div>
      )}

      {/* Floating action pills: hidden in preview (replaced by minified buttons) */}
      {!isPreviewMode && (
        <FloatingActionPills
          isReviewed={isCurrentReviewed}
          saving={isSaving}
          onComment={handleAddComment}
          onVoice={() => setShowVoiceRecorder(true)}
          onApprove={handleMarkReviewed}
          onUndo={handleUndoReview}
        />
      )}

      {/* Preview mode floating comment/voice buttons */}
      {previewFloatingButtons}

      <HelpBottomSheet isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {showSummary && (
        <ReviewSummaryScreen
          albumId={album.id}
          albumTitle={album.title}
          totalPages={totalSpreads}
          reviewedCount={reviewedSpreads}
          viewedCount={viewedSpreads}
          completionPercent={completionPercent}
          unreviewedPages={unreviewedSpreads}
          onNavigateToPage={handleNavigateToPage}
          onClose={() => setShowSummary(false)}
        />
      )}

      {showVoiceRecorder && (
        <VoiceMessageRecorder
          onSend={handleVoiceSend}
          onClose={() => setShowVoiceRecorder(false)}
        />
      )}

      <FeedbackBottomSheet
        comments={currentPageRequests}
        voiceCount={totalVoiceRecordings}
        isOpen={showMobileFeedback}
        onClose={() => setShowMobileFeedback(false)}
        onAddComment={handleAddComment}
        onViewComment={(id) => {
          const req = currentPageRequests.find((r) => r.id === id);
          if (req) handleViewRequest(req);
        }}
        focusedPinId={focusedPinId}
      />
    </div>
  );
});

WeddingAlbumViewer.displayName = 'WeddingAlbumViewer';

export default WeddingAlbumViewer;
