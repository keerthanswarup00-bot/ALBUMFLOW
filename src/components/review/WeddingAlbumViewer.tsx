import { useEffect, useState, useCallback, forwardRef, useRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUIStore } from '@/store/uiStore';
import { ReviewProgressTracker } from './ReviewProgressTracker';
import { PageReviewBar } from './PageReviewBar';
import { ReviewSummaryScreen } from './ReviewSummaryScreen';
import { HelpPanel } from './HelpPanel';
import { GeneralRequestForm } from './GeneralRequestForm';
import { PinModeBanner } from './PinModeBanner';
import { PinPlacementOverlay } from './PinPlacementOverlay';
import { PinMarker } from './PinMarker';
import { PinForm } from './PinForm';
import { PinchZoomWrapper } from './PinchZoomWrapper';
import { FloatingFeedbackCard } from './FloatingFeedbackCard';
import { FeedbackBottomSheet } from './FeedbackBottomSheet';
import { RequestListScreen } from './RequestListScreen';
import { RequestDetailScreen } from './RequestDetailScreen';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
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

const WeddingAlbumViewer = forwardRef<HTMLDivElement, WeddingAlbumViewerProps>((props, ref) => {
  const { album, pages } = props;
  const [currentSpread, setCurrentSpread] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ xPercent: number; yPercent: number; label: string } | null>(null);
  const [commentLocation, setCommentLocation] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [showPinForm, setShowPinForm] = useState(false);
  const [showRequestList, setShowRequestList] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ViewerRequestChange | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [submittedThisSession, setSubmittedThisSession] = useState(0);

  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [focusedPinId, setFocusedPinId] = useState<string | null>(null);
  const [showMobileFeedback, setShowMobileFeedback] = useState(false);

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
    getRequests,
    getRequestsByPage,
    getRequestCount,
    deleteRequest,
    updateRequest,
    saveDraft,
    getDraft,
    clearDraft,
  } = useRequestStore();

  const {
    addRecording,
    getRecordings,
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

  const allRequests = getRequests(album.id);
  const allVoiceRecordings = getRecordings(album.id);
  const currentPageRequests = getRequestsByPage(album.id, currentSpread + 1);
  const totalRequests = getRequestCount(album.id);
  const totalVoiceRecordings = getRecordingCount(album.id);

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

  function toggleHelp() {
    setIsHelpOpen((prev) => !prev);
  }

  function handleAddComment() {
    setIsPinMode(true);
  }

  function handlePinPlace(xPercent: number, yPercent: number) {
    setIsPinMode(false);
    setCommentLocation({ xPercent, yPercent });
    setShowGeneralForm(true);
  }

  function handleGeneralSubmit(message: string) {
    if (commentLocation) {
      const existingPins = currentPageRequests.filter((r) => r.category === 'pin').length;
      addRequest(album.id, currentSpread + 1, 'pin', message, {
        xPercent: commentLocation.xPercent,
        yPercent: commentLocation.yPercent,
        label: String(existingPins + 1),
      });
    } else {
      addRequest(album.id, currentSpread + 1, 'general', message, null);
    }
    clearDraft(album.id);
    setSubmittedThisSession((c) => c + 1);
    showToast('Comment submitted', 'success');
  }

  function handleCancelGeneralForm() {
    const textarea = document.querySelector<HTMLTextAreaElement>('[data-draft="general"]');
    if (textarea?.value) {
      saveDraft(album.id, { category: 'general', message: textarea.value, pin: null, saved_at: Date.now() });
    }
    setCommentLocation(null);
    setShowGeneralForm(false);
    setSubmittedThisSession(0);
  }

  function handlePinSubmit(message: string) {
    if (pendingPin) {
      addRequest(album.id, currentSpread + 1, 'pin', message, {
        xPercent: pendingPin.xPercent,
        yPercent: pendingPin.yPercent,
        label: String(currentPageRequests.filter((r) => r.category === 'pin').length + 1),
      });
      clearDraft(album.id);
      setPendingPin(null);
      setShowPinForm(false);
      showToast('Pin request submitted', 'success');
    }
  }

  function handleCancelPinMode() {
    setIsPinMode(false);
    setPendingPin(null);
  }

  function handleCancelPinForm() {
    if (pendingPin) {
      saveDraft(album.id, { category: 'pin', message: '', pin: { xPercent: pendingPin.xPercent, yPercent: pendingPin.yPercent, label: pendingPin.label }, saved_at: Date.now() });
    }
    setPendingPin(null);
    setShowPinForm(false);
  }

  function handleViewRequest(request: ViewerRequestChange) {
    setSelectedRequest(request);
  }

  function handleDeleteRequest(id: string) {
    deleteRequest(album.id, id);
  }

  function handleVoiceSend(duration: number, audioData: string) {
    addRecording(album.id, currentSpread + 1, duration, audioData);
    setShowVoiceRecorder(false);
    showToast('Voice message sent', 'success');
  }

  function handleCloseRequestDetail() {
    setSelectedRequest(null);
  }

  function handleGoToPage(spreadNumber: number) {
    const targetPage = Math.max(0, (spreadNumber - 1) * 2);
    if (flipBookRef.current?.pageFlip()) {
      flipBookRef.current.pageFlip().flip(targetPage);
    }
    setShowGeneralForm(false);
    setShowPinForm(false);
    setShowVoiceRecorder(false);
    setIsPinMode(false);
    setPendingPin(null);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isHelpOpen) {
        if (e.key === 'Escape') setIsHelpOpen(false);
        return;
      }
      if (showGeneralForm || showPinForm || showVoiceRecorder || showRequestList || selectedRequest || showSummary) return;

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
          if (isFullscreen) document.exitFullscreen().catch(() => {});
          break;
        case 'd':
        case 'D':
          setShowDebug((p) => !p);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '?':
          toggleHelp();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen, isFullscreen, showGeneralForm, showPinForm, showVoiceRecorder, showRequestList, selectedRequest, showSummary, handleNext, handlePrev]);

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

  return (
    <div ref={ref} className="fixed inset-0 flex flex-col bg-[#2c1810] safe-area-inset">
      {!isFullscreen && (
        <div className="landscape:hidden">
          <ReviewProgressTracker
            albumTitle={album.title}
            reviewedCount={reviewedSpreads}
            totalPages={totalSpreads}
            completionPercent={completionPercent}
            isFullscreen={isFullscreen}
            onBack={() => window.history.back()}
            onToggleFullscreen={toggleFullscreen}
            onToggleHelp={toggleHelp}
            onToggleSummary={() => setShowSummary(true)}
            requestCount={totalRequests + totalVoiceRecordings}
            onToggleRequests={() => setShowRequestList(true)}
          />
        </div>
      )}

      {/* Top-right toolbar */}
      {!isFullscreen && (
        <div className="hidden sm:flex absolute right-3 top-14 z-20 items-center gap-2">
          {totalRequests > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-sm border border-gray-200/80">
              <MessageSquareText className="h-3.5 w-3.5 text-blue-500" />
              {totalRequests}
            </span>
          )}
          {totalVoiceRecordings > 0 && (
            <span className="flex items-center gap-1 rounded-lg bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold text-gray-700 shadow-sm border border-gray-200/80">
              🎤
              {totalVoiceRecordings}
            </span>
          )}
          <button
            onClick={() => setShowSummary(true)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
          >
            Submit Changes
          </button>
        </div>
      )}

      {submittedThisSession > 0 && !showGeneralForm && !isFullscreen && (
        <div className="flex items-center justify-center gap-2 bg-green-600 px-4 py-1.5">
          <span className="text-xs font-bold text-white">
            {submittedThisSession} comment{submittedThisSession !== 1 ? 's' : ''} submitted
          </span>
          <button
            onClick={() => {
              setCommentLocation(null);
              setShowGeneralForm(true);
            }}
            className="rounded-md bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-white/30 transition-colors cursor-pointer"
          >
            + Add More
          </button>
        </div>
      )}

      {isPinMode && !isFullscreen && (
        <PinModeBanner onCancel={handleCancelPinMode} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Album area */}
        <div className="relative flex-1 overflow-hidden bg-[#2c1810]">
          <PinchZoomWrapper isActive={true} onZoomChange={setIsZoomed}>
            {pages.length > 0 && (() => {
              const fp = pages[0];
              const pw = 400;
              const ph = fp ? Math.round(400 * (fp.height / fp.width)) : 600;

              return (
                <HTMLFlipBook
                  ref={flipBookRef}
                  width={pw}
                  height={ph}
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
                  {pages.map((page) => (
                    <div key={page.id} className="page" style={{ width: '100%', height: '100%' }}>
                      <div
                        className="page-image"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          backgroundImage: `url(${page.medium_url ?? page.image_url})`,
                          backgroundSize: '100% 100%',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      />
                    </div>
                  ))}
                </HTMLFlipBook>
              );
            })()}

            {/* Spine shadow overlay */}
            <div
              className="absolute top-0 bottom-0 left-1/2 w-[2px] pointer-events-none z-[5]"
              style={{
                background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.15) 70%, transparent 100%)',
                marginLeft: -1,
              }}
            />
          </PinchZoomWrapper>

          {/* Floating nav arrows — outside zoom wrapper so they stay clickable */}
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="absolute left-1 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-black/40 text-white shadow-lg backdrop-blur-sm hover:bg-black/60 active:bg-black/70 disabled:opacity-0 disabled:cursor-default transition-all cursor-pointer"
            aria-label="Previous spread"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="absolute right-1 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-black/40 text-white shadow-lg backdrop-blur-sm hover:bg-black/60 active:bg-black/70 disabled:opacity-0 disabled:cursor-default transition-all cursor-pointer"
            aria-label="Next spread"
          >
            <ChevronRight className="h-7 w-7" />
          </button>

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

        {/* Floating feedback card (desktop) */}
        {!isFullscreen && (
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

        {/* Mobile feedback bubble */}
        {!isFullscreen && (currentPageRequests.length > 0 || totalVoiceRecordings > 0) && (
          <button
            onClick={() => setShowMobileFeedback(true)}
            className="lg:hidden absolute right-3 top-3 z-20 flex h-11 items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3.5 shadow-lg border border-gray-200/80 hover:bg-white transition-all cursor-pointer"
          >
            <MessageSquareText className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-gray-900">{currentPageRequests.length + totalVoiceRecordings}</span>
          </button>
        )}
      </div>

      {/* Pin markers for placed comments */}
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

      {pendingPin && !showPinForm && (
        <PinMarker
          number={currentPageRequests.filter((r) => r.category === 'pin').length + 1}
          xPercent={pendingPin.xPercent}
          yPercent={pendingPin.yPercent}
          isActive={true}
          onClick={() => setShowPinForm(true)}
        />
      )}

      {isPinMode && (
        <PinPlacementOverlay
          onPlace={handlePinPlace}
          onCancel={handleCancelPinMode}
        />
      )}

      {!isFullscreen && (
        <PageReviewBar
          currentPage={currentSpread}
          totalPages={totalSpreads}
          isReviewed={isCurrentReviewed}
          onMarkReviewed={handleMarkReviewed}
          onUndoReview={handleUndoReview}
          saving={isSaving}
          onRequestChanges={handleAddComment}
          onVoiceMessage={() => setShowVoiceRecorder(true)}
        />
      )}

      <HelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

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

      {showGeneralForm && (
        <GeneralRequestForm
          pageNumber={currentSpread + 1}
          initialMessage={getDraft(album.id)?.message ?? ''}
          submittedCount={submittedThisSession}
          onSubmit={handleGeneralSubmit}
          onClose={handleCancelGeneralForm}
        />
      )}

      {showPinForm && pendingPin && (
        <PinForm
          pageNumber={currentSpread + 1}
          pinNumber={currentPageRequests.filter((r) => r.category === 'pin').length + 1}
          initialMessage={getDraft(album.id)?.message ?? ''}
          onSubmit={handlePinSubmit}
          onClose={handleCancelPinForm}
        />
      )}

      {showRequestList && (
        <RequestListScreen
          requests={allRequests}
          voiceRequests={allVoiceRecordings}
          onNavigateToPage={handleGoToPage}
          onViewRequest={handleViewRequest}
          onClose={() => setShowRequestList(false)}
        />
      )}

      {selectedRequest && (
        <RequestDetailScreen
          request={selectedRequest}
          onDelete={handleDeleteRequest}
          onUpdate={(id, message) => {
            updateRequest(album.id, id, { message });
          }}
          onNavigateToPage={handleGoToPage}
          onClose={handleCloseRequestDetail}
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
