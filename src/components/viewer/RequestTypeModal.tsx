import { FileText, MapPin, X } from 'lucide-react';

interface RequestTypeModalProps {
  onSelectGeneral: () => void;
  onSelectPin: () => void;
  onClose: () => void;
}

export function RequestTypeModal({ onSelectGeneral, onSelectPin, onClose }: RequestTypeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Request Changes</h2>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onSelectGeneral}
            className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">General Change</p>
              <p className="mt-0.5 text-sm text-gray-500">Describe what you'd like changed</p>
            </div>
          </button>

          <button
            onClick={onSelectPin}
            className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 text-left hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <MapPin className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Pin a Location on Photo</p>
              <p className="mt-0.5 text-sm text-gray-500">Tap the exact area you want changed</p>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
