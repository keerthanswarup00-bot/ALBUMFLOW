import { PageImage } from './PageImage';
import { ZoomableImage } from './ZoomableImage';
import type { ReviewPage } from '@/types/viewer';

interface SpreadViewProps {
  pages: ReviewPage[];
  isActive: boolean;
  isZoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}

export function SpreadView({ pages, isActive, isZoomed, onZoomChange }: SpreadViewProps) {
  if (pages.length === 0) return null;

  return (
    <div className="flex h-full w-full items-center justify-center gap-1 px-1">
      {pages.map((page) => (
        <div key={page.id} className="flex flex-1 items-center justify-center">
          <ZoomableImage isZoomed={isZoomed} onZoomChange={onZoomChange}>
            <PageImage
              page={page}
              isActive={isActive}
              className="max-h-full w-full"
            />
          </ZoomableImage>
        </div>
      ))}
    </div>
  );
}
