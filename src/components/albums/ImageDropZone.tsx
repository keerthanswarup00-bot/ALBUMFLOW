import { useState, useRef, type DragEvent } from 'react';
import { cn } from '@/utils/cn';
import { Upload, X, ImageIcon } from 'lucide-react';

interface ImageDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
  accept?: string;
  maxSize?: number;
}

export function ImageDropZone({
  onFilesSelected,
  isUploading,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 50,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | File[]) {
    const valid: File[] = [];
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const acceptedTypes = accept.split(',');
      if (!acceptedTypes.includes(file.type) && accept !== '*/*') continue;
      if (file.size > maxSize * 1024 * 1024) continue;
      valid.push(file);
      urls.push(URL.createObjectURL(file));
    }

    if (valid.length === 0) return;

    setPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return urls;
    });

    onFilesSelected(valid);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleInputChange() {
    if (inputRef.current?.files) {
      handleFiles(inputRef.current.files);
      inputRef.current.value = '';
    }
  }

  function clearPreviews() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors',
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100',
          isUploading && 'pointer-events-none opacity-50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          onChange={handleInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {previews.length > 0 ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                {previews.length} file{previews.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200">
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearPreviews();
              }}
              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
            >
              <X className="h-3 w-3" />
              Clear selection
            </button>
          </div>
        ) : (
          <>
            <Upload className="mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop images here
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              or click to browse &middot; JPEG, PNG, WebP &middot; Up to {maxSize}MB
            </p>
          </>
        )}
      </div>
    </div>
  );
}
