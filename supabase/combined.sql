-- Reset public schema for idempotent re-run
drop schema if exists public cascade; create schema public;

-- =====================================================
-- AlbumFlow Database Schema
-- PostgreSQL for Supabase
-- =====================================================

-- 0. EXTENSIONS
-- =====================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Restore schema + default privileges lost when public schema was recreated
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- =====================================================
-- 1. USERS
-- Designers only. Clients never have accounts.
-- =====================================================
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text not null,
  avatar_url text,
  studio_name text,
  studio_logo_url text,
  phone text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Syncs auth.users -> public.users on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Indexes
create index if not exists idx_users_email on public.users (email);

-- =====================================================
-- 2. CLIENTS
-- Client records for couples (no auth accounts)
-- =====================================================
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  designer_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(designer_id, email)
);

create index if not exists idx_clients_designer on public.clients (designer_id);
create index if not exists idx_clients_email on public.clients (email);

-- =====================================================
-- 3. ALBUMS
-- Each album belongs to a designer and has a client
-- =====================================================
do $$ begin
  create type album_status as enum ('draft', 'active', 'archived');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type album_phase as enum ('proofing', 'review', 'approved', 'in_production');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.albums (
  id uuid primary key default uuid_generate_v4(),
  designer_id uuid not null references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_email text not null,
  title text not null,
  description text,
  cover_image_url text,
  status album_status not null default 'draft',
  phase album_phase not null default 'proofing',
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_albums_designer on public.albums (designer_id);
create index if not exists idx_albums_status on public.albums (status);
create index if not exists idx_albums_phase on public.albums (phase);
create index if not exists idx_albums_created on public.albums (created_at desc);

-- =====================================================
-- 4. ALBUM VERSIONS
-- Versioned iterations of an album (v1, v2, v3...)
-- =====================================================
do $$ begin
  create type album_version_status as enum ('uploading', 'processing', 'ready', 'failed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.album_versions (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  version_number integer not null,
  label text,
  status album_version_status not null default 'uploading',
  thumbnail_url text,
  page_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id, version_number)
);

create index if not exists idx_versions_album on public.album_versions (album_id);
create index if not exists idx_versions_status on public.album_versions (status);

-- =====================================================
-- 5. ALBUM PAGES
-- Individual pages/spreads within a version
-- =====================================================
do $$ begin
  create type page_orientation as enum ('portrait', 'landscape');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.album_pages (
  id uuid primary key default uuid_generate_v4(),
  album_version_id uuid not null references public.album_versions(id) on delete cascade,
  page_number integer not null,
  spread_number integer not null,
  orientation page_orientation not null default 'portrait',
  image_url text not null,
  thumbnail_url text,
  width integer not null,
  height integer not null,
  file_size bigint not null,
  created_at timestamptz not null default now(),
  unique(album_version_id, page_number)
);

create index if not exists idx_pages_version on public.album_pages (album_version_id);
create index if not exists idx_pages_spread on public.album_pages (album_version_id, spread_number);

