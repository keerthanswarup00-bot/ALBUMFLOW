import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/utils/cn';
import type { ReviewPage } from '@/types/viewer';

interface PageImageProps {
  page: ReviewPage;
  isActive: boolean;
  onLoad?: () => void;
  className?: string;
}

export function PageImage({ page, isActive, onLoad, className }: PageImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Load image immediately for active pages, lazy load via IntersectionObserver for others
  const load = isActive;

  useEffect(() => {
    if (load) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);

  // Show loading indicator when waiting for lazy load
  const isPending = !load && !loaded && !error;

  // Once loaded (either via active or intersection), keep showing the image
  // even if load becomes false (page scrolled away)
  const showImage = load || loaded;

  const src = showImage && !error ? (page.medium_url ?? page.image_url) : null;

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative flex items-center justify-center bg-gray-100', className)}
      style={{ aspectRatio: `${page.width} / ${page.height}` }}
    >
      {isPending && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-pulse rounded-full bg-gray-200" />
        </div>
      )}

      {src && (
        <img
          src={src}
          alt={`Page ${page.page_number}`}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'h-full w-full object-contain transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
          draggable={false}
        />
      )}

      {error && !isPending && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-xs text-gray-400">Failed to load image</p>
        </div>
      )}
    </div>
  );
}
