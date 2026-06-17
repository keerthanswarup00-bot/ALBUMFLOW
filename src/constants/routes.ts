export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  ALBUMS: '/albums',
  ALBUM_DETAIL: '/albums/:albumId',
  ALBUM_EDIT: '/albums/:albumId/edit',
  ALBUM_NEW: '/albums/new',
  VIEW_ALBUM: '/view/:token',
  REVIEW_MANAGEMENT: '/review-management',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  RESET_PASSWORD: '/reset-password',
  ALBUM_UNAVAILABLE: '/album-unavailable',
} as const;

export function albumViewRoute(token: string) {
  return ROUTES.VIEW_ALBUM.replace(':token', token);
}
