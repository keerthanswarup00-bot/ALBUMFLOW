import { useNavigate } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { useUIStore } from '@/store/uiStore';
import { AlbumForm } from '@/components/albums/AlbumForm';
import { ROUTES } from '@/constants/routes';
import type { AlbumFormData } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CreateAlbumPage() {
  const navigate = useNavigate();
  const { createAlbum, isSaving } = useAlbumStore();
  const { showToast } = useUIStore();

  async function handleSubmit(data: AlbumFormData) {
    try {
      const album = await createAlbum(data);
      showToast('Album created successfully', 'success');
      navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', album.id));
    } catch {
      showToast('Failed to create album', 'error');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          to={ROUTES.ALBUMS}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to albums
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Album</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new wedding album project
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <AlbumForm
          onSubmit={handleSubmit}
          onCancel={() => navigate(ROUTES.ALBUMS)}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
