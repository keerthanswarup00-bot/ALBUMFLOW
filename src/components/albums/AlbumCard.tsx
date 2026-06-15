import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useReviewStore } from '@/store/reviewStore';
import type { Album } from '@/types';
import { formatDate } from '@/utils/formatters';
import { Eye, Pencil, Trash2, ImageIcon, CheckCircle } from 'lucide-react';

interface AlbumCardProps {
  album: Album;
  onDelete: (album: Album) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-amber-100 text-amber-700' },
  changes_requested: { label: 'Changes Requested', className: 'bg-red-100 text-red-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
};

export function AlbumCard({ album, onDelete }: AlbumCardProps) {
  const status = statusConfig[album.status] ?? statusConfig.draft;
  const reviewedCount = useReviewStore((s) => s.getReviewedCount(album.id));

  return (
    <div className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <ImageIcon className="h-7 w-7 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900">
                {album.title}
              </h3>
              <p className="mt-0.5 truncate text-sm text-gray-500">
                {album.client_name}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          {reviewedCount > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{reviewedCount} Page{reviewedCount !== 1 ? 's' : ''} Reviewed</span>
            </div>
          )}

          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="capitalize">{album.event_type}</span>
            <span>&middot;</span>
            <span>{formatDate(album.created_at)}</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Link
              to={ROUTES.ALBUM_DETAIL.replace(':albumId', album.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </Link>
            <Link
              to={ROUTES.ALBUM_EDIT.replace(':albumId', album.id)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-100 px-3 text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
            <button
              onClick={() => onDelete(album)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
