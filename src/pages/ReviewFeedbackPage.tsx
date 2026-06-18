import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { PageSpinner } from '@/components/ui/Spinner';
import * as pagesService from '@/services/supabase/pages';
import * as versionsService from '@/services/supabase/versions';
import type { AlbumPage } from '@/types';
import type { ViewerRequestChange, VoiceRequest } from '@/types/viewer';
import { ArrowLeft, MapPin, Mic, FileText, CheckCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/utils/cn';

export function ReviewFeedbackPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { currentAlbum, fetchAlbumById, isLoading: albumLoading, error: albumError } = useAlbumStore();
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const getApprovedPages = useReviewStore((s) => s.getReviewedPages);
  const getRequests = useRequestStore((s) => s.getRequests);
  const getRecordings = useVoiceStore((s) => s.getRecordings);

  const [albumPages, setAlbumPages] = useState<AlbumPage[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number | null>(null);

  useEffect(() => {
    if (albumId) {
      fetchAlbumById(albumId);
    }
  }, [albumId, fetchAlbumById]);

  useEffect(() => {
    if (!albumId) return;
    const id: string = albumId;
    let cancelled = false;
    async function loadPages() {
      try {
        const versions = await versionsService.getVersions(id);
        if (cancelled || versions.length === 0) {
          if (!cancelled) setPagesLoading(false);
          return;
        }
        const pages = await pagesService.getPagesByVersion(versions[0].id);
        if (!cancelled) setAlbumPages(pages);
      } catch {
        if (!cancelled) setPagesError('Failed to load album pages');
      } finally {
        if (!cancelled) setPagesLoading(false);
      }
    }
    loadPages();
    return () => { cancelled = true; };
  }, [albumId]);

  const requests = useMemo(() => albumId ? getRequests(albumId) : [], [albumId, getRequests]);
  const voiceRecordings = useMemo(() => albumId ? getRecordings(albumId) : [], [albumId, getRecordings]);
  const totalPages = albumPages.length;
  const reviewedCount = albumId ? getReviewedCount(albumId) : 0;
  const approvedPageNumbers = albumId ? getApprovedPages(albumId) : [];

  const groupedByPage = useMemo(() => {
    const map = new Map<number, { text: ViewerRequestChange[]; voice: VoiceRequest[] }>();
    requests.forEach((r) => {
      if (!map.has(r.page_number)) {
        map.set(r.page_number, { text: [], voice: [] });
      }
      map.get(r.page_number)!.text.push(r);
    });
    voiceRecordings.forEach((v) => {
      if (!map.has(v.page_number)) {
        map.set(v.page_number, { text: [], voice: [] });
      }
      map.get(v.page_number)!.voice.push(v);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [requests, voiceRecordings]);

  const selectedItems = selectedPage ? groupedByPage.find(([p]) => p === selectedPage) : null;

  if (albumError) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-text-secondary">Failed to load album. Please try again.</p>
      </div>
    );
  }

  if (pagesError && albumPages.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-text-secondary">{pagesError}</p>
      </div>
    );
  }

  if (albumLoading || pagesLoading) return <PageSpinner />;

  if (!currentAlbum) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center px-4 py-16">
        <p className="text-sm text-text-secondary">Album not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 py-4">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-text-primary">{currentAlbum?.title || 'Album'} — Review Feedback</h1>
          <p className="text-xs text-text-secondary">
            {totalPages} pages &middot; {reviewedCount} reviewed &middot; {requests.length} requests &middot; {voiceRecordings.length} voice notes
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Album pages — hidden on mobile */}
        <div className="hidden md:block w-64 shrink-0 overflow-y-auto rounded-xl border border-border-primary bg-bg-primary p-3">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Pages</h2>
          {totalPages === 0 ? (
            <p className="text-xs text-text-muted">No pages yet</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {albumPages.map((page) => {
                const pageNum = page.page_number;
                const isApproved = approvedPageNumbers.includes(pageNum);
                const pageRequests = requests.filter((r) => r.page_number === pageNum);
                const pageVoice = voiceRecordings.filter((v) => v.page_number === pageNum);
                const hasFeedback = pageRequests.length > 0 || pageVoice.length > 0;
                const isSelected = selectedPage === pageNum;

                return (
                  <button
                    key={page.id}
                    onClick={() => setSelectedPage(isSelected ? null : pageNum)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                        : 'border border-transparent hover:bg-bg-secondary'
                    )}
                  >
                    <div className="flex h-10 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-bg-secondary">
                      {page.thumbnail_url ? (
                        <img
                          src={page.thumbnail_url}
                          alt={`Page ${pageNum}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileText className="h-4 w-4 text-text-muted" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-text-primary">Page {pageNum}</span>
                        {isApproved && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 dark:text-green-400" />
                        )}
                      </div>
                      {hasFeedback && (
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                          {pageRequests.length > 0 && (
                            <span>{pageRequests.length} {pageRequests.length === 1 ? 'request' : 'requests'}</span>
                          )}
                          {pageVoice.length > 0 && (
                            <span>{pageVoice.length} voice</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile page selector */}
        <div className="flex md:hidden gap-1 overflow-x-auto pb-2 -mx-4 px-4">
          {albumPages.map((page) => {
            const isSelected = selectedPage === page.page_number;
            const hasFeedback = requests.some((r) => r.page_number === page.page_number) ||
              voiceRecordings.some((v) => v.page_number === page.page_number);
            return (
              <button
                key={page.id}
                onClick={() => setSelectedPage(isSelected ? null : page.page_number)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : hasFeedback
                    ? 'bg-bg-secondary text-text-secondary'
                    : 'text-text-muted'
                )}
              >
                P{page.page_number}
              </button>
            );
          })}
        </div>

        {/* Right: Feedback timeline */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-border-primary bg-bg-primary p-5">
          {selectedPage !== null && selectedItems ? (
            <div>
              <h2 className="mb-4 text-sm font-semibold text-text-secondary">
                Feedback for Page {selectedPage}
              </h2>
              <div className="flex flex-col gap-3">
                {selectedItems[1].text.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-start gap-3 rounded-lg bg-bg-secondary p-3"
                  >
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      request.category === 'pin' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/30'
                    )}>
                      {request.category === 'pin' ? (
                        <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {request.category === 'pin' ? `Pin #${request.pin?.label}` : 'Change Request'}
                        </span>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          request.status === 'open' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                          request.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                          'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        )}>
                          {request.status === 'open' ? 'Pending' :
                           request.status === 'resolved' ? 'Resolved' : 'Designer Review'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-text-secondary">{request.message}</p>
                      {request.pin && (
                        <p className="mt-1 text-xs text-text-muted">
                          Position: ({Math.round(request.pin.xPercent)}%, {Math.round(request.pin.yPercent)}%)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {selectedItems[1].voice.map((voice) => (
                  <div
                    key={voice.id}
                    className="flex items-start gap-3 rounded-lg bg-bg-secondary p-3"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                      <Mic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">Voice Message</span>
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-medium',
                          voice.status === 'open' ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                          voice.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                          'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        )}>
                          {voice.status === 'open' ? 'Pending' :
                           voice.status === 'resolved' ? 'Resolved' : 'Designer Review'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {Math.floor(voice.duration / 60)}:{(voice.duration % 60).toString().padStart(2, '0')}
                      </p>
                    </div>
                  </div>
                ))}
                {selectedItems[1].text.length === 0 && selectedItems[1].voice.length === 0 && (
                  <p className="text-sm text-text-muted">No feedback for this page.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm font-medium text-text-secondary">Select a page</p>
              <p className="mt-1 text-xs text-text-muted">
                Click a page on the left to view its feedback
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
