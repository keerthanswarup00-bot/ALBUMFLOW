import { useState } from 'react';
import { X, FileText, MapPin, Mic, ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { REQUEST_STATUS_LABELS, REQUEST_CATEGORY_LABELS } from '@/constants/review';
import type { ViewerRequestChange, VoiceRequest } from '@/types/viewer';

interface RequestListScreenProps {
  requests: ViewerRequestChange[];
  voiceRequests: VoiceRequest[];
  onNavigateToPage: (pageNumber: number) => void;
  onViewRequest: (request: ViewerRequestChange) => void;
  onClose: () => void;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RequestListScreen({
  requests,
  voiceRequests,
  onNavigateToPage,
  onViewRequest,
  onClose,
}: RequestListScreenProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'general' | 'pin' | 'voice'>('all');
  const totalItems = requests.length + voiceRequests.length;

  const filteredRequests = requests.filter((r) => {
    if (filter === 'open') return r.status === 'open';
    if (filter === 'general') return r.category === 'general';
    if (filter === 'pin') return r.category === 'pin';
    return true;
  });

  const showVoice = filter === 'all' || filter === 'voice' || (filter === 'open' && voiceRequests.filter((v) => v.status === 'open').length > 0);

  const filters = [
    { key: 'all' as const, label: 'All', count: totalItems },
    { key: 'open' as const, label: 'Open', count: requests.filter((r) => r.status === 'open').length + voiceRequests.filter((r) => r.status === 'open').length },
    { key: 'general' as const, label: 'Comment', count: requests.filter((r) => r.category === 'general').length },
    { key: 'pin' as const, label: 'Pin', count: requests.filter((r) => r.category === 'pin').length },
    { key: 'voice' as const, label: 'Voice', count: voiceRequests.length },
  ];

  const groupedByPage = new Map<number, { text: ViewerRequestChange[]; voice: VoiceRequest[] }>();

  filteredRequests.forEach((r) => {
    if (!groupedByPage.has(r.page_number)) {
      groupedByPage.set(r.page_number, { text: [], voice: [] });
    }
    groupedByPage.get(r.page_number)!.text.push(r);
  });

  const filteredVoice = filter === 'open' ? voiceRequests.filter((v) => v.status === 'open') : voiceRequests;

  if (showVoice) {
    filteredVoice.forEach((v) => {
      if (!groupedByPage.has(v.page_number)) {
        groupedByPage.set(v.page_number, { text: [], voice: [] });
      }
      groupedByPage.get(v.page_number)!.voice.push(v);
    });
  }

  const sortedPages = Array.from(groupedByPage.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-900">Requested Changes</h2>
        <button
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors cursor-pointer',
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-base font-bold text-gray-500">No requests yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Tap "Comment" to submit feedback
            </p>
          </div>
        ) : (
          <div className="px-4 py-3">
            {sortedPages.map(([pageNumber, items]) => (
              <div key={pageNumber} className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                    Spread {pageNumber}
                  </span>
                  <button
                    onClick={() => onNavigateToPage(pageNumber)}
                    className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Go to spread
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {items.text.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => onViewRequest(request)}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left hover:border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                        request.category === 'pin' ? 'bg-amber-50' : 'bg-blue-50'
                      )}>
                        {request.category === 'pin' ? (
                          <MapPin className="h-5 w-5 text-amber-600" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-base font-bold text-gray-900">
                            {REQUEST_CATEGORY_LABELS[request.category]}
                          </span>
                          <span className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
                            request.status === 'open' ? 'bg-amber-100 text-amber-700' :
                            request.status === 'resolved' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          )}>
                            {REQUEST_STATUS_LABELS[request.status]}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-base text-gray-500">
                          {request.message}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {formatDate(request.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="mt-1.5 h-5 w-5 shrink-0 text-gray-300" />
                    </button>
                  ))}

                  {items.voice.map((voice) => (
                    <div
                      key={voice.id}
                      className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50">
                        <Mic className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-gray-900">Voice Message</span>
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                            {REQUEST_STATUS_LABELS[voice.status]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-base text-gray-500">
                          {formatDuration(voice.duration)}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {formatDate(voice.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
