export const APP_CONFIG = {
  name: 'AlbumFlow',
  description: 'Wedding album proofing made simple',
  version: '1.0.0',
  storage: {
    albums: 'albums',
    thumbnails: 'thumbnails',
    originals: 'originals',
    medium: 'medium',
    avatars: 'avatars',
    maxFileSize: 50 * 1024 * 1024,
    acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  },
  images: {
    thumbnailMaxWidth: 300,
    mediumMaxWidth: 1200,
    thumbnailQuality: 0.7,
    mediumQuality: 0.85,
    originalQuality: 0.92,
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
} as const;
