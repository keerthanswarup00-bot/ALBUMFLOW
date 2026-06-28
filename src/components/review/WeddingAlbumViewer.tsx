import { useEffect, useState, useCallback, forwardRef, useRef, useMemo } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUIStore } from '@/store/uiStore';
import { useIsCompact } from '@/hooks/useIsMobile';
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
import { uploadVoiceNote, renderImageUrl } from '@/services/supabase/storage';
import type { ReviewAlbum, ReviewPage, ViewerRequestChange } from '@/types/viewer';

interface FlipBookHandle {
  pageFlip: () => { flipNext: () => void; flipPrev: () => void; flip: (page: number) => void };
}

const BOOK_STYLE = { backgroundColor: 'transparent' as const };
interface FlipEvent { data: unknown; object: unknown }

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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [focusedPinId, setFocusedPinId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const albumContainerRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isHelpOpenRef = useRef(false);
  const showVoiceRecorderRef = useRef(false);
  const showNewPinEditorRef = useRef(false);
  const selectedRequestRef = useRef<ViewerRequestChange | null>(null);
  const showCompletionRef = useRef(false);
  const isPinModeRef = useRef(false);
  const hasFlippedToTargetRef = useRef(false);
  const pinOverlayRef = useRef<HTMLDivElement>(null);

  const isCompact = useIsCompact();

  const markPageViewed = useReviewStore((s) => s.markPageViewed);
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const ensureAlbum = useReviewStore((s) => s.ensureAlbum);
  const addRequest = useRequestStore((s) => s.addRequest);
  const getRequestsByPage = useRequestStore((s) => s.getRequestsByPage);
  const deleteRequest = useRequestStore((s) => s.deleteRequest);
  const updateRequest = useRequestStore((s) => s.updateRequest);
  const clearDraft = useRequestStore((s) => s.clearDraft);
  const addRecording = useVoiceStore((s) => s.addRecording);
  const getRecordingsByPage = useVoiceStore((s) => s.getRecordingsByPage);
  const deleteRecording = useVoiceStore((s) => s.deleteRecording);
  const showToast = useUIStore((s) => s.showToast);

  const totalSpreads = Math.floor(pages.length / 2);
  const currentPageLeft = currentSpread * 2;
  const currentPageRight = currentPageLeft + 1;
  const reviewedHalves = getReviewedCount(album.id);
  const completionPercent = totalSpreads > 0 ? Math.round((Math.floor(reviewedHalves / 2) / totalSpreads) * 100) : 0;
  const currentPageRequests = getRequestsByPage(album.id, currentSpread + 1);
  const currentPageVoice = getRecordingsByPage(album.id, currentSpread + 1);
  const hasFeedback = currentPageRequests.length > 0 || currentPageVoice.length > 0;
  const currentPinRequests = currentPageRequests.filter((r) => r.category === 'pin' && r.pin);
  const canGoPrev = currentSpread > 0 && !isPinMode;
  const canGoNext = currentSpread < totalSpreads - 1 && !isPinMode;
  const showMobileUI = isCompact && !isPinMode;

  /* Album container size via ResizeObserver */
  const [albumContainerSize, setAlbumContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = albumContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setAlbumContainerSize((prev) => prev.width === width && prev.height === height ? prev : { width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageAspect = useMemo(() => (pages.length > 0 ? pages[0].width / pages[0].height : 0.75), [pages]);
  const pageWidth = useMemo(() => {
    if (albumContainerSize.width === 0 || albumContainerSize.height === 0) return 400;
    const spreadAspect = 2 * pageAspect;
    const containerAspect = albumContainerSize.width / albumContainerSize.height;
    const hFactor = isCompact ? 0.98 : 0.88;
    const wFactor = isCompact ? 0.99 : 0.96;
    const targetH = albumContainerSize.height * hFactor;
    const targetW = albumContainerSize.width * wFactor;
    let w: number;
    if (containerAspect > spreadAspect) {
      w = Math.min(targetH * pageAspect * 2, targetW) / 2;
    } else {
      w = targetW / 2;
    }
    return Math.max(50, Math.min(Math.round(w), 2000));
  }, [albumContainerSize, pageAspect, isCompact]);

  const pageHeight = useMemo(
    () => (pageWidth === 0 ? 600 : Math.round(pageWidth / pageAspect)),
    [pageWidth, pageAspect],
  );

  /* Lifecycle effects */
  useEffect(() => { ensureAlbum(album.id, totalSpreads); }, [album.id, totalSpreads, ensureAlbum]);
  useEffect(() => {
    if (pages.length > 0) {
      markPageViewed(album.id, currentPageLeft + 1, pages.length);
      if (currentPageRight < pages.length) markPageViewed(album.id, currentPageRight + 1, pages.length);
    }
  }, [currentSpread, album.id, pages.length, markPageViewed]);

  /* Overscroll prevention */
  useEffect(() => {
    document.body.style.overscrollBehavior = 'none';
    return () => { document.body.style.overscrollBehavior = ''; };
  }, []);

  /* Fullscreen change tracking */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* Image resolution switching */
  useEffect(() => {
    const useFullRes = zoomScale >= 2;
    pages.forEach((page, i) => {
      const el = imageRefs.current[i];
      if (el) {
        el.style.backgroundImage = `url(${renderImageUrl(useFullRes ? page.image_url : (page.medium_url ?? page.image_url))})`;
      }
    });
  }, [zoomScale, pages]);

  /* Target page navigation */
  useEffect(() => {
    if (!targetPage || hasFlippedToTargetRef.current || !flipBookRef.current?.pageFlip) return;
    if (pages.length === 0) return;
    const clampedPage = Math.max(1, Math.min(targetPage, totalSpreads));
    requestAnimationFrame(() => {
      try { flipBookRef.current?.pageFlip()?.flip((clampedPage - 1) * 2); hasFlippedToTargetRef.current = true; } catch { /* empty */ }
    });
  }, [targetPage, pages, totalSpreads]);

  useEffect(() => {
    if (!targetRequestId || !targetPage || !hasFlippedToTargetRef.current) return;
    if (currentSpread !== targetPage - 1) return;
    const found = getRequestsByPage(album.id, targetPage).find((r) => r.id === targetRequestId);
    if (found) {
      setSelectedRequest(found);
      if (found.pin) setSelectedPinPos({ xPercent: found.pin.xPercent, yPercent: found.pin.yPercent });
      setFocusedPinId(found.id);
    }
  }, [currentSpread, targetPage, targetRequestId, album.id, getRequestsByPage]);

  /* Handlers */
  const handleFlip = useCallback((e: FlipEvent) => {
    setCurrentSpread(Math.floor((e.data as number) / 2));
  }, []);

  const handleInit = useCallback((e: FlipEvent) => {
    const d = e.data as { page?: number; mode?: string } | null;
    if (!d || typeof d.page !== 'number') return;
    setCurrentSpread(Math.floor(d.page / 2));
  }, []);

  const isFlippingRef = useRef(false);

  const handleNext = useCallback(() => {
    if (isFlippingRef.current) return;
    const book = flipBookRef.current?.pageFlip();
    if (!book) return;
    isFlippingRef.current = true;
    book.flipNext();
    setTimeout(() => { isFlippingRef.current = false; }, 900);
  }, []);

  const handlePrev = useCallback(() => {
    if (isFlippingRef.current) return;
    const book = flipBookRef.current?.pageFlip();
    if (!book) return;
    isFlippingRef.current = true;
    book.flipPrev();
    setTimeout(() => { isFlippingRef.current = false; }, 900);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); } else { await document.exitFullscreen(); }
    } catch { /* empty */ }
  }, []);

  /* Pin/Comment handlers */
  const handlePinPlace = useCallback((xPercent: number, yPercent: number) => {
    setIsPinMode(false);
    setPendingPin({ xPercent, yPercent, label: String(currentPageRequests.filter((r) => r.category === 'pin').length + 1) });
    setShowNewPinEditor(true);
  }, [currentPageRequests]);

  const handleNewPinSave = useCallback((message: string) => {
    if (pendingPin) {
      addRequest(album.id, currentSpread + 1, 'pin', message, { xPercent: pendingPin.xPercent, yPercent: pendingPin.yPercent, label: pendingPin.label });
      clearDraft(album.id);
      setPendingPin(null);
      setShowNewPinEditor(false);
      showToast('Comment added', 'success');
    }
  }, [pendingPin, album.id, currentSpread, addRequest, clearDraft, showToast]);

  const handleNewPinCancel = useCallback(() => { setPendingPin(null); setShowNewPinEditor(false); }, []);

  /* Keyboard handling */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isHelpOpenRef.current || showVoiceRecorderRef.current || showNewPinEditorRef.current || selectedRequestRef.current || showCompletionRef.current) return;
      if (isPinModeRef.current) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); handlePrev(); break;
        case 'ArrowRight': e.preventDefault(); handleNext(); break;
        case 'Escape': if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); break;
        case '?': setIsHelpOpen((p) => !p); break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleNext, handlePrev]);

  /* Pin overlay touch handling */
  useEffect(() => {
    const el = pinOverlayRef.current;
    if (!el || !isPinMode) return;
    const onTouchStart = (e: TouchEvent) => {
      const rect = el.getBoundingClientRect();
      const touch = e.touches[0];
      handlePinPlace(((touch.clientX - rect.left) / rect.width) * 100, ((touch.clientY - rect.top) / rect.height) * 100);
      e.preventDefault();
    };
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    return () => el.removeEventListener('touchstart', onTouchStart);
  }, [isPinMode, handlePinPlace]);

  /* Sync refs for keyboard handler (stale closure guard) */
  isHelpOpenRef.current = isHelpOpen;
  showVoiceRecorderRef.current = showVoiceRecorder;
  showNewPinEditorRef.current = showNewPinEditor;
  selectedRequestRef.current = selectedRequest;
  showCompletionRef.current = showCompletion;
  isPinModeRef.current = isPinMode;

  /* Normal mode */
  return (
    <div ref={ref} className="fixed inset-0 flex flex-col bg-[#2c1810]" style={{ touchAction: 'none' }}>


      {!isCompact && (
        <ReviewProgressTracker
          currentSpread={currentSpread} reviewedCount={Math.floor(reviewedHalves / 2)} totalPages={totalSpreads}
          completionPercent={completionPercent} studioLogoUrl={studioLogoUrl} studioName={studioName}
          onBack={() => window.history.back()} isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen}
          onToggleHelp={() => setIsHelpOpen((p) => !p)} onToggleSummary={() => setShowCompletion(true)}
          hasFeedback={hasFeedback}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <div ref={albumContainerRef} className="relative flex-1 overflow-hidden bg-[#2c1810]">
          <PinchZoomWrapper isActive={true} isPinMode={isPinMode} onScaleChange={setZoomScale}>
            {pages.length > 0 && (
              <HTMLFlipBook
                ref={flipBookRef}
                width={pageWidth} height={pageHeight}
                size="stretch" minWidth={100} maxWidth={2000} minHeight={150} maxHeight={3000}
                startPage={0} flippingTime={800} usePortrait={false} showCover={false}
                drawShadow={true} maxShadowOpacity={0.7} showPageCorners={true}
                useMouseEvents={false} swipeDistance={9999} mobileScrollSupport={false}
                clickEventForward={false} disableFlipByClick={false} autoSize={true}
                startZIndex={0} className="w-full h-full" style={BOOK_STYLE}
                onFlip={handleFlip} onInit={handleInit}
              >
                {pages.map((page, idx) => (
                  <div key={page.id} className="page" style={{ width: '100%', height: '100%' }}>
                    <div ref={(el) => { imageRefs.current[idx] = el; }}
                      className="page-image" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundImage: `url(${renderImageUrl(page.medium_url ?? page.image_url)})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                  </div>
                ))}
              </HTMLFlipBook>
            )}
            <div className="absolute top-0 bottom-0 left-1/2 w-[2px] pointer-events-none z-[5]" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 30%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.15) 70%, transparent 100%)', marginLeft: -1 }} />
            {!isPinMode && currentPinRequests.map((pin) => (
              <PinMarker key={pin.id} number={parseInt(pin.pin!.label, 10)} xPercent={pin.pin!.xPercent} yPercent={pin.pin!.yPercent}
                isActive={focusedPinId === pin.id} isTargeted={!!targetRequestId && pin.id === targetRequestId}
                onClick={() => { setFocusedPinId(pin.id); setSelectedRequest(pin); if (pin.pin) setSelectedPinPos({ xPercent: pin.pin.xPercent, yPercent: pin.pin.yPercent }); }} />
            ))}
          </PinchZoomWrapper>
        </div>
      </div>

      {showMobileUI && (
        <FloatingBottomToolbar currentSpread={currentSpread} totalSpreads={totalSpreads}
          hasFeedback={hasFeedback} isPinMode={isPinMode} visible={true}
          onAddComment={() => setIsPinMode(true)} onAddVoice={() => setShowVoiceRecorder(true)}
          onUndo={function () {
            const pageNumbers = [currentSpread + 1];
            if (currentPageRight < pages.length) pageNumbers.push(currentSpread + 2);
            for (const pn of pageNumbers) {
              getRequestsByPage(album.id, pn).forEach((r) => deleteRequest(album.id, r.id));
              getRecordingsByPage(album.id, pn).forEach((v) => deleteRecording(album.id, v.id));
            }
            if (pageNumbers.length > 0) showToast('Feedback removed', 'success');
          }}
          onPrev={handlePrev} onNext={handleNext} canGoPrev={canGoPrev} canGoNext={canGoNext}
        />
      )}

      {!isCompact && (
        <StickyBottomBar currentSpread={currentSpread} totalSpreads={totalSpreads}
          hasFeedback={hasFeedback} isPinMode={isPinMode}
          onAddComment={() => setIsPinMode(true)} onAddVoice={() => setShowVoiceRecorder(true)}
          onUndo={function () {
            const pageNumbers = [currentSpread + 1];
            if (currentPageRight < pages.length) pageNumbers.push(currentSpread + 2);
            for (const pn of pageNumbers) {
              getRequestsByPage(album.id, pn).forEach((r) => deleteRequest(album.id, r.id));
              getRecordingsByPage(album.id, pn).forEach((v) => deleteRecording(album.id, v.id));
            }
            if (pageNumbers.length > 0) showToast('Feedback removed', 'success');
          }}
          onPrev={handlePrev} onNext={handleNext} canGoPrev={canGoPrev} canGoNext={canGoNext}
        />
      )}

      {isPinMode && (
        <div className="fixed inset-0 z-20" onClick={(e) => e.stopPropagation()}>
          <div ref={pinOverlayRef} className="absolute inset-0 cursor-crosshair" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handlePinPlace(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
          }} />
        </div>
      )}

      {pendingPin && showNewPinEditor && (
        <div className="absolute z-30" style={{ left: `calc(${pendingPin.xPercent}% + 28px)`, top: `${pendingPin.yPercent}%`, transform: 'translateY(-50%)' }}>
          <NewPinEditor pinNumber={parseInt(pendingPin.label, 10)} onSave={handleNewPinSave} onCancel={handleNewPinCancel} />
        </div>
      )}

      {selectedRequest && selectedPinPos && (
        <div className="absolute z-30" style={{ left: `calc(${selectedPinPos.xPercent}% + 28px)`, top: `${selectedPinPos.yPercent}%`, transform: 'translateY(-50%)' }}>
          <PinPopup request={selectedRequest} onUpdate={(id, message) => updateRequest(album.id, id, { message })}
            onDelete={(id) => deleteRequest(album.id, id)} onClose={() => { setSelectedRequest(null); setSelectedPinPos(null); }} />
        </div>
      )}

      <HelpBottomSheet isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      {showCompletion && <ReviewCompletionModal albumId={album.id} totalPages={totalSpreads} studioName={studioName} phoneNumber={phoneNumber} studioLogoUrl={studioLogoUrl} onClose={() => setShowCompletion(false)} />}
      {showVoiceRecorder && <VoiceMessageRecorder onSend={async (duration, blob) => { try { const result = await uploadVoiceNote(album.id, blob); addRecording(album.id, currentSpread + 1, duration, result.url); setShowVoiceRecorder(false); showToast('Voice message sent', 'success'); } catch { showToast('Failed to upload voice message', 'error'); } }} onClose={() => setShowVoiceRecorder(false)} />}
    </div>
  );
});

WeddingAlbumViewer.displayName = 'WeddingAlbumViewer';
export default WeddingAlbumViewer;
