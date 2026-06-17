import type {
  Profile,
  Album,
  AlbumVersion,
  AlbumPage,
  RequestChange,
  PageReview,
  Approval,
} from './index';
import type {
  ShareLink,
} from './viewer';
import type {
  Notification,
} from '@/services/supabase/notifications';
import type {
  ReviewAnalytics,
} from '@/services/supabase/analytics';

export type Tables = {
  profiles: Profile;
  albums: Album;
  album_versions: AlbumVersion;
  album_pages: AlbumPage;
  requests: RequestChange;
  page_reviews: PageReview;
  approvals: Approval;
  share_links: ShareLink;
  notifications: Notification;
  review_analytics: ReviewAnalytics;
};

export type TableName = keyof Tables;

export type Insertable<T extends TableName> = Omit<Tables[T], 'id' | 'created_at' | 'updated_at'>;
export type Updatable<T extends TableName> = Partial<Insertable<T>>;
