import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import type { ViewerRequestChange } from '@/types/viewer';

interface PinPopupProps {
  request: ViewerRequestChange;
  onUpdate: (id: string, message: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function PinPopup({ request, onUpdate, onDelete, onClose }: PinPopupProps) {
  const [isEditing, setIsEditing] = useState(false);
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
    if (!trimmed || trimmed === request.message) {
      setIsEditing(false);
      return;
    }
    onUpdate(request.id, trimmed);
    setIsEditing(false);
  }

  return (
    <>
      <div ref={popupRef} className="absolute z-30 w-72 rounded-xl bg-white shadow-xl border border-gray-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-500">Comment #{request.pin?.label}</span>
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setIsEditing(true); setEditMessage(request.message); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-200"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center justify-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editMessage.trim()}
                  className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">{request.message}</p>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-72 rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-gray-900">Delete this comment?</h3>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border-2 border-gray-300 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(request.id); onClose(); }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
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
