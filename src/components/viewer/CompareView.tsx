import { useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Columns, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AlbumUpdate } from '@/types/viewer';

type CompareMode = 'side-by-side' | 'slider';

interface CompareViewProps {
  previousUpdate: AlbumUpdate;
  currentUpdate: AlbumUpdate;
  onClose: () => void;
}

export function CompareView({ previousUpdate, currentUpdate, onClose }: CompareViewProps) {
  const [mode, setMode] = useState<CompareMode>('side-by-side');
  const [pageIndex, setPageIndex] = useState(0);
  const [sliderPos, setSliderPos] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);

  const allPages = Array.from(
    new Set([
      ...previousUpdate.pages.map((p) => p.page_number),
      ...currentUpdate.pages.map((p) => p.page_number),
    ])
  ).sort((a, b) => a - b);

  const currentPageNum = allPages[pageIndex] ?? 1;
  const prevPage = previousUpdate.pages.find((p) => p.page_number === currentPageNum);
  const currPage = currentUpdate.pages.find((p) => p.page_number === currentPageNum);

  const handleSliderMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, pos)));
  }, []);

  if (allPages.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">Compare Changes</h2>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          No pages to compare
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">Compare Changes</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {currentUpdate.label} vs {previousUpdate.label}
          </span>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode('side-by-side')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              mode === 'side-by-side' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            <Columns className="h-3.5 w-3.5" />
            Side by Side
          </button>
          <button
            onClick={() => setMode('slider')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              mode === 'slider' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Slider
          </button>
        </div>

        {/* Page nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            disabled={pageIndex === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-gray-600">Page {currentPageNum}</span>
          <button
            onClick={() => setPageIndex((p) => Math.min(allPages.length - 1, p + 1))}
            disabled={pageIndex >= allPages.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Comparison area */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-4">
        {!prevPage && !currPage ? (
          <p className="text-sm text-gray-400">No images for this page</p>
        ) : mode === 'side-by-side' ? (
          <div className="flex h-full w-full gap-2">
            <div className="flex flex-1 flex-col">
              <span className="mb-2 text-center text-xs font-medium text-gray-500">{previousUpdate.label}</span>
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                {prevPage ? (
                  <img src={prevPage.image_url} alt="Previous" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm text-gray-400">No image</span>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              <span className="mb-2 text-center text-xs font-medium text-green-600">{currentUpdate.label}</span>
              <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
                {currPage ? (
                  <img src={currPage.image_url} alt="Current" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm text-gray-400">No image</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Before/After slider */
          <div
            ref={sliderRef}
            className="relative h-full w-full overflow-hidden rounded-xl bg-white shadow-sm select-none"
            onMouseMove={handleSliderMove}
            onTouchMove={handleSliderMove}
          >
            {/* After image (full) */}
            {currPage && (
              <img
                src={currPage.image_url}
                alt="Current"
                className="absolute inset-0 h-full w-full object-contain"
                draggable={false}
              />
            )}
            {/* Before image (clipped) */}
            {prevPage && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <img
                  src={prevPage.image_url}
                  alt="Previous"
                  className="absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                  style={{ width: `${100 / (sliderPos / 100)}%`, maxWidth: 'none' }}
                />
              </div>
            )}
            {/* Slider handle */}
            <div
              className="absolute inset-y-0 cursor-col-resize"
              style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white shadow-md" />
              <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200">
                <SlidersHorizontal className="h-4 w-4 text-gray-600" />
              </div>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="absolute -left-20 text-xs font-medium text-white drop-shadow-lg">Before</span>
                <span className="absolute left-6 text-xs font-medium text-white drop-shadow-lg">After</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Page label */}
      <div className="border-t border-gray-100 px-4 py-2 text-center text-xs text-gray-400">
        Page {currentPageNum} &middot; {allPages.length} page{allPages.length !== 1 ? 's' : ''} in update
      </div>
    </div>
  );
}
