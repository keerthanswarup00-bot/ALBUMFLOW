import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { AlbumCard } from '@/components/album/AlbumCard';
import { DeleteAlbumModal } from '@/components/album/DeleteAlbumModal';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/constants/routes';
import { ALBUM_STATUSES } from '@/types';
import type { Album, AlbumStatus } from '@/types';
import { Plus, Search, SlidersHorizontal, FolderOpen } from 'lucide-react';

type SortKey = 'newest' | 'oldest' | 'alpha';

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'alpha', label: 'Alphabetical' },
];

export function AlbumsPage() {
  const { albums, isLoading, fetchAlbums, deleteAlbum, isSaving } = useAlbumStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlbumStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const filtered = useMemo(() => {
    let result = [...albums];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.client_name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }

    switch (sortKey) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'alpha':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [albums, search, statusFilter, sortKey]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAlbum(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary">Albums</h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
            Manage your wedding album projects
          </p>
        </div>
        <Link to={ROUTES.ALBUM_NEW}>
          <Button>
            <Plus className="h-4 w-4" />
            New Album
          </Button>
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted dark:text-text-muted" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search albums..."
                aria-label="Search albums"
                className="w-full rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated py-2.5 pl-9 pr-4 text-sm text-text-primary dark:text-text-primary placeholder:text-text-muted dark:placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-border-primary dark:border-border-primary px-4 text-sm font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary transition-colors sm:w-auto cursor-pointer"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-text-secondary dark:text-text-muted">Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-bg-secondary text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-elevated'
              }`}
            >
              All
            </button>
            {ALBUM_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                  statusFilter === s
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-bg-secondary text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-elevated'
                }`}
              >
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs font-medium text-text-secondary dark:text-text-muted">Sort:</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-primary text-text-primary dark:text-text-primary px-3 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-bg-secondary dark:bg-bg-secondary">
            <FolderOpen className="h-8 w-8 text-text-muted dark:text-text-muted" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">No Albums Yet</h3>
          <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary">
            {search || statusFilter !== 'all'
              ? 'No albums match your search criteria.'
              : 'Create your first album to get started.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link to={ROUTES.ALBUM_NEW}>
              <Button className="mt-6">
                <Plus className="h-4 w-4" />
                Create Album
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <DeleteAlbumModal
        album={deleteTarget}
        isOpen={!!deleteTarget}
        isDeleting={isSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
