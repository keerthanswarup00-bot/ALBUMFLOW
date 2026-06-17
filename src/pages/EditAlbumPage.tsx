import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { useUIStore } from '@/store/uiStore';
import { AlbumForm } from '@/components/album/AlbumForm';
import { PageSpinner } from '@/components/ui/Spinner';
import { ROUTES } from '@/constants/routes';
import type { AlbumFormData } from '@/types';
import { ArrowLeft } from 'lucide-react';

export function EditAlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { currentAlbum, fetchAlbumById, updateAlbum, isSaving, isLoading, error } = useAlbumStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (albumId) fetchAlbumById(albumId);
  }, [albumId, fetchAlbumById]);

  async function handleSubmit(data: AlbumFormData, slug?: string) {
    if (!albumId) return;
    try {
      await updateAlbum(albumId, { ...data, slug });
      showToast('Album updated successfully', 'success');
      navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', albumId));
    } catch {
      showToast('Failed to update album', 'error');
    }
  }

  if (isLoading) return <PageSpinner />;

  if (error || !currentAlbum) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-6 text-sm text-red-700 dark:text-red-400">
          {error ?? 'Album not found'}
        </div>
        <Link
          to={ROUTES.ALBUMS}
          className="mt-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to albums
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          to={ROUTES.ALBUM_DETAIL.replace(':albumId', albumId!)}
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to album
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Edit Album</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">{currentAlbum.title}</p>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-border-primary bg-white dark:bg-bg-elevated p-6 shadow-sm">
        <AlbumForm
          initialData={currentAlbum}
          onSubmit={handleSubmit}
          onCancel={() => navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', albumId!))}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
