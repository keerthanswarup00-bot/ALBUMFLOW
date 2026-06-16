export type ViewerMode = 'single' | 'spread';
export type ViewOrientation = 'portrait' | 'landscape';

export interface ReviewAlbum {
  id: string;
  title: string;
  client_name: string;
  event_type: string;
  status: string;
  phase: string;
  cover_image_url: string | null;
  created_at: string;
}

export interface ReviewVersion {
  id: string;
  version_number: number;
  label: string | null;
  status: string;
  page_count: number;
}

export interface ReviewPage {
  id: string;
  page_number: number;
  spread_number: number;
  orientation: 'portrait' | 'landscape';
  image_url: string;
  thumbnail_url: string | null;
  medium_url: string | null;
  original_url: string | null;
  width: number;
  height: number;
  file_size: number;
  full_image_url?: string;
  left_half_url?: string;
  right_half_url?: string;
}

export interface AlbumSpread {
  spreadId: string;
  fullImage: string;
  leftHalf: string;
  rightHalf: string;
  leftHalfWidth: number;
  leftHalfHeight: number;
  rightHalfWidth: number;
  rightHalfHeight: number;
}

export interface ReviewData {
  album: ReviewAlbum;
  version: ReviewVersion | null;
  pages: ReviewPage[];
}

export interface ViewerAnalytics {
  pagesViewed: number[];
  totalViewingTime: number;
  lastViewedPage: number;
  startedAt: number;
}

export interface ViewerState {
  album: ReviewAlbum | null;
  version: ReviewVersion | null;
  pages: ReviewPage[];
  currentPage: number;
  totalPages: number;
  mode: ViewerMode;
  isZoomed: boolean;
  isFullscreen: boolean;
  isHelpOpen: boolean;
  isLoading: boolean;
  error: string | null;
  analytics: ViewerAnalytics;
}

export type PageReviewStatus = 'viewed' | 'reviewed';

export interface AlbumReviewEntry {
  page_number: number;
  status: PageReviewStatus;
  updated_at: number;
}

export interface AlbumReviewData {
  album_id: string;
  total_pages: number;
  pages: Record<number, AlbumReviewEntry>;
  updated_at: number;
  approved_at?: number;
}

export type RequestChangeCategory = 'general' | 'pin';
export type RequestChangeStatus = 'open' | 'resolved' | 'designer_review';

export interface PinPlacement {
  xPercent: number;
  yPercent: number;
  label: string;
}

export interface ViewerRequestChange {
  id: string;
  album_id: string;
  page_number: number;
  category: RequestChangeCategory;
  message: string;
  pin: PinPlacement | null;
  status: RequestChangeStatus;
  submitted: boolean;
  created_at: number;
  updated_at: number;
}

export interface VoiceRequest {
  id: string;
  album_id: string;
  page_number: number;
  duration: number;
  audioData: string;
  created_at: number;
  status: RequestChangeStatus;
}

export interface RequestDraft {
  category: RequestChangeCategory;
  message: string;
  pin: PinPlacement | null;
  saved_at: number;
}

export interface VoiceDraft {
  duration: number;
  audioData: string;
  saved_at: number;
}

// Review Cycle Types
export type ReviewCycleStatus =
  | 'draft_review'
  | 'review_submitted'
  | 'designer_reviewing'
  | 'album_updated'
  | 'approved';

export const REVIEW_CYCLE_LABELS: Record<ReviewCycleStatus, string> = {
  draft_review: 'Draft Review',
  review_submitted: 'Review Submitted',
  designer_reviewing: 'Designer Reviewing',
  album_updated: 'Album Updated',
  approved: 'Approved',
};

export const REVIEW_CYCLE_STYLES: Record<ReviewCycleStatus, string> = {
  draft_review: 'bg-gray-100 text-gray-700',
  review_submitted: 'bg-blue-100 text-blue-700',
  designer_reviewing: 'bg-amber-100 text-amber-700',
  album_updated: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
};

export interface AlbumUpdate {
  id: string;
  album_id: string;
  update_number: number;
  label: string;
  notes: string;
  pages: AlbumUpdatePage[];
  page_count: number;
  created_at: number;
}

export interface AlbumUpdatePage {
  page_number: number;
  image_url: string;
  thumbnail_url: string | null;
  width: number;
  height: number;
}

export interface TimelineEntry {
  id: string;
  album_id: string;
  type: 'album_created' | 'review_submitted' | 'album_updated' | 'update_reviewed' | 'approved';
  description: string;
  timestamp: number;
}

export interface ApprovalRecord {
  album_id: string;
  approved_at: number;
  checklist: ApprovalChecklistItem[];
}

export interface ApprovalChecklistItem {
  label: string;
  checked: boolean;
}

// Share Link Types
export interface ShareLink {
  id: string;
  album_id: string;
  token: string;
  label: string | null;
  expires_at: string | null;
  max_access_count: number | null;
  access_count: number;
  last_accessed_at: string | null;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateShareLinkInput {
  album_id: string;
  label?: string;
  expires_in_days?: number;
  max_access_count?: number;
}

export interface DesignerReviewAlbum {
  albumId: string;
  albumTitle: string;
  clientName: string;
  status: ReviewCycleStatus;
  pagesReviewed: number;
  totalPages: number;
  totalRequests: number;
  voiceMessages: number;
  submittedAt: number | null;
  updatedAt: number | null;
}
