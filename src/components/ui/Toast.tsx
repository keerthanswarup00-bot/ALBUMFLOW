import { useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const typeStyles = {
  success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
  error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
  info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

export function Toast() {
  const toastMessage = useUIStore((s) => s.toastMessage);
  const toastType = useUIStore((s) => s.toastType);
  const clearToast = useUIStore((s) => s.clearToast);

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
          'flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg dark:shadow-black/40',
          typeStyles[toastType],
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">{toastMessage}</p>
        <button
          onClick={clearToast}
          aria-label="Dismiss notification"
          className="ml-2 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
