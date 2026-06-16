import { useEffect, useState } from 'react';
import { useAlbumStore } from '@/store/albumStore';
import { useReviewStore } from '@/store/reviewStore';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import * as versionsService from '@/services/supabase/versions';
import * as notificationsService from '@/services/supabase/notifications';
import * as analyticsService from '@/services/supabase/analytics';
import * as reviewPdfService from '@/services/reportPdf';
import { useAuthStore } from '@/store/authStore';
import type { AlbumVersion, Album } from '@/types';
import { FolderOpen, CheckCircle, Clock, AlertCircle, ImageIcon, Bell, BellRing, MessageSquare, Mic, Download } from 'lucide-react';
import { cn } from '@/utils/cn';

export function DashboardPage() {
  const { albums, isLoading, fetchAlbums } = useAlbumStore();
  const { profile } = useAuthStore();
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const [albumPageCounts, setAlbumPageCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<notificationsService.Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [analyticsMap, setAnalyticsMap] = useState<Record<string, analyticsService.ReviewAnalytics>>({});
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchAlbums();
    async function loadData() {
      try {
        const [notifs, unread] = await Promise.all([
          notificationsService.getNotifications(),
          notificationsService.getUnreadCount(),
        ]);
        setNotifications(notifs);
        setUnreadCount(unread);
      } catch { /* silently fail */ }
    }
    loadData();
  }, [fetchAlbums]);

  useEffect(() => {
    if (albums.length === 0) return;
    async function loadAnalytics() {
      try {
        const all = await analyticsService.getAllAnalytics();
        const map: Record<string, analyticsService.ReviewAnalytics> = {};
        all.forEach((a) => { map[a.album_id] = a; });
        setAnalyticsMap(map);
      } catch { /* silently fail */ }
    }
    loadAnalytics();
  }, [albums]);

  async function handleMarkAllRead() {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silently fail */ }
  }

  async function handleMarkRead(id: string) {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch { /* silently fail */ }
  }

  function handleDownloadReport(album: Album) {
    const reviewed = getReviewedCount(album.id);
    const analytics = analyticsMap[album.id];
    reviewPdfService.downloadReviewReport({
      albumTitle: album.title,
      clientName: album.client_name || 'Client',
      studioName: profile?.studio_name || 'Studio',
      ownerName: profile?.owner_name || '',
      phoneNumber: profile?.phone_number || '',
      studioLogoUrl: profile?.studio_logo_url || '',
      totalPages: albumPageCounts[album.id] ?? 0,
      reviewedCount: reviewed,
      commentsCount: 0,
      voiceCount: 0,
      status: album.status,
      analytics: analytics ?? null,
    });
  }

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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your albums and review progress
          </p>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            {unreadCount > 0 ? (
              <>
                <BellRing className="h-5 w-5 text-blue-500" />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </>
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-700">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</p>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleMarkRead(n.id)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50',
                          !n.is_read && 'bg-blue-50/40'
                        )}
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.type === 'comment' ? (
                            <MessageSquare className="h-4 w-4 text-blue-500" />
                          ) : n.type === 'approval' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : n.type === 'changes' ? (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Bell className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-gray-900', !n.is_read && 'font-medium')}>{n.message}</p>
                          {n.title && (
                            <p className="mt-0.5 truncate text-xs text-gray-400">{n.title}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
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
                const an = analyticsMap[album.id];
                return (
                  <div key={album.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{album.title}</p>
                      <p className="truncate text-xs text-gray-500">{album.client_name}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 ml-3">
                      {an && (
                        <div className="hidden items-center gap-2 text-xs text-gray-400 sm:flex">
                          {an.comments_count > 0 && (
                            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{an.comments_count}</span>
                          )}
                          {an.voice_notes_count > 0 && (
                            <span className="flex items-center gap-1"><Mic className="h-3 w-3" />{an.voice_notes_count}</span>
                          )}
                        </div>
                      )}
                      {reviewed > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>{reviewed} reviewed</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleDownloadReport(album)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white hover:text-gray-700"
                        title="Download review report"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
