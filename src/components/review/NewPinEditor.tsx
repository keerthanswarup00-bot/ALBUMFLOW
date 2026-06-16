import { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

interface NewPinEditorProps {
  onSave: (message: string) => void;
  onCancel: () => void;
}

export function NewPinEditor({ onSave, onCancel }: NewPinEditorProps) {
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
    <div className="w-64 rounded-xl bg-white shadow-xl border border-gray-200/80 overflow-hidden">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a comment..."
        rows={3}
        className="w-full resize-none border-0 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
        <button
          onClick={() => { if (message.trim()) onSave(message.trim()); }}
          disabled={!message.trim()}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Send className="h-3 w-3" />
          Save
        </button>
      </div>
    </div>
  );
}
