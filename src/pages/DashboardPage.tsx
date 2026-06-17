import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { AlbumCard } from '@/components/album/AlbumCard';
import { PageSpinner } from '@/components/ui/Spinner';
import * as versionsService from '@/services/supabase/versions';
import * as shareLinkService from '@/services/supabase/shareLinks';
import { ROUTES } from '@/constants/routes';
import type { AlbumVersion } from '@/types';
import { Plus, ImageIcon } from 'lucide-react';

export function DashboardPage() {
  const { albums, isLoading, fetchAlbums } = useAlbumStore();
  const [albumPageCounts, setAlbumPageCounts] = useState<Record<string, number>>({});
  const [shareTokens, setShareTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (albums.length === 0) return;
    let cancelled = false;
    async function loadPageCounts() {
      const counts: Record<string, number> = {};
      const tokens: Record<string, string> = {};
      for (const album of albums) {
        try {
          const versions: AlbumVersion[] = await versionsService.getVersions(album.id);
          if (cancelled) return;
          if (versions.length > 0) {
            counts[album.id] = versions[0].page_count;
          }
          const link = await shareLinkService.getActiveShareLink(album.id);
          if (cancelled) return;
          if (link) tokens[album.id] = link.token;
        } catch {
          // skip albums that fail
        }
      }
      if (!cancelled) {
        setAlbumPageCounts(counts);
        setShareTokens(tokens);
      }
    }
    loadPageCounts();
    return () => { cancelled = true; };
  }, [albums]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Albums</h1>
          <p className="mt-1 text-sm text-gray-500">
            {albums.length} {albums.length === 1 ? 'album' : 'albums'}
          </p>
        </div>
        <Link
          to={ROUTES.ALBUM_NEW}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Album
        </Link>
      </div>

      {/* Album grid */}
      {albums.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
            <ImageIcon className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No Albums Yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first album to get started with proofing.
          </p>
          <Link
            to={ROUTES.ALBUM_NEW}
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Album
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              pageCount={albumPageCounts[album.id] ?? 0}
              shareToken={shareTokens[album.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
