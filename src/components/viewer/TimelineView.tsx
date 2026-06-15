import { X, CheckCircle, Clock, Send, RefreshCw, FileText } from 'lucide-react';
import type { TimelineEntry } from '@/types/viewer';
import { cn } from '@/utils/cn';

interface TimelineViewProps {
  entries: TimelineEntry[];
  albumTitle: string;
  onClose: () => void;
}

const TIMELINE_ICONS = {
  album_created: FileText,
  review_submitted: Send,
  album_updated: RefreshCw,
  update_reviewed: Clock,
  approved: CheckCircle,
};

const TIMELINE_COLORS = {
  album_created: 'bg-gray-100 text-gray-600',
  review_submitted: 'bg-blue-100 text-blue-600',
  album_updated: 'bg-purple-100 text-purple-600',
  update_reviewed: 'bg-amber-100 text-amber-600',
  approved: 'bg-green-100 text-green-600',
};

const TIMELINE_LABELS: Record<string, string> = {
  album_created: 'Album Created',
  review_submitted: 'Review Submitted',
  album_updated: 'Album Updated',
  update_reviewed: 'Update Reviewed',
  approved: 'Final Approval',
};

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function TimelineView({ entries, albumTitle, onClose }: TimelineViewProps) {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Album Timeline</h2>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm text-gray-500">{albumTitle}</p>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">No timeline entries yet</p>
            <p className="mt-1 text-xs text-gray-400">Timeline will populate as you review and submit</p>
          </div>
        ) : (
          <div className="px-6 py-4">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-0 h-full w-0.5 bg-gray-200" />

              <div className="flex flex-col gap-6">
                {sorted.map((entry) => {
                  const Icon = TIMELINE_ICONS[entry.type];
                  return (
                    <div key={entry.id} className="relative flex gap-4">
                      {/* Icon */}
                      <div className={cn(
                        'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        TIMELINE_COLORS[entry.type]
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="text-sm font-medium text-gray-900">
                          {TIMELINE_LABELS[entry.type] ?? entry.type}
                        </p>
                        {entry.description && (
                          <p className="mt-0.5 text-sm text-gray-500">{entry.description}</p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-xs text-gray-400">{formatDate(entry.timestamp)}</span>
                          <span className="text-xs text-gray-300">at</span>
                          <span className="text-xs text-gray-400">{formatTime(entry.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
