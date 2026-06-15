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

  // Group requests by page
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
        <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review client feedback across all albums
        </p>
      </div>

      {/* Album list */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar: album list */}
        <div className="lg:col-span-1">
          <Card>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search albums..."
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {filteredAlbums.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No albums found</p>
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
                      className={cn(
                        'flex flex-col gap-1 rounded-xl px-3.5 py-3 text-left transition-colors cursor-pointer',
                        selectedAlbumId === album.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'border border-transparent hover:bg-gray-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 truncate">{album.title}</span>
                        <span className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ml-2',
                          REVIEW_CYCLE_STYLES[status]
                        )}>
                          {REVIEW_CYCLE_LABELS[status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
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

        {/* Main: request detail */}
        <div className="lg:col-span-2">
          {!selectedAlbumId ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Select an album</p>
                <p className="mt-1 text-xs text-gray-400">
                  Choose an album from the list to view requests
                </p>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Album header */}
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedAlbum?.title}</h2>
                    <p className="text-sm text-gray-500">{selectedAlbum?.client_name}</p>
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
                      className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      View Album
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Request stats */}
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{selectedRequests.length}</p>
                    <p className="text-xs text-gray-500">Total Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRequests.filter((r) => r.status === 'open').length}
                    </p>
                    <p className="text-xs text-amber-600">Open</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {selectedRequests.filter((r) => r.status === 'resolved').length}
                    </p>
                    <p className="text-xs text-green-600">Resolved</p>
                  </div>
                </div>
              </Card>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto">
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
                      className={cn(
                        'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                        requestFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {f === 'all' ? 'All' :
                       f === 'general' ? 'General' :
                       f === 'pin' ? 'Pin' :
                       f === 'voice' ? 'Voice' :
                       f === 'open' ? 'Open' : 'Resolved'} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Grouped requests */}
              <div className="flex flex-col gap-3">
                {sortedPages.length === 0 ? (
                  <Card>
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <MessageSquare className="mb-3 h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-500">No requests match this filter</p>
                    </div>
                  </Card>
                ) : (
                  sortedPages.map(([pageNumber, items]) => (
                    <Card key={pageNumber}>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-700">Page {pageNumber}</h3>
                        <button
                          onClick={() => {
                            navigate(ROUTES.ALBUM_DETAIL.replace(':albumId', selectedAlbumId));
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
                            className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
                          >
                            <div className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                              request.category === 'pin' ? 'bg-amber-50' : 'bg-blue-50'
                            )}>
                              {request.category === 'pin' ? (
                                <MapPin className="h-4 w-4 text-amber-600" />
                              ) : (
                                <FileText className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {request.category === 'pin' ? 'Pin Request' : 'General Change'}
                                </span>
                                <span className={cn(
                                  'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                  request.status === 'open' ? 'bg-amber-100 text-amber-700' :
                                  request.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                  'bg-blue-100 text-blue-700'
                                )}>
                                  {request.status === 'open' ? 'Open' :
                                   request.status === 'resolved' ? 'Resolved' : 'Designer Review'}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-gray-500">{request.message}</p>
                              {request.pin && (
                                <p className="mt-1 text-xs text-gray-400">
                                  Photo location: ({Math.round(request.pin.xPercent)}%, {Math.round(request.pin.yPercent)}%)
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {items.voice.map((voice) => (
                          <div
                            key={voice.id}
                            className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                              <Mic className="h-4 w-4 text-purple-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">Voice Message</span>
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  {voice.status === 'open' ? 'Open' : voice.status === 'resolved' ? 'Resolved' : 'Designer Review'}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-gray-500">
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
