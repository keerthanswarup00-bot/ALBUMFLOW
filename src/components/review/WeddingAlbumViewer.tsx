import { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUIStore } from '@/store/uiStore';
import { ReviewProgressTracker } from './ReviewProgressTracker';
import { PageReviewBar } from './PageReviewBar';
import { ReviewSummaryScreen } from './ReviewSummaryScreen';
import { HelpPanel } from './HelpPanel';
import { RequestTypeModal } from './RequestTypeModal';
import { GeneralRequestForm } from './GeneralRequestForm';
import { PinModeBanner } from './PinModeBanner';
import { PinPlacementOverlay } from './PinPlacementOverlay';
import { PinMarker } from './PinMarker';
import { PinForm } from './PinForm';
import { RequestListScreen } from './RequestListScreen';
import { RequestDetailScreen } from './RequestDetailScreen';
import { VoiceMessageRecorder } from './VoiceMessageRecorder';
import type { ReviewAlbum, ReviewPage, ViewerRequestChange } from '@/types/viewer';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeddingAlbumViewerProps {
  album: ReviewAlbum;
  pages: ReviewPage[];
}

interface SpreadData {
  spreadId: string;
  fullImage: string;
  leftHalf: string;
  rightHalf: string;
  leftHalfWidth: number;
  leftHalfHeight: number;
  rightHalfWidth: number;
  rightHalfHeight: number;
}

