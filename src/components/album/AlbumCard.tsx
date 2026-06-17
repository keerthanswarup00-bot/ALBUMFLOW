import { Link, useNavigate } from 'react-router-dom';
import { ROUTES, albumViewRoute } from '@/constants/routes';
import { useReviewStore } from '@/store/reviewStore';
import { useUIStore } from '@/store/uiStore';
import type { Album } from '@/types';
import { Eye, EyeOff, MessageSquare, Share2, ImageIcon, CheckCircle, Trash2 } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  pageCount?: number;
  shareToken?: string;
  onDelete?: (album: Album) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-amber-100 text-amber-700' },
  changes_requested: { label: 'Changes Requested', className: 'bg-red-100 text-red-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
};

export function AlbumCard({ album, pageCount = 0, shareToken, onDelete }: AlbumCardProps) {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const hasDelete = typeof onDelete === 'function';
  const status = statusConfig[album.status] ?? statusConfig.draft;
  const reviewedCount = useReviewStore((s) => s.getReviewedCount(album.id));
  const progressPercent = pageCount > 0 ? Math.round((reviewedCount / pageCount) * 100) : 0;

  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:border-gray-300">
      {/* Cover thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-gray-100">
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
              <ImageIcon className="h-10 w-10 text-gray-300" />
            </div>
          )}
        </Link>
        {hasDelete && (
          <button
            onClick={() => onDelete(album)}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-gray-400 opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 cursor-pointer"
            title="Delete album"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-4">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={ROUTES.ALBUM_DETAIL.replace(':albumId', album.id)}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
            >
              {album.title}
            </Link>
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{album.client_name}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        {/* Page count + Review progress */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
          {reviewedCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              {reviewedCount} reviewed
            </span>
          )}
        </div>

        {pageCount > 0 && (
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-1.5">
          <Link
            to={ROUTES.ALBUM_DETAIL.replace(':albumId', album.id)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 px-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <Eye className="h-3 w-3" />
            View
          </Link>
          <Link
            to={ROUTES.CLIENT_VIEW.replace(':albumId', album.id)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 px-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <EyeOff className="h-3 w-3" />
            Client View
          </Link>
          <Link
            to={ROUTES.REVIEW_FEEDBACK.replace(':albumId', album.id)}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-gray-100 px-2 text-[11px] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Review Changes
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
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
            title={shareToken ? 'Copy share link' : 'Create share link'}
          >
            <Share2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
