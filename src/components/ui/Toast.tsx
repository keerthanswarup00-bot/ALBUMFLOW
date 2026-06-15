import { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const typeStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

export function Toast() {
  const { toastMessage, toastType, clearToast } = useUIStore();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(clearToast, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, clearToast]);

  if (!toastMessage || !toastType) return null;

  const Icon = icons[toastType];

  return (
    <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 lg:bottom-6" role="alert" aria-live="polite">
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg',
          typeStyles[toastType],
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{toastMessage}</p>
        <button
          onClick={clearToast}
          className="ml-2 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
