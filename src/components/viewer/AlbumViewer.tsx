import { useEffect, useRef, useCallback, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
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
import type { ReviewAlbum, ReviewVersion, ReviewPage, ViewerRequestChange } from '@/types/viewer';

interface AlbumViewerProps {
  album: ReviewAlbum;
  version: ReviewVersion | null;
  pages: ReviewPage[];
}

function FlipPage({ page }: { page: ReviewPage }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f5f0eb]">
      <img
        src={page.medium_url ?? page.image_url}
        alt={`Page ${page.page_number}`}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export function AlbumViewer({ album, version: _version, pages }: AlbumViewerProps) {
  const flipBookRef = useRef<any>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipMode, setFlipMode] = useState<'portrait' | 'landscape'>('portrait');
  const [forcePortrait, setForcePortrait] = useState(true);

  const totalPages = pages.length;

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

  const {
    markPageViewed,
    markPageReviewed,
    undoReview,
    getReviewedCount,
    getViewedCount,
    getCompletionPercent,
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

  const reviewedCount = getReviewedCount(album.id);
  const viewedCount = getViewedCount(album.id);
  const completionPercent = getCompletionPercent(album.id, totalPages);
  const unreviewedPages = getUnreviewedPages(album.id, totalPages);

  const allRequests = getRequests(album.id);
  const allVoiceRecordings = getRecordings(album.id);
  const currentPageRequests = getRequestsByPage(album.id, currentPage + 1);
  const totalRequests = getRequestCount(album.id);
  const totalVoiceRecordings = getRecordingCount(album.id);

  useEffect(() => {
    ensureAlbum(album.id, totalPages);
  }, [album.id, totalPages, ensureAlbum]);

  const currentPagePins = currentPageRequests.filter((r) => r.category === 'pin');
  const currentPinNumber = currentPagePins.length + 1;

  useEffect(() => {
    if (totalPages > 0) {
      markPageViewed(album.id, currentPage + 1, totalPages);
      if (flipMode === 'landscape' && currentPage + 2 <= totalPages) {
        markPageViewed(album.id, currentPage + 2, totalPages);
      }
    }
  }, [currentPage, flipMode, album.id, totalPages, markPageViewed]);

  const handleFlip = useCallback((e: any) => {
    const pageIndex = typeof e.data === 'number' ? e.data : 0;
    setCurrentPage(pageIndex);
  }, []);

  const handleOrientationChange = useCallback((e: any) => {
    const mode = e.data || e?.object?.getOrientation?.() || 'portrait';
    setFlipMode(mode);
  }, []);

  const handleInit = useCallback((e: any) => {
    const pageIndex = typeof e.page === 'number' ? e.page : 0;
    const mode = e.mode || 'portrait';
    setCurrentPage(pageIndex);
    setFlipMode(mode);
  }, []);

  useEffect(() => {
    const savedDraft = getDraft(album.id);
    if (!savedDraft) return;
    window.setTimeout(() => {
      if (savedDraft.category === 'general') {
        setShowGeneralForm(true);
      } else if (savedDraft.category === 'pin' && savedDraft.pin) {
        setPendingPin(savedDraft.pin);
        setShowPinForm(true);
      }
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          flipBookRef.current?.pageFlip().flipPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          flipBookRef.current?.pageFlip().flipNext();
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
  }, [isHelpOpen, isFullscreen, showGeneralForm, showPinForm, showVoiceRecorder, showRequestType, showRequestList, selectedRequest, showSummary]);

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

  const isCurrentReviewed = (() => {
    if (getPageStatus(album.id, currentPage + 1) === 'reviewed') return true;
    if (flipMode === 'landscape' && currentPage + 2 <= totalPages) {
      if (getPageStatus(album.id, currentPage + 2) === 'reviewed') return true;
    }
    return false;
  })();

  function handleMarkReviewed() {
    setIsSaving(true);
    setTimeout(() => {
      markPageReviewed(album.id, currentPage + 1, totalPages);
      if (flipMode === 'landscape' && currentPage + 2 <= totalPages) {
        markPageReviewed(album.id, currentPage + 2, totalPages);
      }
      setIsSaving(false);
    }, 300);
  }

  function handleUndoReview() {
    undoReview(album.id, currentPage + 1, totalPages);
    if (flipMode === 'landscape' && currentPage + 2 <= totalPages) {
      undoReview(album.id, currentPage + 2, totalPages);
    }
  }

  function handleNavigateToPage(pageNumber: number) {
    flipBookRef.current?.pageFlip().turnToPage(pageNumber - 1);
    setShowSummary(false);
  }

  const navigatePrev = useCallback(() => {
    flipBookRef.current?.pageFlip().flipPrev();
  }, []);

  const navigateNext = useCallback(() => {
    flipBookRef.current?.pageFlip().flipNext();
  }, []);

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  function toggleMode() {
    setForcePortrait((prev) => !prev);
  }

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch {}
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch {}
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
    addRequest(album.id, currentPage + 1, 'general', message, null);
    clearDraft(album.id);
    setShowGeneralForm(false);
    showToast('Request submitted', 'success');
  }

  function handlePinPlace(xPercent: number, yPercent: number) {
    setPendingPin({ xPercent, yPercent, label: String(currentPinNumber) });
    setIsPinMode(false);
    setShowPinForm(true);
  }

  function handlePinSubmit(message: string) {
    if (pendingPin) {
      addRequest(album.id, currentPage + 1, 'pin', message, {
        xPercent: pendingPin.xPercent,
        yPercent: pendingPin.yPercent,
        label: String(currentPinNumber),
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
    addRecording(album.id, currentPage + 1, duration, audioData);
    setShowVoiceRecorder(false);
    showToast('Voice message sent', 'success');
  }

  function handleCloseRequestDetail() {
    setSelectedRequest(null);
  }

  function handleGoToPage(page: number) {
    flipBookRef.current?.pageFlip().turnToPage(page - 1);
    setShowRequestType(false);
    setShowGeneralForm(false);
    setShowPinForm(false);
    setShowVoiceRecorder(false);
    setIsPinMode(false);
    setPendingPin(null);
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-[#2c1810] safe-area-inset">
      {!isFullscreen && (
        <ReviewProgressTracker
          albumTitle={album.title}
          reviewedCount={reviewedCount}
          totalPages={totalPages}
          completionPercent={completionPercent}
          mode={flipMode === 'landscape' ? 'spread' : 'single'}
          isFullscreen={isFullscreen}
          onBack={() => window.history.back()}
          onToggleMode={toggleMode}
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

      <div className="relative flex-1 overflow-hidden">
        <HTMLFlipBook
          ref={flipBookRef}
          width={400}
          height={560}
          size="stretch"
          minWidth={200}
          maxWidth={2000}
          minHeight={200}
          maxHeight={2000}
          drawShadow={true}
          flippingTime={800}
          usePortrait={forcePortrait}
          startZIndex={0}
          autoSize={true}
          maxShadowOpacity={0.9}
          showCover={false}
          mobileScrollSupport={true}
          swipeDistance={30}
          clickEventForward={true}
          useMouseEvents={true}
          showPageCorners={true}
          disableFlipByClick={false}
          startPage={0}
          className="flipbook"
          style={{ height: '100%', width: '100%' }}
          onFlip={handleFlip}
          onChangeOrientation={handleOrientationChange}
          onInit={handleInit}
        >
          {pages.map((page) => (
            <FlipPage key={page.id} page={page} />
          ))}
        </HTMLFlipBook>

        {!isPinMode && currentPagePins.map((pin, idx) => (
          <PinMarker
            key={pin.id}
            number={idx + 1}
            xPercent={pin.pin!.xPercent}
            yPercent={pin.pin!.yPercent}
            onClick={() => handleViewRequest(pin)}
          />
        ))}

        {isPinMode && (
          <PinPlacementOverlay
            onPlace={handlePinPlace}
            onCancel={handleCancelPinMode}
          />
        )}
      </div>

      {!isFullscreen && (
        <PageReviewBar
          currentPage={currentPage}
          totalPages={totalPages}
          isReviewed={isCurrentReviewed}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          onPrev={navigatePrev}
          onNext={navigateNext}
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
          totalPages={totalPages}
          reviewedCount={reviewedCount}
          viewedCount={viewedCount}
          completionPercent={completionPercent}
          unreviewedPages={unreviewedPages}
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
          pageNumber={currentPage + 1}
          initialMessage={getDraft(album.id)?.message ?? ''}
          onSubmit={handleGeneralSubmit}
          onClose={handleCancelGeneralForm}
        />
      )}

      {showPinForm && pendingPin && (
        <PinForm
          pageNumber={currentPage + 1}
          pinNumber={currentPinNumber}
          initialMessage={getDraft(album.id)?.message ?? ''}
          onSubmit={handlePinSubmit}
          onClose={handleCancelPinForm}
        />
      )}

      {showRequestList && (
        <RequestListScreen
          requests={allRequests}
          voiceRequests={allVoiceRecordings}
          onNavigateToPage={handleNavigateToPage}
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
          onNavigateToPage={handleNavigateToPage}
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
}