-- =====================================================
-- 6. REQUESTS (Change Requests)
-- Client feedback and change requests on pages
-- =====================================================
do $$ begin
  create type request_status as enum ('open', 'resolved', 'dismissed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type request_type as enum ('change', 'retouch', 'layout', 'other');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.requests (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  page_id uuid references public.album_pages(id) on delete set null,
  reviewer_name text not null,
  type request_type not null default 'change',
  description text not null,
  status request_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_requests_album on public.requests (album_id);
create index if not exists idx_requests_page on public.requests (page_id);
create index if not exists idx_requests_status on public.requests (status);

-- =====================================================
-- 7. PAGE REVIEWS
-- Per-page ratings and notes from clients
-- =====================================================
create table if not exists public.page_reviews (
  id uuid primary key default uuid_generate_v4(),
  page_id uuid not null references public.album_pages(id) on delete cascade,
  album_id uuid not null references public.albums(id) on delete cascade,
  reviewer_name text not null,
  rating smallint check (rating >= 1 and rating <= 5),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_page on public.page_reviews (page_id);
create index if not exists idx_reviews_album on public.page_reviews (album_id);

-- =====================================================
-- 8. APPROVALS
-- Final album approval with client signature
-- =====================================================
do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.approvals (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  album_version_id uuid not null references public.album_versions(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  status approval_status not null default 'pending',
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id, album_version_id)
);

create index if not exists idx_approvals_album on public.approvals (album_id);
create index if not exists idx_approvals_status on public.approvals (status);

-- =====================================================
-- 9. ROW LEVEL SECURITY
-- Enforce multi-tenant isolation by designer_id
-- =====================================================

-- Helper: get current user's id
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select id from public.users where id = auth.uid()
$$;

-- Albums: designers own their albums
alter table public.albums enable row level security;

drop policy if exists "Designers can manage their own albums" on public.albums;
create policy "Designers can manage their own albums"
  on public.albums
  using (designer_id = auth.uid());

-- Album versions inherit from album
alter table public.album_versions enable row level security;

drop policy if exists "Designers can manage versions of their albums" on public.album_versions;
create policy "Designers can manage versions of their albums"
  on public.album_versions
  using (
    exists (
      select 1 from public.albums
      where albums.id = album_versions.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- Album pages inherit through version -> album
alter table public.album_pages enable row level security;

drop policy if exists "Designers can manage pages of their albums" on public.album_pages;
create policy "Designers can manage pages of their albums"
  on public.album_pages
  using (
    exists (
      select 1 from public.album_versions
      join public.albums on albums.id = album_versions.album_id
      where album_versions.id = album_pages.album_version_id
      and albums.designer_id = auth.uid()
    )
  );

-- Requests: designers can manage requests on their albums
alter table public.requests enable row level security;

drop policy if exists "Designers can manage requests on their albums" on public.requests;
create policy "Designers can manage requests on their albums"
  on public.requests
  using (
    exists (
      select 1 from public.albums
      where albums.id = requests.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- Page reviews: designers can view reviews on their albums
alter table public.page_reviews enable row level security;

drop policy if exists "Designers can manage reviews on their albums" on public.page_reviews;
create policy "Designers can manage reviews on their albums"
  on public.page_reviews
  using (
    exists (
      select 1 from public.albums
      where albums.id = page_reviews.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- Approvals: designers can manage approvals on their albums
alter table public.approvals enable row level security;

drop policy if exists "Designers can manage approvals on their albums" on public.approvals;
create policy "Designers can manage approvals on their albums"
  on public.approvals
  using (
    exists (
      select 1 from public.albums
      where albums.id = approvals.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- Users: designers can only see their own profile
alter table public.users enable row level security;

drop policy if exists "Users can manage their own profile" on public.users;
create policy "Users can manage their own profile"
  on public.users
  using (id = auth.uid());

-- Clients: designers can manage their own clients
alter table public.clients enable row level security;

drop policy if exists "Designers can manage their own clients" on public.clients;
create policy "Designers can manage their own clients"
  on public.clients
  using (designer_id = auth.uid());

-- =====================================================
-- 10. UPDATED_AT TRIGGER
-- Auto-update updated_at timestamp on row changes
-- =====================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_albums_updated_at on public.albums;
create trigger trg_albums_updated_at
  before update on public.albums
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_album_versions_updated_at on public.album_versions;
create trigger trg_album_versions_updated_at
  before update on public.album_versions
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at
  before update on public.requests
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_approvals_updated_at on public.approvals;
create trigger trg_approvals_updated_at
  before update on public.approvals
  for each row execute function public.handle_updated_at();
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
-- =====================================================
-- AlbumFlow Migration 002: Public Review Functions
-- Creates SECURITY DEFINER functions so the anon key
-- can fetch album data for the public review page.
-- =====================================================

-- 1. Fetch complete review data for an album (no auth required)
create or replace function public.get_album_review_data(album_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  version_id uuid;
  album_json json;
  version_json json;
  pages_json json;
begin
  -- Fetch album (limited public fields)
  select row_to_json(t.*) into album_json
  from (
    select id, title, client_name, event_type, status, cover_image_url, created_at
    from public.albums
    where id = album_id
  ) t;

  if album_json is null then
    return null;
  end if;

  -- Get latest version id
  select av.id into version_id
  from public.album_versions av
  where av.album_id = album_id
  order by av.version_number desc
  limit 1;

  if version_id is not null then
    -- Fetch version
    select row_to_json(t.*) into version_json
    from (
      select id, version_number, label, status, page_count
      from public.album_versions
      where id = version_id
    ) t;

    -- Fetch pages ordered by page_number
    select json_agg(t.* order by t.page_number) into pages_json
    from (
      select id, page_number, spread_number, orientation,
             image_url, thumbnail_url, medium_url, original_url,
             width, height, file_size
      from public.album_pages
      where album_version_id = version_id
    ) t;
  end if;

  return json_build_object(
    'album', album_json,
    'version', version_json,
    'pages', coalesce(pages_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_album_review_data to anon;
grant execute on function public.get_album_review_data to authenticated;
-- =====================================================
-- AlbumFlow Complete Schema & Migration (v2)
-- Fixes: unambiguous variable names in functions
-- =====================================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Clear any functions from prior competing 003 schema versions
drop function if exists public.validate_share_token(text) cascade;
drop function if exists public.get_album_by_token(text) cascade;
drop function if exists public.get_album_review_data(uuid) cascade;

-- =====================================================
-- 1. ENUMS
-- =====================================================
do $$ begin
  create type album_status as enum ('draft', 'active', 'archived', 'awaiting_review', 'changes_requested', 'approved');
exception when duplicate_object then
  alter type album_status add value if not exists 'awaiting_review';
  alter type album_status add value if not exists 'changes_requested';
  alter type album_status add value if not exists 'approved';
end $$;

do $$ begin
  create type album_phase as enum ('proofing', 'review', 'approved', 'in_production');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type album_version_status as enum ('uploading', 'processing', 'ready', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type page_orientation as enum ('portrait', 'landscape');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type request_status as enum ('open', 'resolved', 'dismissed', 'designer_review');
exception when duplicate_object then
  alter type request_status add value if not exists 'designer_review';
end $$;

do $$ begin
  create type request_type as enum ('change', 'retouch', 'layout', 'other');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type approval_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

-- =====================================================
-- 2. BASE TABLES
-- =====================================================
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  full_name text not null,
  avatar_url text,
  studio_name text,
  studio_logo_url text,
  phone text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  designer_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(designer_id, email)
);

create table if not exists public.albums (
  id uuid primary key default uuid_generate_v4(),
  designer_id uuid not null references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  client_email text not null,
  title text not null,
  description text,
  event_type text not null default 'wedding',
  cover_image_url text,
  status album_status not null default 'draft',
  phase album_phase not null default 'proofing',
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.album_versions (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  version_number integer not null,
  label text,
  status album_version_status not null default 'uploading',
  thumbnail_url text,
  page_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id, version_number)
);

create table if not exists public.album_pages (
  id uuid primary key default uuid_generate_v4(),
  album_version_id uuid not null references public.album_versions(id) on delete cascade,
  page_number integer not null,
  spread_number integer not null,
  orientation page_orientation not null default 'portrait',
  image_url text not null,
  thumbnail_url text,
  medium_url text,
  original_url text,
  width integer not null,
  height integer not null,
  file_size bigint not null,
  created_at timestamptz not null default now(),
  unique(album_version_id, page_number)
);

create table if not exists public.requests (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  page_id uuid references public.album_pages(id) on delete set null,
  reviewer_name text not null,
  type request_type not null default 'change',
  description text not null,
  status request_status not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.page_reviews (
  id uuid primary key default uuid_generate_v4(),
  page_id uuid not null references public.album_pages(id) on delete cascade,
  album_id uuid not null references public.albums(id) on delete cascade,
  reviewer_name text not null,
  rating smallint check (rating >= 1 and rating <= 5),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  album_version_id uuid not null references public.album_versions(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  status approval_status not null default 'pending',
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id, album_version_id)
);

-- =====================================================
-- 3. SHARE LINKS
-- =====================================================
create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  token text not null unique,
  label text,
  expires_at timestamptz,
  max_access_count integer,
  access_count integer not null default 0,
  last_accessed_at timestamptz,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

-- =====================================================
-- 4. MISSING TABLES
-- =====================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  page_number integer,
  author_id uuid references public.users(id) on delete set null,
  author_name text not null,
  body text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revisions (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  version_id uuid references public.album_versions(id) on delete set null,
  revision_type text not null,
  description text not null,
  created_by uuid references public.users(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create table if not exists public.album_settings (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade unique,
  allow_download boolean not null default false,
  require_review_signature boolean not null default false,
  auto_notify_on_update boolean not null default true,
  review_deadline_days integer default 14,
  watermark_preview boolean not null default false,
  custom_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 5. INDEXES
-- =====================================================
create index if not exists idx_users_email on public.users (email);
create index if not exists idx_clients_designer on public.clients (designer_id);
create index if not exists idx_clients_email on public.clients (email);
create index if not exists idx_albums_designer on public.albums (designer_id);
create index if not exists idx_albums_status on public.albums (status);
create index if not exists idx_albums_phase on public.albums (phase);
create index if not exists idx_albums_created on public.albums (created_at desc);
create index if not exists idx_albums_event_type on public.albums (event_type);
create index if not exists idx_versions_album on public.album_versions (album_id);
create index if not exists idx_versions_status on public.album_versions (status);
create index if not exists idx_pages_version on public.album_pages (album_version_id);
create index if not exists idx_pages_spread on public.album_pages (album_version_id, spread_number);
create index if not exists idx_requests_album on public.requests (album_id);
create index if not exists idx_requests_page on public.requests (page_id);
create index if not exists idx_requests_status on public.requests (status);
create index if not exists idx_reviews_page on public.page_reviews (page_id);
create index if not exists idx_reviews_album on public.page_reviews (album_id);
create index if not exists idx_approvals_album on public.approvals (album_id);
create index if not exists idx_approvals_status on public.approvals (status);
create index if not exists idx_share_links_token on public.share_links (token);
create index if not exists idx_share_links_album on public.share_links (album_id);
create index if not exists idx_share_links_created_by on public.share_links (created_by);
create index if not exists idx_comments_album on public.comments (album_id);
create index if not exists idx_comments_page on public.comments (album_id, page_number);
create index if not exists idx_comments_parent on public.comments (parent_id);
create index if not exists idx_revisions_album on public.revisions (album_id);
create index if not exists idx_revisions_type on public.revisions (album_id, revision_type);
create index if not exists idx_revisions_created on public.revisions (album_id, created_at desc);
create index if not exists idx_activity_logs_album on public.activity_logs (album_id);
create index if not exists idx_activity_logs_actor on public.activity_logs (actor_id);
create index if not exists idx_activity_logs_action on public.activity_logs (action);
create index if not exists idx_activity_logs_created on public.activity_logs (created_at desc);
create index if not exists idx_album_settings_album on public.album_settings (album_id);

-- =====================================================
-- 6. VALIDATION FUNCTION (UNAMBIGUOUS VARIABLE NAMES)
-- =====================================================
create or replace function public.validate_share_token(p_token text)
returns uuid
language plpgsql
stable
as $$
declare
  v_album_id uuid;
begin
  select sl.album_id into v_album_id
  from public.share_links sl
  where sl.token = p_token
    and sl.revoked_at is null
    and (sl.expires_at is null or sl.expires_at > now())
    and (sl.max_access_count is null or sl.access_count < sl.max_access_count);
  return v_album_id;
end;
$$;

grant execute on function public.validate_share_token to anon;
grant execute on function public.validate_share_token to authenticated;

-- =====================================================
-- 7. TOKEN-BASED REVIEW DATA RPC
-- =====================================================
create or replace function public.get_album_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_version_id uuid;
  v_album_json json;
  v_version_json json;
  v_pages_json json;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  update public.share_links
  set access_count = access_count + 1, last_accessed_at = now()
  where token = p_token;

  select row_to_json(t.*) into v_album_json
  from (
    select a.id, a.title, a.client_name, a.event_type, a.status, a.cover_image_url, a.created_at
    from public.albums a
    where a.id = v_album_id
  ) t;

  if v_album_json is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
    and av.status = 'ready'
  order by av.version_number desc
  limit 1;

  if v_version_id is not null then
    select row_to_json(t.*) into v_version_json
    from (
      select v.id, v.version_number, v.label, v.status, v.page_count
      from public.album_versions v
      where v.id = v_version_id
    ) t;

    select json_agg(t.* order by t.page_number) into v_pages_json
    from (
      select p.id, p.page_number, p.spread_number, p.orientation,
             p.image_url, p.thumbnail_url, p.medium_url, p.original_url,
             p.width, p.height, p.file_size
      from public.album_pages p
      where p.album_version_id = v_version_id
    ) t;
  end if;

  return json_build_object(
    'album', v_album_json,
    'version', v_version_json,
    'pages', coalesce(v_pages_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_album_by_token to anon;
grant execute on function public.get_album_by_token to authenticated;

-- Legacy function (backward compat with old /review/:albumId route)
create or replace function public.get_album_review_data(p_album_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version_id uuid;
  v_album_json json;
  v_version_json json;
  v_pages_json json;
begin
  select row_to_json(t.*) into v_album_json
  from (
    select a.id, a.title, a.client_name, a.event_type, a.status, a.cover_image_url, a.created_at
    from public.albums a
    where a.id = p_album_id
  ) t;

  if v_album_json is null then return null; end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = p_album_id
  order by av.version_number desc
  limit 1;

  if v_version_id is not null then
    select row_to_json(t.*) into v_version_json
    from (
      select v.id, v.version_number, v.label, v.status, v.page_count
      from public.album_versions v
      where v.id = v_version_id
    ) t;

    select json_agg(t.* order by t.page_number) into v_pages_json
    from (
      select p.id, p.page_number, p.spread_number, p.orientation,
             p.image_url, p.thumbnail_url, p.medium_url, p.original_url,
             p.width, p.height, p.file_size
      from public.album_pages p
      where p.album_version_id = v_version_id
    ) t;
  end if;

  return json_build_object(
    'album', v_album_json,
    'version', v_version_json,
    'pages', coalesce(v_pages_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_album_review_data to anon;
grant execute on function public.get_album_review_data to authenticated;

-- =====================================================
-- 8. USER AUTO-CREATION TRIGGER
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 9. UPDATED_AT TRIGGERS
-- =====================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_albums_updated_at on public.albums;
create trigger trg_albums_updated_at
  before update on public.albums
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_album_versions_updated_at on public.album_versions;
create trigger trg_album_versions_updated_at
  before update on public.album_versions
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_requests_updated_at on public.requests;
create trigger trg_requests_updated_at
  before update on public.requests
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_approvals_updated_at on public.approvals;
create trigger trg_approvals_updated_at
  before update on public.approvals
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_album_settings_updated_at on public.album_settings;
create trigger trg_album_settings_updated_at
  before update on public.album_settings
  for each row execute function public.handle_updated_at();

-- =====================================================
-- 10. HELPER FUNCTIONS FOR RLS
-- =====================================================
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select id from public.users where id = auth.uid()
$$;

create or replace function public.album_has_valid_share_link(p_album_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.share_links sl
    where sl.album_id = p_album_id
      and sl.revoked_at is null
      and (sl.expires_at is null or sl.expires_at > now())
  );
$$;

-- =====================================================
-- 11. ROW LEVEL SECURITY
-- =====================================================

-- USERS
alter table public.users enable row level security;
drop policy if exists "Users can manage their own profile" on public.users;
create policy "Users can manage their own profile"
  on public.users using (id = auth.uid());

-- CLIENTS
alter table public.clients enable row level security;
drop policy if exists "Designers can manage their own clients" on public.clients;
create policy "Designers can manage their own clients"
  on public.clients using (designer_id = auth.uid());

-- ALBUMS
alter table public.albums enable row level security;
drop policy if exists "Designers can manage their own albums" on public.albums;
drop policy if exists "Public can view albums via valid share token" on public.albums;
create policy "Designers can manage their own albums"
  on public.albums using (designer_id = auth.uid());
create policy "Public can view albums via valid share token"
  on public.albums for select
  using (designer_id = auth.uid() or public.album_has_valid_share_link(id));

-- ALBUM VERSIONS
alter table public.album_versions enable row level security;
drop policy if exists "Designers can manage versions of their albums" on public.album_versions;
drop policy if exists "Public can view versions via valid share token" on public.album_versions;
create policy "Designers can manage versions of their albums"
  on public.album_versions
  using (exists (select 1 from public.albums a where a.id = album_versions.album_id and a.designer_id = auth.uid()));
create policy "Public can view versions via valid share token"
  on public.album_versions for select
  using (exists (select 1 from public.albums a where a.id = album_versions.album_id and (a.designer_id = auth.uid() or public.album_has_valid_share_link(a.id))));

-- ALBUM PAGES
alter table public.album_pages enable row level security;
drop policy if exists "Designers can manage pages of their albums" on public.album_pages;
drop policy if exists "Public can view pages via valid share token" on public.album_pages;
create policy "Designers can manage pages of their albums"
  on public.album_pages
  using (exists (
    select 1 from public.album_versions av
    join public.albums a on a.id = av.album_id
    where av.id = album_pages.album_version_id and a.designer_id = auth.uid()
  ));
create policy "Public can view pages via valid share token"
  on public.album_pages for select
  using (exists (
    select 1 from public.album_versions av
    join public.albums a on a.id = av.album_id
    where av.id = album_pages.album_version_id
    and (a.designer_id = auth.uid() or public.album_has_valid_share_link(a.id))
  ));

-- REQUESTS
alter table public.requests enable row level security;
drop policy if exists "Designers can manage requests on their albums" on public.requests;
create policy "Designers can manage requests on their albums"
  on public.requests
  using (exists (select 1 from public.albums a where a.id = requests.album_id and a.designer_id = auth.uid()));

-- PAGE REVIEWS
alter table public.page_reviews enable row level security;
drop policy if exists "Designers can manage reviews on their albums" on public.page_reviews;
create policy "Designers can manage reviews on their albums"
  on public.page_reviews
  using (exists (select 1 from public.albums a where a.id = page_reviews.album_id and a.designer_id = auth.uid()));

-- APPROVALS
alter table public.approvals enable row level security;
drop policy if exists "Designers can manage approvals on their albums" on public.approvals;
create policy "Designers can manage approvals on their albums"
  on public.approvals
  using (exists (select 1 from public.albums a where a.id = approvals.album_id and a.designer_id = auth.uid()));

-- SHARE LINKS
alter table public.share_links enable row level security;
drop policy if exists "Designers can manage share links on their albums" on public.share_links;
drop policy if exists "Anyone can read valid share links for token check" on public.share_links;
create policy "Designers can manage share links on their albums"
  on public.share_links
  using (exists (select 1 from public.albums a where a.id = share_links.album_id and a.designer_id = auth.uid()));
create policy "Anyone can read valid share links for token check"
  on public.share_links for select
  using (revoked_at is null and (expires_at is null or expires_at > now()));

-- COMMENTS
alter table public.comments enable row level security;
drop policy if exists "Designers can manage comments on their albums" on public.comments;
create policy "Designers can manage comments on their albums"
  on public.comments
  using (exists (select 1 from public.albums a where a.id = comments.album_id and a.designer_id = auth.uid()));
create policy "Clients with valid share token can read comments"
  on public.comments for select
  using (false);

-- REVISIONS
alter table public.revisions enable row level security;
drop policy if exists "Designers can manage revisions on their albums" on public.revisions;
create policy "Designers can manage revisions on their albums"
  on public.revisions
  using (exists (select 1 from public.albums a where a.id = revisions.album_id and a.designer_id = auth.uid()));

-- ACTIVITY LOGS
alter table public.activity_logs enable row level security;
drop policy if exists "Designers can view activity logs on their albums" on public.activity_logs;
drop policy if exists "System can insert activity logs" on public.activity_logs;
create policy "Designers can view activity logs on their albums"
  on public.activity_logs for select
  using (exists (select 1 from public.albums a where a.id = activity_logs.album_id and a.designer_id = auth.uid()));
create policy "System can insert activity logs"
  on public.activity_logs for insert
  with check (true);

-- ALBUM SETTINGS
alter table public.album_settings enable row level security;
drop policy if exists "Designers can manage settings on their albums" on public.album_settings;
create policy "Designers can manage settings on their albums"
  on public.album_settings
  using (exists (select 1 from public.albums a where a.id = album_settings.album_id and a.designer_id = auth.uid()));
-- =====================================================
-- AlbumFlow Migration 004: Fix Ambiguous Column References
-- Fixes: "column reference album_id is ambiguous" in
-- get_album_by_token and get_album_review_data
-- Also fixes validate_share_token to handle anon calls
-- =====================================================

-- =====================================================
-- 1. Fix validate_share_token
-- Makes it security definer so anon can validate tokens
-- Uses v_ prefix for local variable to avoid ambiguity
-- =====================================================
drop function if exists public.validate_share_token(text) cascade;
create or replace function public.validate_share_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_result_id uuid;
begin
  select sl.album_id into v_result_id
  from public.share_links sl
  where sl.token = p_token
    and sl.revoked_at is null
    and (sl.expires_at is null or sl.expires_at > now())
    and (sl.max_access_count is null or sl.access_count < sl.max_access_count);
  return v_result_id;
end;
$$;

grant execute on function public.validate_share_token to anon;
grant execute on function public.validate_share_token to authenticated;

-- =====================================================
-- 2. Fix get_album_by_token
-- Uses v_ prefix for local variables to avoid
-- ambiguity with av.album_id column reference
-- =====================================================
drop function if exists public.get_album_by_token(text) cascade;
create or replace function public.get_album_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_version_id uuid;
  v_album_json json;
  v_version_json json;
  v_pages_json json;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  update public.share_links
  set access_count = access_count + 1, last_accessed_at = now()
  where token = p_token;

  select row_to_json(t.*) into v_album_json
  from (
    select a.id, a.title, a.client_name, a.event_type, a.status, a.cover_image_url, a.created_at
    from public.albums a
    where a.id = v_album_id
  ) t;

  if v_album_json is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
    and av.status = 'ready'
  order by av.version_number desc
  limit 1;

  if v_version_id is not null then
    select row_to_json(t.*) into v_version_json
    from (
      select v.id, v.version_number, v.label, v.status, v.page_count
      from public.album_versions v
      where v.id = v_version_id
    ) t;

    select json_agg(t.* order by t.page_number) into v_pages_json
    from (
      select p.id, p.page_number, p.spread_number, p.orientation,
             p.image_url, p.thumbnail_url, p.medium_url, p.original_url,
             p.width, p.height, p.file_size
      from public.album_pages p
      where p.album_version_id = v_version_id
    ) t;
  end if;

  return json_build_object(
    'album', v_album_json,
    'version', v_version_json,
    'pages', coalesce(v_pages_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_album_by_token to anon;
grant execute on function public.get_album_by_token to authenticated;

-- =====================================================
-- 3. Fix get_album_review_data (backward compat)
-- Same variable prefix fix for consistency
-- =====================================================
drop function if exists public.get_album_review_data(uuid) cascade;
create or replace function public.get_album_review_data(p_album_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid := p_album_id;
  v_version_id uuid;
  v_album_json json;
  v_version_json json;
  v_pages_json json;
begin
  select row_to_json(t.*) into v_album_json
  from (
    select a.id, a.title, a.client_name, a.event_type, a.status, a.cover_image_url, a.created_at
    from public.albums a
    where a.id = v_album_id
  ) t;

  if v_album_json is null then return null; end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
  order by av.version_number desc
  limit 1;

  if v_version_id is not null then
    select row_to_json(t.*) into v_version_json
    from (
      select v.id, v.version_number, v.label, v.status, v.page_count
      from public.album_versions v
      where v.id = v_version_id
    ) t;

    select json_agg(t.* order by t.page_number) into v_pages_json
    from (
      select p.id, p.page_number, p.spread_number, p.orientation,
             p.image_url, p.thumbnail_url, p.medium_url, p.original_url,
             p.width, p.height, p.file_size
      from public.album_pages p
      where p.album_version_id = v_version_id
    ) t;
  end if;

  return json_build_object(
    'album', v_album_json,
    'version', v_version_json,
    'pages', coalesce(v_pages_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_album_review_data to anon;
grant execute on function public.get_album_review_data to authenticated;
-- =====================================================
-- AlbumFlow Migration 005: Album-Level Review Workflow
-- Adds: submit for review, approve all, request changes
-- =====================================================

-- =====================================================
-- 1. Submit album for review (designer action)
-- =====================================================
create or replace function public.submit_album_for_review(p_album_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album record;
begin
  select a.id, a.status, a.phase, a.designer_id
  into v_album
  from public.albums a
  where a.id = p_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  if v_album.designer_id <> auth.uid() then
    return json_build_object('error', 'not_authorized');
  end if;

  update public.albums
  set status = 'awaiting_review',
      phase = 'review',
      updated_at = now()
  where id = p_album_id;

  return json_build_object('success', true, 'status', 'awaiting_review');
end;
$$;

grant execute on function public.submit_album_for_review to authenticated;

-- =====================================================
-- 2. Approve album (client action via share token)
-- =====================================================
create or replace function public.approve_album(
  p_token text,
  p_client_name text,
  p_client_email text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_version_id uuid;
  v_album record;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  select a.id, a.status, a.phase into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
  order by av.version_number desc
  limit 1;

  insert into public.approvals (album_id, album_version_id, client_name, client_email, status, signed_at)
  values (v_album_id, v_version_id, p_client_name, p_client_email, 'approved', now());

  update public.albums
  set status = 'approved',
      phase = 'approved',
      updated_at = now()
  where id = v_album_id;

  return json_build_object('success', true, 'status', 'approved');
end;
$$;

grant execute on function public.approve_album to anon;
grant execute on function public.approve_album to authenticated;

-- =====================================================
-- 3. Request changes at album level (client action via share token)
-- =====================================================
create or replace function public.request_album_changes(
  p_token text,
  p_description text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_album record;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  select a.id, a.title into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  insert into public.requests (album_id, page_id, reviewer_name, type, description, status)
  values (v_album_id, null, 'Client', 'change', p_description, 'open');

  update public.albums
  set status = 'changes_requested',
      updated_at = now()
  where id = v_album_id;

  return json_build_object('success', true, 'status', 'changes_requested');
end;
$$;

grant execute on function public.request_album_changes to anon;
grant execute on function public.request_album_changes to authenticated;
-- =====================================================
-- AlbumFlow Migration 006: Profiles table, album slugs,
-- deleted album contact page, slug-based routing
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  studio_name text not null default '',
  owner_name text not null default '',
  phone_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_user_id on public.profiles (user_id);

-- =====================================================
-- 2. ALBUM SLUG
-- =====================================================
alter table public.albums add column if not exists slug text;

create unique index if not exists idx_albums_slug_designer on public.albums (designer_id, slug);

-- =====================================================
-- 3. UPDATE HANDLE_NEW_USER TO CREATE PROFILE
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url, studio_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce(new.raw_user_meta_data ->> 'studio_name', '')
  );

  insert into public.profiles (user_id, studio_name, owner_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'studio_name', ''),
    coalesce(new.raw_user_meta_data ->> 'owner_name', coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  );

  return new;
end;
$$;

-- =====================================================
-- 4. RLS FOR PROFILES
-- =====================================================
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (user_id = auth.uid());

-- =====================================================
-- 5. UPDATE GET_ALBUM_BY_TOKEN FOR DELETED ALBUMS
-- Drop first because prior migrations may have used a
-- different parameter name (token_text vs p_token)
-- =====================================================
drop function if exists public.get_album_by_token(text);
create or replace function public.get_album_by_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_album_json json;
  v_version_id uuid;
  v_version_json json;
  v_pages_json json;
  v_album_status text;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  update public.share_links
  set access_count = access_count + 1, last_accessed_at = now()
  where token = p_token;

  select a.status::text into v_album_status
  from public.albums a
  where a.id = v_album_id;

  if v_album_status = 'archived' then
    select row_to_json(t.*) into v_album_json
    from (
      select a.id, a.title, a.client_name, a.event_type, a.status::text, a.cover_image_url, a.created_at, a.designer_id
      from public.albums a
      where a.id = v_album_id
    ) t;

    return json_build_object(
      'error', 'album_deleted',
      'album', v_album_json
    );
  end if;

  select row_to_json(t.*) into v_album_json
  from (
    select a.id, a.designer_id, a.title, a.client_name, a.event_type, a.status::text, a.phase::text, a.cover_image_url, a.created_at
    from public.albums a
    where a.id = v_album_id
  ) t;

  if v_album_json is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
    and av.status = 'ready'
  order by av.version_number desc
  limit 1;

  if v_version_id is not null then
    select row_to_json(t.*) into v_version_json
    from (
      select v.id, v.version_number, v.label, v.status, v.page_count
      from public.album_versions v
      where v.id = v_version_id
    ) t;

    select json_agg(t.* order by t.page_number) into v_pages_json
    from (
      select p.id, p.page_number, p.spread_number, p.orientation,
             p.image_url, p.thumbnail_url, p.medium_url, p.original_url,
             p.width, p.height, p.file_size
      from public.album_pages p
      where p.album_version_id = v_version_id
    ) t;
  end if;

  return json_build_object(
    'album', v_album_json,
    'version', v_version_json,
    'pages', coalesce(v_pages_json, '[]'::json)
  );
end;
$$;

grant execute on function public.get_album_by_token to anon;
grant execute on function public.get_album_by_token to authenticated;

-- =====================================================
-- 6. NEW RPC: GET STUDIO INFO FOR DELETED ALBUM
-- =====================================================
create or replace function public.get_studio_by_album_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_album record;
  v_profile json;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  select a.id, a.title, a.status, a.designer_id into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select row_to_json(t.*) into v_profile
  from (
    select p.studio_name, p.owner_name, p.phone_number
    from public.profiles p
    where p.user_id = v_album.designer_id
    limit 1
  ) t;

  if v_profile is null then
    return json_build_object(
      'deleted', true,
      'album_title', v_album.title,
      'studio', null
    );
  end if;

  return json_build_object(
    'deleted', true,
    'album_title', v_album.title,
    'studio', v_profile
  );
end;
$$;

grant execute on function public.get_studio_by_album_token to anon;
grant execute on function public.get_studio_by_album_token to authenticated;

-- =====================================================
-- 7. UPDATED_AT TRIGGER FOR PROFILES
-- =====================================================
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();
-- =====================================================
-- AlbumFlow Migration 007: Multi-Studio, Branding,
-- RLS fixes, Analytics, Notifications
-- =====================================================

-- =====================================================
-- 1. ADD STUDIO LOGO TO PROFILES
-- =====================================================
alter table public.profiles add column if not exists studio_logo_url text not null default '';

-- =====================================================
-- 2. FIX RLS: Client SELECT for requests
-- =====================================================
drop policy if exists "Clients can view requests via valid share link" on public.requests;
create policy "Clients can view requests via valid share link"
  on public.requests for select
  using (public.album_has_valid_share_link(album_id));

-- =====================================================
-- 3. FIX RLS: Client SELECT/INSERT for comments
-- =====================================================
drop policy if exists "Clients with valid share token can read comments" on public.comments;
create policy "Clients can view comments via valid share link"
  on public.comments for select
  using (public.album_has_valid_share_link(album_id));

drop policy if exists "Clients can insert comments via valid share link" on public.comments;
create policy "Clients can insert comments via valid share link"
  on public.comments for insert
  with check (public.album_has_valid_share_link(album_id));

-- =====================================================
-- 4. FIX RLS: activity_logs INSERT (only through RPCs)
-- =====================================================
drop policy if exists "System can insert activity logs" on public.activity_logs;
create policy "System can insert activity logs"
  on public.activity_logs for insert
  with check (
    auth.role() = 'authenticated' or
    public.album_has_valid_share_link(album_id)
  );

-- =====================================================
-- 5. NOTIFICATIONS TABLE
-- =====================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  album_id uuid references public.albums(id) on delete cascade,
  studio_name text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_user_unread on public.notifications (user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- =====================================================
-- 6. ANALYTICS TABLE
-- =====================================================
create table if not exists public.review_analytics (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  first_opened_at timestamptz,
  last_viewed_at timestamptz,
  pages_viewed integer not null default 0,
  total_viewing_seconds integer not null default 0,
  comments_count integer not null default 0,
  voice_notes_count integer not null default 0,
  review_submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_review_analytics_album on public.review_analytics (album_id);

alter table public.review_analytics enable row level security;

drop policy if exists "Designers can view analytics on their albums" on public.review_analytics;
create policy "Designers can view analytics on their albums"
  on public.review_analytics for select
  using (exists (
    select 1 from public.albums a
    where a.id = review_analytics.album_id
    and a.designer_id = auth.uid()
  ));

drop policy if exists "System can insert analytics" on public.review_analytics;
create policy "System can insert analytics"
  on public.review_analytics for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "System can update analytics" on public.review_analytics;
create policy "System can update analytics"
  on public.review_analytics for update
  using (exists (
    select 1 from public.albums a
    where a.id = review_analytics.album_id
    and (a.designer_id = auth.uid() or public.album_has_valid_share_link(a.id))
  ));

-- =====================================================
-- 7. NOTIFICATION TRIGGER: New comment
-- =====================================================
create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_album_title text;
begin
  select a.designer_id, a.title into v_designer_id, v_album_title
  from public.albums a where a.id = new.album_id;

  insert into public.notifications (user_id, type, title, message, album_id, studio_name)
  values (
    v_designer_id,
    'new_comment',
    'New Comment',
    'A new comment was added to "' || v_album_title || '"',
    new.album_id,
    ''
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment
  after insert on public.comments
  for each row execute function public.notify_new_comment();

-- =====================================================
-- 8. NOTIFICATION TRIGGER: Review submitted
-- =====================================================
create or replace function public.notify_review_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_album_title text;
begin
  select a.designer_id, a.title into v_designer_id, v_album_title
  from public.albums a where a.id = new.album_id;

  insert into public.notifications (user_id, type, title, message, album_id, studio_name)
  values (
    v_designer_id,
    'review_submitted',
    'Review Submitted',
    'Review submitted for "' || v_album_title || '"',
    new.album_id,
    ''
  );
  return new;
end;
$$;

-- =====================================================
-- 9. NOTIFICATION TRIGGER: Album approved
-- =====================================================
create or replace function public.notify_album_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_album_title text;
begin
  if new.status = 'approved' then
    select a.designer_id, a.title into v_designer_id, v_album_title
    from public.albums a where a.id = new.id;

    insert into public.notifications (user_id, type, title, message, album_id, studio_name)
    values (
      v_designer_id,
      'album_approved',
      'Album Approved',
      '"' || v_album_title || '" has been approved!',
      new.id,
      ''
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_album_approved on public.albums;
create trigger trg_notify_album_approved
  after update on public.albums
  for each row
  execute function public.notify_album_approved();

-- =====================================================
-- 10. UPDATED_AT TRIGGER FOR ANALYTICS
-- =====================================================
drop trigger if exists trg_review_analytics_updated_at on public.review_analytics;
create trigger trg_review_analytics_updated_at
  before update on public.review_analytics
  for each row execute function public.handle_updated_at();


-- =====================================================
-- 11. UPDATE get_studio_by_album_token to include logo
-- =====================================================
create or replace function public.get_studio_by_album_token(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_album record;
  v_profile json;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  select a.id, a.title, a.status, a.designer_id into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select row_to_json(t.*) into v_profile
  from (
    select p.studio_name, p.owner_name, p.phone_number, p.studio_logo_url
    from public.profiles p
    where p.user_id = v_album.designer_id
    limit 1
  ) t;

  if v_profile is null then
    return json_build_object(
      'deleted', true,
      'album_title', v_album.title,
      'studio', null
    );
  end if;

  return json_build_object(
    'deleted', true,
    'album_title', v_album.title,
    'studio', v_profile
  );
end;
$$;

grant execute on function public.get_studio_by_album_token to anon;
grant execute on function public.get_studio_by_album_token to authenticated;
-- =====================================================
-- AlbumFlow Migration 008: Remove public.users table
-- Eliminates the duplicate user system.
-- All FKs now point to auth.users directly.
-- handle_new_user() only writes to profiles.
-- =====================================================

-- =====================================================
-- 1. Drop FK constraints referencing public.users
--    Must drop before we can drop the table
-- =====================================================
alter table public.albums
  drop constraint if exists albums_designer_id_fkey;

alter table public.clients
  drop constraint if exists clients_designer_id_fkey;

alter table public.share_links
  drop constraint if exists share_links_created_by_fkey;

alter table public.comments
  drop constraint if exists comments_author_id_fkey;

alter table public.revisions
  drop constraint if exists revisions_created_by_fkey;

alter table public.activity_logs
  drop constraint if exists activity_logs_actor_id_fkey;

-- =====================================================
-- 2. Recreate FKs pointing to auth.users
-- =====================================================
alter table public.albums
  add constraint albums_designer_id_fkey
  foreign key (designer_id) references auth.users(id) on delete cascade;

alter table public.clients
  add constraint clients_designer_id_fkey
  foreign key (designer_id) references auth.users(id) on delete cascade;

alter table public.share_links
  add constraint share_links_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

alter table public.revisions
  add constraint revisions_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.activity_logs
  add constraint activity_logs_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

-- =====================================================
-- 3. Update handle_new_user() to only write to profiles
--    Stop inserting into public.users
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, studio_name, owner_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'studio_name', ''),
    coalesce(
      new.raw_user_meta_data ->> 'owner_name',
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
    ),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  );

  return new;
end;
$$;

-- =====================================================
-- 4. Update current_user_id() to use auth.uid() directly
--    No more public.users lookup needed
-- =====================================================
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

-- =====================================================
-- 5. Drop triggers on public.users
-- =====================================================
drop trigger if exists trg_users_updated_at on public.users;

-- =====================================================
-- 6. Drop RLS on public.users
-- =====================================================
drop policy if exists "Users can manage their own profile" on public.users;
alter table public.users disable row level security;

-- =====================================================
-- 7. Drop public.users table
-- =====================================================
drop table if exists public.users cascade;

-- =====================================================
-- 8. Rebuild on_auth_user_created trigger
--    (still fires on auth.users, calls updated handle_new_user)
-- =====================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 9. Grant table permissions for all existing objects
--    (ALTER DEFAULT PRIVILEGES in schema.sql handles future objects)
-- =====================================================
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;
