import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WeddingAlbumViewer from '@/components/review/WeddingAlbumViewer';
import { Spinner } from '@/components/ui/Spinner';
import * as albumService from '@/services/supabase/albums';
import * as versionsService from '@/services/supabase/versions';
import * as pagesService from '@/services/supabase/pages';
import { useAuthStore } from '@/store/authStore';
import type { ReviewAlbum, ReviewPage } from '@/types/viewer';

export function ClientViewPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [album, setAlbum] = useState<ReviewAlbum | null>(null);
  const [pages, setPages] = useState<ReviewPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!albumId) return;
    const id: string = albumId;
    let cancelled = false;

    async function load() {
      try {
        const albumData = await albumService.getAlbumById(id);
        if (cancelled) return;
        if (!albumData) {
          setError('Album not found');
          return;
        }

        setAlbum({
          id: albumData.id,
          title: albumData.title,
          client_name: albumData.client_name,
          event_type: albumData.event_type,
          status: albumData.status,
          phase: albumData.phase,
          cover_image_url: albumData.cover_image_url,
          created_at: albumData.created_at,
        });

        const versions = await versionsService.getVersions(id);
        if (cancelled) return;

        if (versions.length > 0) {
          const albumPages = await pagesService.getPagesByVersion(versions[0].id);
          if (cancelled) return;
          setPages(
            albumPages.map((p) => ({
              id: p.id,
              page_number: p.page_number,
              spread_number: p.spread_number,
              orientation: p.orientation,
              image_url: p.image_url,
              thumbnail_url: p.thumbnail_url,
              medium_url: p.medium_url,
              original_url: p.original_url,
              width: p.width,
              height: p.height,
              file_size: p.file_size,
            }))
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load album');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [albumId]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-sm text-blue-600 hover:underline cursor-pointer"
        >
          Go back
        </button>
      </div>
    );
  }

  if (loading || !album) return <Spinner />;

  return (
    <WeddingAlbumViewer
      ref={null}
      album={album}
      pages={pages}
      studioName={profile?.studio_name || 'Studio'}
      phoneNumber={profile?.phone_number || ''}
      studioLogoUrl={profile?.studio_logo_url || ''}
    />
  );
}
