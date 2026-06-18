import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import type { ViewerRequestChange } from '@/types/viewer';

interface PinPopupProps {
  request: ViewerRequestChange;
  onUpdate: (id: string, message: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function PinPopup({ request, onUpdate, onDelete, onClose }: PinPopupProps) {
  const [editMessage, setEditMessage] = useState(request.message);
  const [showConfirm, setShowConfirm] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  function handleSaveEdit() {
    const trimmed = editMessage.trim();
    if (!trimmed) return;
    onUpdate(request.id, trimmed);
  }

  return (
    <>
      <div ref={popupRef} className="w-72 rounded-xl bg-bg-primary shadow-xl border border-border-primary/80 overflow-hidden">
        <div className="flex items-center gap-2 px-3 pt-3 pb-1">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
            {request.pin?.label || '?'}
          </span>
          <span className="text-xs font-bold text-text-secondary">Pin #{request.pin?.label}</span>
          <div className="ml-auto">
            <button
              onClick={() => setShowConfirm(true)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-muted hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
              aria-label="Delete comment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <textarea
          value={editMessage}
          onChange={(e) => setEditMessage(e.target.value)}
          rows={2}
          aria-label="Edit comment"
          className="w-full resize-none border-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
          autoFocus
        />
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-3 py-2.5">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xs font-bold text-text-secondary hover:bg-gray-100 transition-colors cursor-pointer min-h-[44px]"
          >
            Close
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={!editMessage.trim() || editMessage.trim() === request.message}
            className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[44px]"
          >
            Save
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-80 rounded-xl bg-bg-primary p-6 shadow-xl">
            <h3 className="text-base font-bold text-text-primary">Delete this comment?</h3>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border-2 border-gray-300 py-3 text-sm font-bold text-text-secondary hover:bg-bg-secondary transition-colors cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(request.id); onClose(); }}
                className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors cursor-pointer min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
