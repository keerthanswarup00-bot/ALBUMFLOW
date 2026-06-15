import { useEffect, useState } from 'react';
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
import {
  ArrowLeft,
  Pencil,
  Calendar,
  User,
  Tag,
  ImageIcon,
  CheckCircle,
  Share2,
  Link as LinkIcon,
  Copy,
  RefreshCw,
  Trash2,
  ExternalLink,
  SendHorizonal,
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

  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const getCompletionPercent = useReviewStore((s) => s.getCompletionPercent);
  const showToast = useUIStore((s) => s.showToast);

  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkExpiry, setNewLinkExpiry] = useState(14);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (albumId) {
      fetchAlbumById(albumId);
      fetchAlbumPages(albumId);
    }
  }, [albumId, fetchAlbumById, fetchAlbumPages]);

  useEffect(() => {
    if (!albumId) return;
    shareLinkService.getShareLinks(albumId).then((links) => {
      setShareLinks(links);
    }).catch(() => {
      // silently fail
    }).finally(() => {
      setLinksLoading(false);
    });
  }, [albumId]);

  async function handleCreateLink() {
    if (!albumId) return;
    setCreating(true);
    try {
      const link = await shareLinkService.createShareLink({
        album_id: albumId,
        label: newLinkLabel || undefined,
        expires_in_days: newLinkExpiry || undefined,
      });
      setShareLinks((prev) => [link, ...prev]);
      setShowCreateForm(false);
      setNewLinkLabel('');
      setNewLinkExpiry(14);
      showToast('Share link created', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create link', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeLink(id: string) {
    try {
      await shareLinkService.revokeShareLink(id);
      setShareLinks((prev) => prev.map((l) => l.id === id ? { ...l, revoked_at: new Date().toISOString() } : l));
      showToast('Link revoked', 'success');
    } catch {
      showToast('Failed to revoke link', 'error');
    }
  }

  function handleCopyLink(token: string, id: string) {
    const url = `${window.location.origin}${albumViewRoute(token)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      showToast('Link copied to clipboard', 'success');
    });
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
      if (error) throw error;
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

      {/* Share Links Section */}
      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Share2 className="h-4 w-4 text-gray-400" />
              Share Links
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowCreateForm(true)}
              disabled={showCreateForm}
            >
              <LinkIcon className="h-4 w-4" />
              Create Link
            </Button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Label (optional)</label>
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="e.g. Client review v1"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600">Expires after (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newLinkExpiry}
                    onChange={(e) => setNewLinkExpiry(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateLink} isLoading={creating}>
                    Create
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Links list */}
          {linksLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-300" />
            </div>
          ) : shareLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Share2 className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">No share links yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Create a link to share this album with your client
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {shareLinks.map((link) => {
                const isActive = !link.revoked_at;
                const url = `${window.location.origin}${albumViewRoute(link.token)}`;
                return (
                  <div
                    key={link.id}
                    className={`rounded-xl border p-3 ${
                      isActive ? 'border-gray-200 bg-white' : 'border-red-100 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {link.label && (
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {link.label}
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {isActive ? 'Active' : 'Revoked'}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{link.access_count} view{link.access_count !== 1 ? 's' : ''}</span>
                          {link.expires_at && (
                            <span>Expires {new Date(link.expires_at).toLocaleDateString()}</span>
                          )}
                        </div>
                        {isActive && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <code className="max-w-[200px] truncate rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {url}
                            </code>
                            <button
                              onClick={() => handleCopyLink(link.token, link.id)}
                              className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                              title="Copy link"
                            >
                              {copiedId === link.id ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                              title="Open link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <button
                          onClick={() => handleRevokeLink(link.id)}
                          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Revoke link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
