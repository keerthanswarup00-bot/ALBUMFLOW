import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { AlbumCard } from '@/components/album/AlbumCard';
import { PageSpinner } from '@/components/ui/Spinner';
import * as versionsService from '@/services/supabase/versions';
import * as shareLinkService from '@/services/supabase/shareLinks';
import { ROUTES } from '@/constants/routes';
import { Plus, ImageIcon, LayoutDashboard } from 'lucide-react';

export function DashboardPage() {
  const albums = useAlbumStore((s) => s.albums);
  const isLoading = useAlbumStore((s) => s.isLoading);
  const fetchAlbums = useAlbumStore((s) => s.fetchAlbums);
  const [albumPageCounts, setAlbumPageCounts] = useState<Record<string, number>>({});
  const [shareTokens, setShareTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (albums.length === 0) return;
    let cancelled = false;
    async function loadPageCounts() {
      const results = await Promise.allSettled(
        albums.map(async (album) => {
          const [pageCount, token] = await Promise.all([
            versionsService.getLatestVersionPageCount(album.id),
            shareLinkService.getActiveShareToken(album.id).catch(() => null),
          ]);
          return { id: album.id, pageCount, token };
        })
      );
      if (cancelled) return;
      const counts: Record<string, number> = {};
      const tokens: Record<string, string> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          counts[result.value.id] = result.value.pageCount;
          if (result.value.token) tokens[result.value.id] = result.value.token;
        }
      }
      setAlbumPageCounts(counts);
      setShareTokens(tokens);
    }
    loadPageCounts();
    return () => { cancelled = true; };
  }, [albums]);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
            <LayoutDashboard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              Welcome back! Here&apos;s an overview of your albums.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-5">
          <p className="text-sm text-text-secondary dark:text-text-secondary">Total Albums</p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-text-primary">{albums.length}</p>
        </div>
        <div className="rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-5">
          <p className="text-sm text-text-secondary dark:text-text-secondary">Active Reviews</p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-text-primary">{albums.filter((a) => a.status === 'awaiting_review' || a.status === 'changes_requested').length}</p>
        </div>
        <div className="rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-5">
          <p className="text-sm text-text-secondary dark:text-text-secondary">Approved</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{albums.filter((a) => a.status === 'approved').length}</p>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">Recent Albums</h2>
        </div>
        <Link
          to={ROUTES.ALBUM_NEW}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Album
        </Link>
      </div>

      {albums.length === 0 ? (
        <div className="rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary dark:bg-bg-secondary">
            <ImageIcon className="h-8 w-8 text-text-muted dark:text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">No Albums Yet</h3>
          <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary">
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
          {albums.slice(0, 8).map((album) => (
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
