import WeddingAlbumViewer from './WeddingAlbumViewer';
import type { ReviewAlbum, ReviewPage } from '@/types/viewer';

interface AlbumViewerProps {
  album: ReviewAlbum;
  pages: ReviewPage[];
  studioName?: string;
  ownerName?: string;
  phoneNumber?: string;
}

export function AlbumViewer({ album, pages, studioName, ownerName, phoneNumber }: AlbumViewerProps) {
  return (
    <WeddingAlbumViewer
      ref={null}
      album={album}
      pages={pages}
      studioName={studioName ?? 'Studio'}
      ownerName={ownerName ?? ''}
      phoneNumber={phoneNumber ?? ''}
    />
  );
}
