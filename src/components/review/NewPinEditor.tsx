import { useState, useEffect, useRef } from 'react';

interface NewPinEditorProps {
  pinNumber: number;
  onSave: (message: string) => void;
  onCancel: () => void;
}

export function NewPinEditor({ pinNumber, onSave, onCancel }: NewPinEditorProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (message.trim()) onSave(message.trim());
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div className="w-72 rounded-xl bg-white shadow-xl border border-gray-200/80 overflow-hidden">
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-black text-white">
          {pinNumber}
        </span>
        <span className="text-xs font-bold text-gray-500">Pin #{pinNumber}</span>
      </div>
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type change request..."
        rows={2}
        className="w-full resize-none border-0 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-3 py-2.5">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer min-h-[36px]"
        >
          Cancel
        </button>
        <button
          onClick={() => { if (message.trim()) onSave(message.trim()); }}
          disabled={!message.trim()}
          className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer min-h-[36px]"
        >
          Save
        </button>
      </div>
    </div>
  );
}
