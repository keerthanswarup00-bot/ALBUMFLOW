import WeddingAlbumViewer from './WeddingAlbumViewer';
import type { ReviewAlbum, ReviewPage } from '@/types/viewer';

interface AlbumViewerProps {
  album: ReviewAlbum;
  pages: ReviewPage[];
}

export function AlbumViewer({ album, pages }: AlbumViewerProps) {
  return (
    <WeddingAlbumViewer
      ref={null}
      album={album}
      pages={pages}
    />
  );
}
