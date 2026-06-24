import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlbumStore } from '@/store/albumStore';
import { useReviewStore } from '@/store/reviewStore';
import { useRequestStore } from '@/store/requestStore';
import { useVoiceStore } from '@/store/voiceStore';
import { useReviewCycleStore } from '@/store/reviewCycleStore';
import { ROUTES } from '@/constants/routes';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { REVIEW_CYCLE_LABELS, REVIEW_CYCLE_STYLES } from '@/types/viewer';
import { cn } from '@/utils/cn';
import {
  Search,
  ArrowRight,
  FileText,
  MapPin,
  Mic,
  MessageSquare,
  Filter,
} from 'lucide-react';
import type { ViewerRequestChange, VoiceRequest } from '@/types/viewer';

type RequestFilter = 'all' | 'general' | 'pin' | 'voice' | 'open' | 'resolved';

export function ReviewManagementPage() {
  const navigate = useNavigate();
  const { albums, isLoading, fetchAlbums } = useAlbumStore();
  const getReviewedCount = useReviewStore((s) => s.getReviewedCount);
  const { getStatus } = useReviewCycleStore();
  const { getRequests } = useRequestStore();
  const { getRecordings, getRecordingCount } = useVoiceStore();

  const [search, setSearch] = useState('');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [requestFilter, setRequestFilter] = useState<RequestFilter>('all');

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const filteredAlbums = albums.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.client_name.toLowerCase().includes(q)
    );
  });

  const selectedAlbum = albums.find((a) => a.id === selectedAlbumId);
  const selectedRequests = selectedAlbumId ? getRequests(selectedAlbumId) : [];
  const selectedVoice = selectedAlbumId ? getRecordings(selectedAlbumId) : [];

  const filteredRequests = selectedRequests.filter((r) => {
    if (requestFilter === 'general') return r.category === 'general';
    if (requestFilter === 'pin') return r.category === 'pin';
    if (requestFilter === 'open') return r.status === 'open';
    if (requestFilter === 'resolved') return r.status === 'resolved';
    return true;
  });

  const filteredVoice = selectedVoice.filter((v) => {
    if (requestFilter === 'open') return v.status === 'open';
    if (requestFilter === 'resolved') return v.status === 'resolved';
    return true;
  });

  const showVoice = requestFilter === 'all' || requestFilter === 'voice' || requestFilter === 'open' || requestFilter === 'resolved';

  const groupedByPage = new Map<number, { text: ViewerRequestChange[]; voice: VoiceRequest[] }>();
  filteredRequests.forEach((r) => {
    if (!groupedByPage.has(r.page_number)) {
      groupedByPage.set(r.page_number, { text: [], voice: [] });
    }
    groupedByPage.get(r.page_number)!.text.push(r);
  });
  if (showVoice) {
    filteredVoice.forEach((v) => {
      if (!groupedByPage.has(v.page_number)) {
        groupedByPage.set(v.page_number, { text: [], voice: [] });
      }
      groupedByPage.get(v.page_number)!.voice.push(v);
    });
  }
  const sortedPages = Array.from(groupedByPage.entries()).sort(([a], [b]) => a - b);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary">Review Management</h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
          Review client feedback across all albums
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search albums..."
                    aria-label="Search albums"
                    className="w-full rounded-xl border border-border-primary dark:border-border-primary py-2.5 pl-9 pr-4 text-sm text-text-primary dark:text-text-primary placeholder:text-text-muted dark:placeholder:text-text-secondary focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 bg-bg-primary dark:bg-bg-elevated"
                  />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {filteredAlbums.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">No albums found</p>
              ) : (
                filteredAlbums.map((album) => {
                  const status = getStatus(album.id);
                  const reviewed = getReviewedCount(album.id);
                  const requests = getRequests(album.id).length;
                  const voice = getRecordingCount(album.id);
                  return (
                    <button
                      key={album.id}
                      onClick={() => setSelectedAlbumId(album.id)}
                      role="option"
                      aria-selected={selectedAlbumId === album.id}
                      className={cn(
                        'flex flex-col gap-1 rounded-xl px-3.5 py-3 text-left transition-colors cursor-pointer',
                        selectedAlbumId === album.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          : 'border border-transparent hover:bg-bg-secondary dark:hover:bg-bg-secondary'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary dark:text-text-primary truncate">{album.title}</span>
                        <span className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ml-2',
                          REVIEW_CYCLE_STYLES[status]
                        )}>
                          {REVIEW_CYCLE_LABELS[status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary dark:text-text-secondary">
                        <span>{album.client_name}</span>
                        {reviewed > 0 && <span>{reviewed} reviewed</span>}
                        {requests > 0 && <span>{requests} requests</span>}
                        {voice > 0 && <span>{voice} voice</span>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {!selectedAlbumId ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="mb-3 h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium text-text-secondary">Select an album</p>
                <p className="mt-1 text-xs text-text-muted">
                  Choose an album from the list to view requests
                </p>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary dark:text-text-primary">{selectedAlbum?.title}</h2>
                    <p className="text-sm text-text-secondary dark:text-text-secondary">{selectedAlbum?.client_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium',
                      REVIEW_CYCLE_STYLES[getStatus(selectedAlbumId)]
                    )}>
                      {REVIEW_CYCLE_LABELS[getStatus(selectedAlbumId)]}
                    </span>
                    <button
                      onClick={() => navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', selectedAlbumId))}
                      className="flex items-center gap-1 rounded-lg border border-border-primary dark:border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary transition-colors cursor-pointer"
                    >
                      View Album
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border-primary dark:border-border-primary pt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary dark:text-text-primary">{selectedRequests.length + selectedVoice.length}</p>
                    <p className="text-xs text-text-secondary dark:text-text-secondary">Total Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary dark:text-text-primary">
                      {selectedRequests.filter((r) => r.status === 'open').length + selectedVoice.filter((v) => v.status === 'open').length}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">Open</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-text-primary dark:text-text-primary">
                      {selectedRequests.filter((r) => r.status === 'resolved').length + selectedVoice.filter((v) => v.status === 'resolved').length}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">Resolved</p>
                  </div>
                </div>
              </Card>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Filter className="h-4 w-4 text-text-muted shrink-0" />
                {(['all', 'general', 'pin', 'voice', 'open', 'resolved'] as const).map((f) => {
                  const count = f === 'all' ? selectedRequests.length + selectedVoice.length :
                    f === 'voice' ? selectedVoice.length :
                    f === 'open' ? selectedRequests.filter((r) => r.status === 'open').length + selectedVoice.filter((v) => v.status === 'open').length :
                    f === 'resolved' ? selectedRequests.filter((r) => r.status === 'resolved').length + selectedVoice.filter((v) => v.status === 'resolved').length :
                    selectedRequests.filter((r) => f === 'general' ? r.category === 'general' : r.category === 'pin').length;
                  return (
                    <button
                      key={f}
                      onClick={() => setRequestFilter(f)}
                      aria-pressed={requestFilter === f}
                      className={cn(
                        'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                        requestFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-bg-secondary text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-elevated'
                      )}
                    >
                      {f === 'all' ? 'All' :
                       f === 'general' ? 'Comments' :
                       f === 'pin' ? 'Pins' :
                       f === 'voice' ? 'Voice Notes' :
                       f === 'open' ? 'Pending' : 'Resolved'} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3">
                {sortedPages.length === 0 ? (
                  <Card>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <MessageSquare className="mb-3 h-8 w-8 text-text-muted" />
                      <p className="text-sm text-text-secondary">No requests match this filter</p>
                    </div>
                  </Card>
                ) : (
                  sortedPages.map(([pageNumber, items]) => (
                    <Card key={pageNumber}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text-secondary dark:text-text-primary">Page {pageNumber}</h3>
                        <button
                          onClick={() => {
                            navigate(`${ROUTES.CLIENT_VIEW.replace(':albumId', selectedAlbumId)}?targetPage=${pageNumber}`);
                          }}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          Jump to Page
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {items.text.map((request) => (
                          <div
                            key={request.id}
                            onClick={() => {
                              navigate(`${ROUTES.CLIENT_VIEW.replace(':albumId', selectedAlbumId)}?targetPage=${pageNumber}&targetRequestId=${request.id}`);
                            }}
                            className="flex items-start gap-3 rounded-lg bg-bg-secondary dark:bg-bg-secondary p-3 hover:bg-bg-elevated dark:hover:bg-bg-elevated cursor-pointer transition-colors"
                          >
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              request.category === 'pin' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/30'
                            )}>
                              {request.category === 'pin' ? (
                                <MapPin className="h-4 w-4 text-amber-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary dark:text-text-primary">
                                  {request.category === 'pin' ? 'Pin Request' : 'General Change'}
                                </span>
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                  request.status === 'open' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' :
                                  request.status === 'resolved' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                                  'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                                )}>
                                  {request.status === 'open' ? 'Open' :
                                   request.status === 'resolved' ? 'Resolved' : 'Designer Review'}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-text-secondary dark:text-text-secondary">{request.message}</p>
                              {request.pin && (
                                <p className="mt-1 text-xs text-text-muted dark:text-text-muted">
                                  Photo location: ({Math.round(request.pin.xPercent)}%, {Math.round(request.pin.yPercent)}%)
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.voice.map((voice) => (
                          <div
                            key={voice.id}
                            onClick={() => {
                              navigate(`${ROUTES.CLIENT_VIEW.replace(':albumId', selectedAlbumId)}?targetPage=${pageNumber}&targetRequestId=${voice.id}`);
                            }}
                            className="flex items-start gap-3 rounded-lg bg-bg-secondary dark:bg-bg-secondary p-3 hover:bg-bg-elevated dark:hover:bg-bg-elevated cursor-pointer transition-colors"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                              <Mic className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-text-primary dark:text-text-primary">Voice Message</span>
                                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                  {voice.status === 'open' ? 'Open' : voice.status === 'resolved' ? 'Resolved' : 'Designer Review'}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-text-secondary dark:text-text-secondary">
                                {Math.floor(voice.duration / 60)}:{(voice.duration % 60).toString().padStart(2, '0')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
