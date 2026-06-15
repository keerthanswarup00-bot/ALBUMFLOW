import { PageImage } from './PageImage';
import { ZoomableImage } from './ZoomableImage';
import type { ReviewPage } from '@/types/viewer';

interface SinglePageProps {
  page: ReviewPage;
  isActive: boolean;
  isZoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}

export function SinglePage({ page, isActive, isZoomed, onZoomChange }: SinglePageProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-2">
      <ZoomableImage isZoomed={isZoomed} onZoomChange={onZoomChange}>
        <PageImage
          page={page}
          isActive={isActive}
          className="max-h-full w-auto"
        />
      </ZoomableImage>
    </div>
  );
}
