import { useEffect, useRef } from 'react';
import { MessageSquareText, Mic, Plus, X, MapPin } from 'lucide-react';
import type { ViewerRequestChange } from '@/types/viewer';
import { cn } from '@/utils/cn';

interface FeedbackBottomSheetProps {
  comments: ViewerRequestChange[];
  voiceCount: number;
  isOpen: boolean;
  onClose: () => void;
  onAddComment: () => void;
  onViewComment: (id: string) => void;
  focusedPinId: string | null;
}

export function FeedbackBottomSheet({
  comments,
  voiceCount,
  isOpen,
  onClose,
  onAddComment,
  onViewComment,
  focusedPinId,
}: FeedbackBottomSheetProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && focusedPinId && listRef.current) {
      const el = listRef.current.querySelector(`[data-comment-id="${focusedPinId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isOpen, focusedPinId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 max-h-[70dvh] rounded-t-2xl bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            Feedback{comments.length + voiceCount > 0 && ` (${comments.length + voiceCount})`}
          </h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {comments.length === 0 && voiceCount === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <MessageSquareText className="mb-2 h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-400">No feedback yet</p>
              <p className="text-xs text-gray-300 mt-1">Tap the comment button on the spread</p>
            </div>
          )}

          {comments.map((c) => (
            <button
              key={c.id}
              data-comment-id={c.id}
              onClick={() => {
                onViewComment(c.id);
                onClose();
              }}
              className={cn(
                'w-full text-left rounded-xl border p-4 transition-colors cursor-pointer',
                focusedPinId === c.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                {c.pin ? (
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-black text-white">
                    {c.pin.label}
                  </span>
                ) : (
                  <MapPin className="h-4 w-4 text-gray-400" />
                )}
                <span className="text-xs font-medium text-gray-400">
                  Spread {c.page_number}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">{c.message}</p>
            </button>
          ))}

          {voiceCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <Mic className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-gray-600 font-medium">
                {voiceCount} Voice Note{voiceCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-100">
          <button
            onClick={() => {
              onAddComment();
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Add Comment
          </button>
        </div>
      </div>
    </div>
  );
}
