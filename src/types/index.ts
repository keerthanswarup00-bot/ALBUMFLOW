export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  studio_name: string | null;
  studio_logo_url: string | null;
  phone: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  studio_name: string;
  owner_name: string;
  phone_number: string;
  studio_logo_url: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  designer_id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export type AlbumStatus = 'draft' | 'active' | 'awaiting_review' | 'changes_requested' | 'approved';
export type AlbumDbStatus = AlbumStatus | 'archived';

export type AlbumPhase = 'proofing' | 'review' | 'approved' | 'in_production';

export type EventType = 'wedding' | 'engagement' | 'reception' | 'birthday' | 'maternity' | 'custom';

export const EVENT_TYPES: EventType[] = [
  'wedding',
  'engagement',
  'reception',
  'birthday',
  'maternity',
  'custom',
];

export const ALBUM_STATUSES: AlbumStatus[] = [
  'draft',
  'active',
  'awaiting_review',
  'changes_requested',
  'approved',
];

export interface Album {
  id: string;
  designer_id: string;
  client_id: string | null;
  client_name: string;
  client_email: string;
  title: string;
  description: string | null;
  event_type: EventType;
  slug: string | null;
  cover_image_url: string | null;
  status: AlbumStatus | 'archived';
  phase: AlbumPhase;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export type AlbumFormData = {
  title: string;
  client_name: string;
  client_email: string;
  event_type: EventType;
  description: string;
  deadline: string;
};

export type AlbumVersionStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export interface AlbumVersion {
  id: string;
  album_id: string;
  version_number: number;
  label: string | null;
  status: AlbumVersionStatus;
  thumbnail_url: string | null;
  page_count: number;
  created_at: string;
  updated_at: string;
}

export type PageOrientation = 'portrait' | 'landscape';

export interface AlbumPage {
  id: string;
  album_version_id: string;
  page_number: number;
  spread_number: number;
  orientation: PageOrientation;
  image_url: string;
  thumbnail_url: string | null;
  medium_url: string | null;
  original_url: string | null;
  width: number;
  height: number;
  file_size: number;
  created_at: string;
}

export type RequestStatus = 'open' | 'resolved' | 'dismissed' | 'designer_review';
export type RequestType = 'change' | 'retouch' | 'layout' | 'other';

export interface RequestChange {
  id: string;
  album_id: string;
  page_id: string | null;
  reviewer_name: string;
  type: RequestType;
  description: string;
  status: RequestStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PageReview {
  id: string;
  page_id: string;
  album_id: string;
  reviewer_name: string;
  rating: number | null;
  notes: string | null;
  created_at: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Approval {
  id: string;
  album_id: string;
  album_version_id: string;
  client_name: string;
  client_email: string;
  status: ApprovalStatus;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  expires_at: number;
}
