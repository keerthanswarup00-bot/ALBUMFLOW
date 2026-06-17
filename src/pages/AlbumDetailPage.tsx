import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
import { useAuthStore } from '@/store/authStore';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  User,
  Tag,
  ImageIcon,
  CheckCircle,
  Share2,
  Trash2,
  ExternalLink,
  SendHorizonal,
  Building2,
  MessageCircle,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-amber-100 text-amber-700' },
  changes_requested: { label: 'Changes Requested', className: 'bg-red-100 text-red-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
};

export function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const {
    currentAlbum,
    pages,
    isLoading,
    error,
    fetchAlbumById,
    fetchAlbumPages,
  } = useAlbumStore();

  const { profile } = useAuthStore();
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const getCompletionPercent = useReviewStore((s) => s.getCompletionPercent);
  const showToast = useUIStore((s) => s.showToast);

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
      // silently fail
    }).finally(() => {
      setLinksLoading(false);
    });
  }, [albumId]);

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

  async function handleDeleteLink(id: string) {
    try {
      await shareLinkService.deleteShareLink(id);
      setActiveLink(null);
      showToast('Link deleted', 'success');
    } catch {
      showToast('Failed to delete link', 'error');
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
      showToast('Album sent for review!', 'success');
      fetchAlbumById(albumId);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit', 'error');
    } finally {
      setSubmittingReview(false);
    }
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

  if (isLoading) return <PageSpinner />;

  if (error || !currentAlbum) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error ?? 'Album not found'}
        </div>
        <Link
          to={ROUTES.ALBUMS}
          className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to albums
        </Link>
        <Link to={ROUTES.ALBUM_EDIT.replace(':albumId', album.id)}>
          <Button variant="secondary" size="sm">
            <Pencil className="h-4 w-4" />
            Edit Album
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{album.title}</h1>
          <span
            className={`w-fit rounded-full px-3 py-0.5 text-xs font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500 capitalize">{album.event_type}</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Tag className="h-4 w-4 text-gray-400" />
            Album Information
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Title</span>
              <span className="font-medium text-gray-900">{album.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Event Type</span>
              <span className="font-medium text-gray-900 capitalize">
                {album.event_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900">{status.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="font-medium text-gray-900">
                {formatDateTime(album.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Updated</span>
              <span className="font-medium text-gray-900">
                {formatDateTime(album.updated_at)}
              </span>
            </div>
            {album.description && (
              <div className="border-t border-gray-100 pt-3">
                <span className="mb-1 block text-gray-500">Description</span>
                <p className="text-gray-700">{album.description}</p>
              </div>
            )}
          </div>
        </Card>

        {profile && (
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Building2 className="h-4 w-4 text-gray-400" />
              Studio
            </h2>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Studio Name</span>
                <span className="font-medium text-gray-900">{profile.studio_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Owner</span>
                <span className="font-medium text-gray-900">{profile.owner_name || '—'}</span>
              </div>
              {profile.phone_number && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-gray-900">{profile.phone_number}</span>
                </div>
              )}
            </div>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <User className="h-4 w-4 text-gray-400" />
            Client Information
          </h2>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{album.client_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900">
                {album.client_email || '—'}
              </span>
            </div>
            {album.deadline && (
              <div className="flex justify-between">
                <span className="text-gray-500">Deadline</span>
                <span className="inline-flex items-center gap-1 font-medium text-gray-900">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {formatDate(album.deadline)}
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Images Section */}
      <div className="mt-6">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Images</h2>
            {pages.length > 0 && (
              <span className="text-xs text-gray-400">
                ({pages.length} page{pages.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          {pages.length > 0 && (
            <div className="mb-3 flex items-center justify-end">
              <button
                onClick={handleDeleteAllPages}
                disabled={deletingAll}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
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
                  className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
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
                    className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-6 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-8">
              <ImageIcon className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No images uploaded yet</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Upload Images</h3>
            <ImageUploadSection
              albumId={album.id}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </Card>
      </div>

      {/* Send for Review */}
      {pages.length > 0 && album.status === 'draft' && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <SendHorizonal className="h-4 w-4 text-amber-500" />
                  Ready for Review?
                </h2>
                <p className="mt-1 text-xs text-gray-500">
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

      {/* Review Progress */}
      {reviewedCount > 0 && (
        <div className="mt-6">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Review Progress
            </h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pages Reviewed</span>
              <span className="font-medium text-gray-900">
                {reviewedCount} / {pages.length}
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-gray-400">{completionPercent}% Complete</p>
          </Card>
        </div>
      )}

      {/* Share Review Link */}
      <div className="mt-6">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Share Review Link</h2>
          </div>

          {linksLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
            </div>
          ) : activeLink ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  Active
                </span>
              </div>

              <code className="block w-full truncate rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 border border-gray-200">
                {`${window.location.origin}${albumViewRoute(activeLink.token)}`}
              </code>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <span>{activeLink.access_count} view{activeLink.access_count !== 1 ? 's' : ''}</span>
                {activeLink.last_accessed_at && (
                  <span>Last opened: {new Date(activeLink.last_accessed_at).toLocaleDateString()}</span>
                )}
              </div>

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
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
                <button
                  onClick={() => handleWhatsAppShare(`${window.location.origin}${albumViewRoute(activeLink.token)}`)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-gray-200 px-3 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Share WhatsApp
                </button>
                <button
                  onClick={() => handleDeleteLink(activeLink.id)}
                  className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete link"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Share2 className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No review link created</p>
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
