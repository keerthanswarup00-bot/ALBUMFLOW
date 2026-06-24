import { Link, useNavigate } from 'react-router-dom';
import { ROUTES, albumViewRoute } from '@/constants/routes';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useUIStore } from '@/store/uiStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import type { Album } from '@/types';
import { Eye, EyeOff, MessageSquare, Share2, ImageIcon, CheckCircle, Trash2, Clock, FileText, Mic } from 'lucide-react';
import { formatDistance } from '@/utils/formatters';

interface AlbumCardProps {
  album: Album;
  pageCount?: number;
  shareToken?: string;
  onDelete?: (album: Album) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 dark:bg-gray-700 text-text-secondary dark:text-text-muted' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' },
  changes_requested: { label: 'Changes Requested', className: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' },
  approved: { label: 'Approved', className: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' },
};

export function AlbumCard({ album, pageCount = 0, shareToken, onDelete }: AlbumCardProps) {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const hasDelete = typeof onDelete === 'function';
  const status = statusConfig[album.status] ?? statusConfig.draft;
  const reviewedCount = useReviewStore((s) => s.getReviewedCount(album.id));
  const requestCount = useRequestStore((s) => s.getRequestCount(album.id));
  const voiceCount = useVoiceStore((s) => s.getRecordingCount(album.id));
  const cycleStatus = useReviewCycleStore((s) => s.getStatus(album.id));
  const progressPercent = pageCount > 0 ? Math.round((reviewedCount / pageCount) * 100) : 0;
  const lastActivity = formatDistance(album.updated_at);

  return (
    <div className="group rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated shadow-sm transition-all hover:shadow-lg dark:hover:shadow-black/40 hover:border-gray-300 dark:hover:border-accent hover:-translate-y-0.5 duration-200">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-gray-100 dark:bg-bg-secondary">
        <Link
          to={ROUTES.ALBUM_DETAIL.replace(':albumId', album.id)}
          className="block h-full w-full"
        >
          {album.cover_image_url ? (
            <img
              src={album.cover_image_url}
              alt={album.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-10 w-10 text-text-muted dark:text-text-muted" />
            </div>
          )}
        </Link>
        {hasDelete && (
          <button
            onClick={() => onDelete(album)}
            className="absolute top-2 right-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-bg-primary/80 dark:bg-bg-elevated/80 text-text-muted dark:text-text-muted opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 group-hover:opacity-100 cursor-pointer"
            title="Delete album"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {cycleStatus !== 'draft' && (
          <div className="absolute top-2 left-2">
            <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
              {cycleStatus === 'review_submitted' ? 'Review Submitted' :
               cycleStatus === 'changes_in_progress' ? 'Designer Review' :
               cycleStatus === 'ready_for_approval' ? 'Updated' :
               cycleStatus === 'approved' ? 'Approved' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={ROUTES.ALBUM_DETAIL.replace(':albumId', album.id)}
              className="text-sm font-semibold text-text-primary dark:text-text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
            >
              {album.title}
            </Link>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-text-secondary line-clamp-1">{album.client_name}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs text-text-muted dark:text-text-muted">
          {pageCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            </span>
          )}
          {requestCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <MessageSquare className="h-3 w-3" />
              {requestCount}
            </span>
          )}
          {voiceCount > 0 && (
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Mic className="h-3 w-3" />
              {voiceCount}
            </span>
          )}
        </div>

        {reviewedCount > 0 && pageCount > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary dark:text-text-secondary">
                <CheckCircle className="inline h-3 w-3 mr-0.5 text-green-500" />
                {reviewedCount} reviewed
              </span>
              <span className="text-text-muted dark:text-text-muted">{progressPercent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-bg-secondary">
              <div
                className="h-full rounded-full bg-blue-500 dark:bg-blue-400 transition-all"
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted dark:text-text-muted">
          <Clock className="h-3 w-3" />
          {lastActivity}
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <Link
            to={ROUTES.ALBUM_DETAIL.replace(':albumId', album.id)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 dark:bg-bg-secondary px-2 text-[11px] font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-elevated transition-colors"
          >
            <Eye className="h-3 w-3" />
            View
          </Link>
          <Link
            to={ROUTES.CLIENT_VIEW.replace(':albumId', album.id)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 dark:bg-bg-secondary px-2 text-[11px] font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-elevated transition-colors"
          >
            <EyeOff className="h-3 w-3" />
            Client View
          </Link>
          <Link
            to={ROUTES.REVIEW_FEEDBACK.replace(':albumId', album.id)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 dark:bg-bg-secondary px-2 text-[11px] font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-elevated transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Feedback
          </Link>
          <button
            onClick={() => {
              if (shareToken) {
                navigator.clipboard.writeText(
                  `${window.location.origin}${albumViewRoute(shareToken)}`
                ).then(() => showToast('Share link copied', 'success'));
              } else {
                navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', album.id));
              }
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-bg-secondary text-text-secondary dark:text-text-muted hover:bg-bg-secondary dark:hover:bg-bg-elevated transition-colors cursor-pointer"
            title={shareToken ? 'Copy share link' : 'Create share link'}
          >
            <Share2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
