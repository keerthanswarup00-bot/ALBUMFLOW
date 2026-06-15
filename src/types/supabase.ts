import type {
  User,
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

export type Tables = {
  users: User;
  albums: Album;
  album_versions: AlbumVersion;
  album_pages: AlbumPage;
  requests: RequestChange;
  page_reviews: PageReview;
  approvals: Approval;
  share_links: ShareLink;
};

export type TableName = keyof Tables;

export type Insertable<T extends TableName> = Omit<Tables[T], 'id' | 'created_at' | 'updated_at'>;
export type Updatable<T extends TableName> = Partial<Insertable<T>>;
