export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ALBUMS: '/albums',
  ALBUM_DETAIL: '/albums/:albumId',
  ALBUM_EDIT: '/albums/:albumId/edit',
  ALBUM_NEW: '/albums/new',
  ALBUM_VIEWER: '/albums/:albumId/viewer',
  VIEW_ALBUM: '/view/:token',
  REVIEW_MANAGEMENT: '/review-management',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  RESET_PASSWORD: '/reset-password',
} as const;

export function albumViewRoute(token: string) {
  return ROUTES.VIEW_ALBUM.replace(':token', token);
}
