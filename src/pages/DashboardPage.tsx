import { useEffect, useState } from 'react';
import { useAlbumStore } from '@/store/albumStore';
import { useReviewStore } from '@/store/reviewStore';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import * as versionsService from '@/services/supabase/versions';
import type { AlbumVersion } from '@/types';
import { FolderOpen, CheckCircle, Clock, AlertCircle, ImageIcon } from 'lucide-react';

export function DashboardPage() {
  const { albums, isLoading, fetchAlbums } = useAlbumStore();
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const [albumPageCounts, setAlbumPageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  useEffect(() => {
    if (albums.length === 0) return;
    let cancelled = false;
    async function loadPageCounts() {
      const counts: Record<string, number> = {};
      for (const album of albums) {
        try {
          const versions: AlbumVersion[] = await versionsService.getVersions(album.id);
          if (cancelled) return;
          if (versions.length > 0) {
            counts[album.id] = versions[0].page_count;
          }
        } catch {
          // skip albums that fail to load
        }
      }
      if (!cancelled) setAlbumPageCounts(counts);
    }
    loadPageCounts();
    return () => { cancelled = true; };
  }, [albums]);

  let reviewedPages = 0;
  let totalPages = 0;

  albums.forEach((album) => {
    const reviewed = getReviewedCount(album.id);
    const pageCount = albumPageCounts[album.id] ?? 0;
    if (reviewed > 0 && pageCount > 0) {
      reviewedPages += reviewed;
      totalPages += pageCount;
    }
  });

  const activeAlbums = albums.filter((a) => a.status !== 'approved').length;
  const approvedAlbums = albums.filter((a) => a.status === 'approved').length;
  const reviewAlbums = albums.filter((a) => a.status === 'awaiting_review').length;
  const changesAlbums = albums.filter((a) => a.status === 'changes_requested').length;

  const overallPercent = totalPages > 0
    ? Math.round((reviewedPages / totalPages) * 100)
    : 0;

  const stats = [
    { label: 'Active Albums', value: String(activeAlbums), icon: FolderOpen, color: 'text-blue-600 bg-blue-50' },
    { label: 'Approved', value: String(approvedAlbums), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'In Review', value: String(reviewAlbums), icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Changes Requested', value: String(changesAlbums), icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  ];

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your albums and review progress
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-3 ${stat.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Overall review progress */}
      {reviewedPages > 0 && (
        <div className="mt-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2.5">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Overall Review Progress
                </p>
                <p className="text-xs text-gray-500">
                  {reviewedPages} / {totalPages} pages reviewed across all albums
                </p>
              </div>
              <span className="text-lg font-bold text-green-600">{overallPercent}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.min(overallPercent, 100)}%` }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Recent Albums */}
      <div className="mt-6">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            Albums
          </h2>
          {albums.length === 0 ? (
            <p className="text-sm text-gray-500">
              No albums yet. Create your first album to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {albums.slice(0, 10).map((album) => {
                const reviewed = getReviewedCount(album.id);
                return (
                  <div key={album.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{album.title}</p>
                      <p className="truncate text-xs text-gray-500">{album.client_name}</p>
                    </div>
                    {reviewed > 0 && (
                      <div className="flex shrink-0 items-center gap-2 ml-3">
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{reviewed} reviewed</span>
                        </div>
                      </div>
                    )}
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
