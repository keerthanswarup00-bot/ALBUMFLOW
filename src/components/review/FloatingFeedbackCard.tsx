import { useState, useRef, useEffect } from 'react';
import { MessageSquareText, Mic, Plus, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import type { ViewerRequestChange } from '@/types/viewer';
import { cn } from '@/utils/cn';

interface FloatingFeedbackCardProps {
  comments: ViewerRequestChange[];
  voiceCount: number;
  onAddComment: () => void;
  onViewComment: (id: string) => void;
  focusedPinId: string | null;
  onPinFocus: (id: string | null) => void;
}

export function FloatingFeedbackCard({
  comments,
  voiceCount,
  onAddComment,
  onViewComment,
  focusedPinId,
  onPinFocus,
}: FloatingFeedbackCardProps) {
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const totalItems = comments.length + voiceCount;

  useEffect(() => {
    if (expanded && focusedPinId && listRef.current) {
      const el = listRef.current.querySelector(`[data-comment-id="${focusedPinId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [expanded, focusedPinId]);

  function handleToggle() {
    setExpanded((p) => !p);
    if (expanded) onPinFocus(null);
  }

  return (
    <div className="hidden lg:block absolute right-5 top-[120px] z-20 w-[280px]">
      {/* Collapsed state */}
      {!expanded && (
        <button
          onClick={handleToggle}
          className="flex w-full items-center gap-3 rounded-xl bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg border border-gray-200/80 hover:bg-white transition-all cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
            <MessageSquareText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex flex-1 flex-col text-left">
            <span className="text-xs font-bold text-gray-900">
              {comments.length > 0 ? `${comments.length} Comment${comments.length !== 1 ? 's' : ''}` : 'No comments'}
            </span>
            {voiceCount > 0 && (
              <span className="text-[10px] text-gray-500">{voiceCount} Voice Note{voiceCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <ChevronUp className="h-4 w-4 text-gray-400" />
        </button>
      )}

      {/* Expanded state */}
      {expanded && (
        <div className="rounded-xl bg-white/95 backdrop-blur-md shadow-lg border border-gray-200/80 overflow-hidden">
          <button
            onClick={handleToggle}
            className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
          >
            <span className="text-sm font-bold text-gray-900">
              Feedback{totalItems > 0 && ` (${totalItems})`}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          <div ref={listRef} className="max-h-[50vh] overflow-y-auto px-3 py-2 space-y-1.5">
            {comments.length === 0 && voiceCount === 0 && (
              <div className="flex flex-col items-center py-8 text-center">
                <MessageSquareText className="mb-2 h-8 w-8 text-gray-200" />
                <p className="text-xs text-gray-400">No feedback yet</p>
                <p className="text-[10px] text-gray-300 mt-0.5">Tap the comment button below</p>
              </div>
            )}

            {comments.map((c) => (
              <button
                key={c.id}
                data-comment-id={c.id}
                onClick={() => {
                  onViewComment(c.id);
                  onPinFocus(c.id);
                }}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-colors cursor-pointer',
                  focusedPinId === c.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  {c.pin ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
                      {c.pin.label}
                    </span>
                  ) : (
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span className="text-[10px] font-medium text-gray-400">
                    Spread {c.page_number}
                  </span>
                </div>
                <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{c.message}</p>
              </button>
            ))}

            {/* Voice notes placeholder */}
            {voiceCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <Mic className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-gray-600 font-medium">
                  {voiceCount} Voice Note{voiceCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="px-3 py-2.5 border-t border-gray-100">
            <button
              onClick={() => {
                onAddComment();
                setExpanded(false);
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