const WeddingAlbumViewer = forwardRef<HTMLDivElement, WeddingAlbumViewerProps>((props, ref) => {
  const { album, pages } = props;
  const [currentSpread, setCurrentSpread] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showRequestType, setShowRequestType] = useState(false);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ xPercent: number; yPercent: number; label: string } | null>(null);
  const [showPinForm, setShowPinForm] = useState(false);
  const [showRequestList, setShowRequestList] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ViewerRequestChange | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const spreadContainerRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);

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

  const getSpreadData = useCallback((spreadIndex: number): SpreadData | null => {
    if (spreadIndex < 0 || spreadIndex >= totalSpreads) return null;

    const leftPage = pages[currentPageLeft];
    const rightPage = pages[currentPageRight];

    if (!leftPage || !rightPage) return null;

    return {
      spreadId: `spread_${spreadIndex + 1}`,
      fullImage: leftPage.medium_url ?? leftPage.image_url,
      leftHalf: leftPage.medium_url ?? leftPage.image_url,
      rightHalf: rightPage.medium_url ?? rightPage.image_url,
      leftHalfWidth: leftPage.width,
      leftHalfHeight: leftPage.height,
      rightHalfWidth: rightPage.width,
      rightHalfHeight: rightPage.height,
    };
  }, [pages, currentPageLeft, currentPageRight, totalSpreads]);

  const currentSpreadData = getSpreadData(currentSpread);

  const handleNext = useCallback(() => {
    setCurrentSpread((prev) => Math.min(prev + 1, totalSpreads - 1));
  }, [totalSpreads]);

  const handlePrev = useCallback(() => {
    setCurrentSpread((prev) => Math.max(prev - 1, 0));
  }, []);

  const canGoPrev = currentSpread > 0;
  const canGoNext = currentSpread < totalSpreads - 1;

  const isCurrentReviewed = (() => {
    if (!currentSpreadData) return false;
    const leftPageStatus = getPageStatus(album.id, currentPageLeft + 1);
    const rightPageStatus = currentPageRight < pages.length ? getPageStatus(album.id, currentPageRight + 1) : 'reviewed';
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
    setCurrentSpread(Math.max(0, spreadNumber - 1));
    setShowSummary(false);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        /* fullscreen not supported or denied */
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {
        /* not in fullscreen */
      }
    }
  }

  function toggleHelp() {
    setIsHelpOpen((prev) => !prev);
  }

  function handleSelectGeneral() {
    setShowRequestType(false);
    setShowGeneralForm(true);
  }

  function handleSelectPin() {
    setShowRequestType(false);
    setIsPinMode(true);
  }

  function handleGeneralSubmit(message: string) {
    addRequest(album.id, currentSpread + 1, 'general', message, null);
    clearDraft(album.id);
    setShowGeneralForm(false);
    showToast('Request submitted', 'success');
  }

  function handlePinPlace(xPercent: number, yPercent: number) {
    setPendingPin({ xPercent, yPercent, label: String(currentPageRequests.filter((r) => r.category === 'pin').length + 1) });
    setIsPinMode(false);
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

  function handleCancelGeneralForm() {
    const textarea = document.querySelector<HTMLTextAreaElement>('[data-draft="general"]');
    if (textarea?.value) {
      saveDraft(album.id, { category: 'general', message: textarea.value, pin: null, saved_at: Date.now() });
    }
    setShowGeneralForm(false);
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
    setCurrentSpread(Math.max(0, spreadNumber - 1));
    setShowRequestType(false);
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
      if (showGeneralForm || showPinForm || showVoiceRecorder || showRequestType || showRequestList || selectedRequest || showSummary) return;

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
  }, [isHelpOpen, isFullscreen, showGeneralForm, showPinForm, showVoiceRecorder, showRequestType, showRequestList, selectedRequest, showSummary, handleNext, handlePrev]);

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
      )}

      {isPinMode && !isFullscreen && (
        <PinModeBanner onCancel={handleCancelPinMode} />
      )}

      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-8">
        <div
          ref={spreadContainerRef}
          className="relative w-full max-w-6xl aspect-[3/2] perspective-1000"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {currentSpreadData && (
              <div className="relative w-full h-full">
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(0deg) translateZ(0) scale(1)`,
                    transition: 'transform 0.3s ease-out',
                  }}
                >
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div
                        className="relative bg-white rounded-lg shadow-2xl overflow-hidden"
                        style={{
                          width: '100%',
                          height: '100%',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div className="absolute inset-0 flex">
                          <div
                            className="relative flex-1 h-full overflow-hidden"
                            style={{
                              backgroundImage: `url(${currentSpreadData.leftHalf})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"
                            />
                          </div>

                          <div
                            ref={spineRef}
                            className="w-0.5 bg-gradient-to-b from-[#8b5e3c] via-[#a67c52] to-[#8b5e3c] shadow-inner"
                            style={{
                              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)',
                            }}
                          />

                          <div
                            className="relative flex-1 h-full overflow-hidden"
                            style={{
                              backgroundImage: `url(${currentSpreadData.rightHalf})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          >
                            <div
                              className="absolute inset-0 bg-gradient-to-l from-black/20 to-transparent"
                            />
                          </div>
                        </div>

                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/30 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent" />
                          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/30 to-transparent" />
                          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/30 to-transparent" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isFullscreen && (
        <>
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className="absolute left-3 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-xl backdrop-blur-sm hover:bg-white active:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="absolute right-3 top-1/2 z-10 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-xl backdrop-blur-sm hover:bg-white active:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </>
      )}

      {!isPinMode && currentPageRequests.map((pin, idx) => (
        <PinMarker
          key={pin.id}
          number={idx + 1}
          xPercent={pin.pin!.xPercent}
          yPercent={pin.pin!.yPercent}
          onClick={() => handleViewRequest(pin)}
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
          onRequestChanges={() => setShowRequestType(true)}
          onVoiceMessage={() => setShowVoiceRecorder(true)}
          onGoToPage={handleGoToPage}
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

      {showRequestType && (
        <RequestTypeModal
          onSelectGeneral={handleSelectGeneral}
          onSelectPin={handleSelectPin}
          onClose={() => setShowRequestType(false)}
        />
      )}

      {showGeneralForm && (
        <GeneralRequestForm
          pageNumber={currentSpread + 1}
          initialMessage={getDraft(album.id)?.message ?? ''}
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
    </div>
  );
});

WeddingAlbumViewer.displayName = 'WeddingAlbumViewer';

export default WeddingAlbumViewer;