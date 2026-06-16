import { useState, useEffect, useRef } from 'react';
import { X, Check, Send } from 'lucide-react';

interface GeneralRequestFormProps {
  pageNumber: number;
  initialMessage?: string;
  submittedCount: number;
  onSubmit: (message: string) => void;
  onClose: () => void;
}

export function GeneralRequestForm({ pageNumber, initialMessage = '', submittedCount, onSubmit, onClose }: GeneralRequestFormProps) {
  const [message, setMessage] = useState(initialMessage);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lastSubmitted, setLastSubmitted] = useState(false);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = message.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setMessage('');
    setLastSubmitted(true);
    setTimeout(() => setLastSubmitted(false), 2000);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const isDisabled = !message.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Comment on Spread {pageNumber}</h2>
          <button
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {lastSubmitted && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-bold text-green-700 border border-green-200">
            <Check className="h-4 w-4" />
            Comment submitted! Type another or close.
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell us what you'd like changed..."
          rows={4}
          className="w-full resize-none rounded-xl border-2 border-gray-300 p-4 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />

        <div className="mt-2 mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {submittedCount > 0
              ? `${submittedCount} comment${submittedCount !== 1 ? 's' : ''} submitted`
              : 'Your comments will be shared with the designer.'}
          </span>
          <span className="text-xs text-gray-300">⌘⏎ to send</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-gray-300 py-3.5 text-base font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            {submittedCount > 0 ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <Send className="h-5 w-5" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
