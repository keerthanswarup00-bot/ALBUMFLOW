-- =====================================================
-- AlbumFlow Migration 001: Album Management
-- Adds event_type, new statuses, and storage fields
-- =====================================================

-- 1. Add new status values to the existing album_status enum
alter type album_status add value if not exists 'awaiting_review';
alter type album_status add value if not exists 'changes_requested';
alter type album_status add value if not exists 'approved';

-- Keep existing 'draft', 'active', 'archived' for compatibility.
-- 'archived' is used for soft-delete.

-- 2. Add event_type column to albums
alter table public.albums
  add column if not exists event_type text not null default 'wedding';

create index if not exists idx_albums_event_type on public.albums (event_type);

-- 3. Add image variant columns to album_pages (used in Phase 2)
alter table public.album_pages
  add column if not exists medium_url text;

alter table public.album_pages
  add column if not exists original_url text;
