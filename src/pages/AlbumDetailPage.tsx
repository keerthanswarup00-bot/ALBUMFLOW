import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase/client';
import { useAlbumStore } from '@/store/albumStore';
import { useReviewStore } from '@/store/reviewStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { ImageUploadSection } from '@/components/album/ImageUploadSection';
import { ROUTES, albumViewRoute } from '@/constants/routes';
import { formatDate, formatDateTime } from '@/utils/formatters';
import * as shareLinkService from '@/services/supabase/shareLinks';
import * as pageService from '@/services/supabase/pages';
import { useUIStore } from '@/store/uiStore';
import type { ShareLink } from '@/types/viewer';
import { REVIEW_CYCLE_LABELS, REVIEW_CYCLE_STYLES } from '@/types/viewer';
import { useAuthStore } from '@/store/authStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  User,
  Tag,
  ImageIcon,
  CheckCircle,
  Share2,
  ExternalLink,
  SendHorizonal,
  Building2,
  MessageCircle,
  EyeOff,
  Trash2,
  Settings,
  RotateCcw,
  XCircle,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 dark:bg-gray-700 text-text-secondary dark:text-text-muted' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  changes_requested: { label: 'Changes Requested', className: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
  approved: { label: 'Approved', className: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
};

export function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const {
    currentAlbum,
    pages,
    isLoading,
    error,
    fetchAlbumById,
    fetchAlbumPages,
    updateAlbum,
  } = useAlbumStore();

  const { profile } = useAuthStore();
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const getCompletionPercent = useReviewStore((s) => s.getCompletionPercent);
  const showToast = useUIStore((s) => s.showToast);

  const cycleStatus = useReviewCycleStore((s) => s.getStatus(albumId ?? ''));
  const cycleSetStatus = useReviewCycleStore((s) => s.setStatus);
  const cycleMarkChangesInProgress = useReviewCycleStore((s) => s.markChangesInProgress);
  const cycleMarkReadyForApproval = useReviewCycleStore((s) => s.markReadyForApproval);
  const cycleMarkClosed = useReviewCycleStore((s) => s.markClosed);
  const cycleAddTimeline = useReviewCycleStore((s) => s.addTimelineEntry);

  const copiedTimerRef = useRef<number | null>(null);
  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);

  const [activeLink, setActiveLink] = useState<ShareLink | null>(null);
  const [linksLoading, setLinksLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (albumId) {
      fetchAlbumById(albumId);
      fetchAlbumPages(albumId);
    }
  }, [albumId, fetchAlbumById, fetchAlbumPages]);

  useEffect(() => {
    if (!albumId) return;
    shareLinkService.getActiveShareLink(albumId).then((link) => {
      setActiveLink(link);
    }).catch(() => {
    }).finally(() => {
      setLinksLoading(false);
    });
  }, [albumId]);

  useEffect(() => {
    if (pages.length > 0 && currentAlbum && !currentAlbum.cover_image_url) {
      const firstPage = pages[0];
      const coverUrl = firstPage.thumbnail_url ?? firstPage.image_url;
      if (coverUrl) {
        updateAlbum(currentAlbum.id, { cover_image_url: coverUrl } as Record<string, unknown> as Parameters<typeof updateAlbum>[1]).catch(() => {});
      }
    }
  }, [pages, currentAlbum, updateAlbum]);

  async function handleGenerateLink() {
    if (!albumId) return;
    setCreating(true);
    try {
      const link = await shareLinkService.createShareLink(albumId);
      setActiveLink(link);
      showToast('Review link created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create link', 'error');
    } finally {
      setCreating(false);
    }
  }

  function handleCopyLink(token: string) {
    const url = `${window.location.origin}${albumViewRoute(token)}`;
    navigator.clipboard.writeText(url).then(() => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      setCopied(true);
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
      showToast('Link copied to clipboard', 'success');
    });
  }

  function handleWhatsAppShare(url: string) {
    const studioName = profile?.studio_name || 'My Studio';
    const message = [
      `${studioName}`,
      '',
      'Your album is ready for review.',
      '',
      'Please review the album and request any changes directly on the photos.',
      '',
      url,
      '',
      'Reviewed with AlbumFlow',
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }

  function handleUploadComplete() {
    if (albumId) fetchAlbumPages(albumId);
  }

  const [submittingReview, setSubmittingReview] = useState(false);

  async function handleSendForReview() {
    if (!albumId) return;
    setSubmittingReview(true);
    try {
      const { data, error } = await supabase.rpc('submit_album_for_review', { p_album_id: albumId });
      if (error) {
        console.error('RPC Error', 'submit_album_for_review', { p_album_id: albumId }, error);
        throw error;
      }
      const result = data as { error?: string };
      if (result?.error) throw new Error(result.error);
      cycleSetStatus(albumId, 'awaiting_review');
      cycleAddTimeline(albumId, { type: 'review_started', description: 'Album sent for client review', timestamp: Date.now() });
      showToast('Album sent for review!', 'success');
      fetchAlbumById(albumId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit', 'error');
    } finally {
      setSubmittingReview(false);
    }
  }

  async function handleStartChanges() {
    if (!albumId) return;
    cycleMarkChangesInProgress(albumId);
    showToast('Status updated: Changes in progress', 'success');
  }

  async function handleReadyForApproval() {
    if (!albumId) return;
    cycleMarkReadyForApproval(albumId);
    showToast('Status updated: Ready for final approval', 'success');
  }

  async function handleCloseAlbum() {
    if (!albumId) return;
    cycleMarkClosed(albumId);
    showToast('Album closed', 'success');
  }

  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  async function handleDeletePage(pageId: string) {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    setDeletingPageId(pageId);
    try {
      await pageService.deletePage(pageId);
      showToast('Image deleted', 'success');
      if (albumId) fetchAlbumPages(albumId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete image', 'error');
    } finally {
      setDeletingPageId(null);
    }
  }

  async function handleDeleteAllPages() {
    if (!confirm(`Delete all ${pages.length} pages? This cannot be undone.`)) return;
    setDeletingAll(true);
    try {
      await Promise.all(pages.map((p) => pageService.deletePage(p.id)));
      showToast('All pages deleted', 'success');
      if (albumId) fetchAlbumPages(albumId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete pages', 'error');
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleViewAsClient() {
    if (albumId) {
      navigate(ROUTES.CLIENT_VIEW.replace(':albumId', albumId));
    }
  }

  if (isLoading) return <PageSpinner />;

  if (error || !currentAlbum) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-6 text-sm text-red-700 dark:text-red-400">
          {error ?? 'Album not found'}
        </div>
        <Link
          to={ROUTES.ALBUMS}
          className="mt-4 inline-flex items-center gap-1 text-sm text-text-secondary dark:text-text-secondary hover:text-text-secondary dark:hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to albums
        </Link>
      </div>
    );
  }

  const album = currentAlbum;
  const status = statusConfig[album.status] ?? statusConfig.draft;
  const reviewedCount = getReviewedCount(album.id);
  const completionPercent = getCompletionPercent(album.id, pages.length);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to={ROUTES.ALBUMS}
          className="inline-flex items-center gap-1 text-sm text-text-secondary dark:text-text-secondary hover:text-text-secondary dark:hover:text-text-primary transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to albums
        </Link>
        <div className="flex items-center gap-2">
          <Link to={ROUTES.ALBUM_EDIT.replace(':albumId', album.id)}>
            <Button variant="secondary" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={handleViewAsClient}>
            <EyeOff className="h-4 w-4" />
            Client View
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary">{album.title}</h1>
          <div className="flex items-center gap-2">
            <span
              className={`w-fit rounded-full px-3 py-0.5 text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
            <span
              className={`w-fit rounded-full px-3 py-0.5 text-xs font-medium ${REVIEW_CYCLE_STYLES[cycleStatus] ?? REVIEW_CYCLE_STYLES.draft}`}
            >
              {REVIEW_CYCLE_LABELS[cycleStatus]}
            </span>
          </div>
        </div>
        <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary capitalize">{album.event_type}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
            <Tag className="h-4 w-4 text-text-muted dark:text-text-muted" />
            Album Information
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Title</span>
              <span className="font-medium text-text-primary dark:text-text-primary">{album.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Event Type</span>
              <span className="font-medium text-text-primary dark:text-text-primary capitalize">
                {album.event_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Status</span>
              <span className="font-medium text-text-primary dark:text-text-primary">{status.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Created</span>
              <span className="font-medium text-text-primary dark:text-text-primary">
                {formatDateTime(album.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Updated</span>
              <span className="font-medium text-text-primary dark:text-text-primary">
                {formatDateTime(album.updated_at)}
              </span>
            </div>
            {album.description && (
              <div className="border-t border-border-primary dark:border-border-primary pt-3">
                <span className="mb-1 block text-text-secondary dark:text-text-secondary">Description</span>
                <p className="text-text-secondary dark:text-text-primary">{album.description}</p>
              </div>
            )}
          </div>
        </Card>

        {profile && (
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
              <Building2 className="h-4 w-4 text-text-muted dark:text-text-muted" />
              Studio
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary">Studio Name</span>
                <span className="font-medium text-text-primary dark:text-text-primary">{profile.studio_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary">Owner</span>
                <span className="font-medium text-text-primary dark:text-text-primary">{profile.owner_name || '—'}</span>
              </div>
              {profile.phone_number && (
                <div className="flex justify-between">
                  <span className="text-text-secondary dark:text-text-secondary">Phone</span>
                  <span className="font-medium text-text-primary dark:text-text-primary">{profile.phone_number}</span>
                </div>
              )}
            </div>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
            <User className="h-4 w-4 text-text-muted dark:text-text-muted" />
            Client Information
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Name</span>
              <span className="font-medium text-text-primary dark:text-text-primary">{album.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary dark:text-text-secondary">Email</span>
              <span className="font-medium text-text-primary dark:text-text-primary">
                {album.client_email || '—'}
              </span>
            </div>
            {album.deadline && (
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary">Deadline</span>
                <span className="inline-flex items-center gap-1 font-medium text-text-primary dark:text-text-primary">
                  <Calendar className="h-3.5 w-3.5 text-text-muted dark:text-text-muted" />
                  {formatDate(album.deadline)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-text-muted dark:text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary">Images</h2>
            {pages.length > 0 && (
              <span className="text-xs text-text-muted dark:text-text-muted">
                ({pages.length} page{pages.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          {pages.length > 0 && (
            <div className="mb-3 flex items-center justify-end">
              <button
                onClick={handleDeleteAllPages}
                disabled={deletingAll}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deletingAll ? 'Deleting...' : `Delete All (${pages.length})`}
              </button>
            </div>
          )}

          {pages.length > 0 ? (
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border-primary dark:border-border-primary bg-bg-secondary dark:bg-bg-secondary"
                >
                  <img
                    src={page.thumbnail_url ?? page.image_url}
                    alt={`Page ${page.page_number}`}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5">
                    <span className="text-xs font-medium text-white">
                      Page {page.page_number}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeletePage(page.id)}
                    disabled={deletingPageId === page.id}
                    aria-label={`Delete page ${page.page_number}`}
                    className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-primary dark:border-border-primary py-8">
              <ImageIcon className="mb-2 h-8 w-8 text-text-muted dark:text-text-muted" />
              <p className="text-sm text-text-secondary dark:text-text-secondary">No images uploaded yet</p>
            </div>
          )}

          <div className="border-t border-border-primary dark:border-border-primary pt-4">
            <h3 className="mb-3 text-sm font-medium text-text-secondary dark:text-text-secondary">Upload Images</h3>
            <ImageUploadSection
              albumId={album.id}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </Card>
      </div>

      {pages.length > 0 && album.status === 'draft' && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
                  <SendHorizonal className="h-4 w-4 text-amber-500" />
                  Ready for Review?
                </h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-text-secondary">
                  Send this album to your client for feedback and approval.
                </p>
              </div>
              <Button onClick={handleSendForReview} isLoading={submittingReview}>
                <SendHorizonal className="h-4 w-4" />
                Send for Review
              </Button>
            </div>
          </Card>
        </div>
      )}

      {cycleStatus === 'review_submitted' && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
                  <RotateCcw className="h-4 w-4 text-purple-500" />
                  Client Feedback Received
                </h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-text-secondary">
                  The client has submitted their review. Start implementing their requested changes.
                </p>
              </div>
              <Button onClick={handleStartChanges}>
                <RotateCcw className="h-4 w-4" />
                Implementing Changes
              </Button>
            </div>
          </Card>
        </div>
      )}

      {cycleStatus === 'changes_in_progress' && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
                  <Settings className="h-4 w-4 text-teal-500" />
                  Changes in Progress
                </h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-text-secondary">
                  When you've finished updating, mark the album as ready for final approval.
                </p>
              </div>
              <Button onClick={handleReadyForApproval}>
                <CheckCircle className="h-4 w-4" />
                Mark Ready for Approval
              </Button>
            </div>
          </Card>
        </div>
      )}

      {cycleStatus === 'approved' && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Album Approved
                </h2>
                <p className="mt-1 text-xs text-text-secondary dark:text-text-secondary">
                  The client has approved this album. Close it when you're done.
                </p>
              </div>
              <Button variant="secondary" onClick={handleCloseAlbum}>
                <XCircle className="h-4 w-4" />
                Close Album
              </Button>
            </div>
          </Card>
        </div>
      )}

      {reviewedCount > 0 && (
        <div className="mt-6">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-text-primary">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Review Progress
            </h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary dark:text-text-secondary">Pages Reviewed</span>
              <span className="font-medium text-text-primary dark:text-text-primary">
                {reviewedCount} / {pages.length}
              </span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-secondary dark:bg-bg-secondary"
              role="progressbar"
              aria-valuenow={Math.min(completionPercent, 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-text-muted dark:text-text-muted">{completionPercent}% Complete</p>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-text-muted dark:text-text-muted" />
            <h2 className="text-sm font-semibold text-text-primary dark:text-text-primary">Share Review Link</h2>
          </div>

          {linksLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-primary dark:border-border-primary border-t-gray-400 dark:border-t-text-muted" />
            </div>
          ) : activeLink ? (
            <div className="rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-400">
                  Active
                </span>
                <span className="text-xs text-text-muted dark:text-text-muted">
                  {activeLink.access_count} view{activeLink.access_count !== 1 ? 's' : ''}
                  {activeLink.last_accessed_at && ` · Last opened ${formatDate(activeLink.last_accessed_at)}`}
                </span>
              </div>

              <code className="block w-full truncate rounded-lg bg-bg-secondary dark:bg-bg-secondary px-3 py-2 text-sm text-text-secondary dark:text-text-primary border border-border-primary dark:border-border-primary">
                {`${window.location.origin}${albumViewRoute(activeLink.token)}`}
              </code>

              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopyLink(activeLink.token)}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
                <a
                  href={`${window.location.origin}${albumViewRoute(activeLink.token)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-primary dark:border-border-primary px-3 text-xs font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <button
                  onClick={() => handleWhatsAppShare(`${window.location.origin}${albumViewRoute(activeLink.token)}`)}
                  aria-label="Share via WhatsApp"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border-primary dark:border-border-primary px-3 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Share WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Share2 className="mb-2 h-8 w-8 text-text-muted dark:text-text-muted" />
              <p className="text-sm text-text-secondary dark:text-text-secondary">No review link created</p>
              <Button
                className="mt-3"
                size="sm"
                onClick={handleGenerateLink}
                isLoading={creating}
              >
                <Share2 className="h-4 w-4" />
                Generate Review Link
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
