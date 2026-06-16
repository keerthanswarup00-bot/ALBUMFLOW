import { useState } from 'react';
import { X, FileText, MapPin, Trash2, Pencil, Check, XCircle } from 'lucide-react';
import { REQUEST_STATUS_LABELS, REQUEST_CATEGORY_LABELS } from '@/constants/review';
import type { ViewerRequestChange } from '@/types/viewer';

interface RequestDetailScreenProps {
  request: ViewerRequestChange;
  onDelete: (id: string) => void;
  onUpdate: (id: string, message: string) => void;
  onNavigateToPage: (pageNumber: number) => void;
  onClose: () => void;
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export function RequestDetailScreen({ request, onDelete, onUpdate, onNavigateToPage, onClose }: RequestDetailScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState(request.message);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    setShowConfirm(true);
  }

  function confirmDelete() {
    onDelete(request.id);
    onClose();
  }

  function handleSaveEdit() {
    const trimmed = editMessage.trim();
    if (!trimmed || trimmed === request.message) {
      setIsEditing(false);
      return;
    }
    onUpdate(request.id, trimmed);
    setIsEditing(false);
  }

  function handleCancelEdit() {
    setEditMessage(request.message);
    setIsEditing(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Request Change</h2>
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Type badge */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            {request.category === 'pin' ? (
              <MapPin className="h-5 w-5 text-amber-600" />
            ) : (
              <FileText className="h-5 w-5 text-blue-600" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{REQUEST_CATEGORY_LABELS[request.category]}</p>
            <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {REQUEST_STATUS_LABELS[request.status]}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 rounded-xl bg-gray-50 p-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Spread</span>
            <span className="font-medium text-gray-900">{request.page_number}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span className="font-medium text-gray-900">{REQUEST_CATEGORY_LABELS[request.category]}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Created</span>
            <span className="font-medium text-gray-900">{formatDateTime(request.created_at)}</span>
          </div>
          {request.pin && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Photo Location</span>
              <span className="font-medium text-gray-900">
                ({Math.round(request.pin.xPercent)}%, {Math.round(request.pin.yPercent)}%)
              </span>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-gray-700">Message</p>
          {isEditing ? (
            <div className="flex flex-col gap-3">
              <textarea
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 p-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editMessage.trim()}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative rounded-xl bg-gray-50 p-4 text-sm text-gray-900">
              {request.message}
              <button
                onClick={() => setIsEditing(true)}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 opacity-0 hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100 transition-all cursor-pointer"
                aria-label="Edit message"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 border-t border-gray-200 px-4 py-3">
        <button
          onClick={() => {
            onNavigateToPage(request.page_number);
            onClose();
          }}
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          Jump to Page {request.page_number}
        </button>
        <button
          onClick={handleDelete}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
          aria-label="Delete request"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete this request?</h3>
            <p className="mt-2 text-sm text-gray-500">
              This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
