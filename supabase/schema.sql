-- =====================================================
-- AlbumFlow Database Schema
-- PostgreSQL for Supabase
-- =====================================================

-- 0. EXTENSIONS
-- =====================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

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
create index idx_users_email on public.users (email);

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

create index idx_clients_designer on public.clients (designer_id);
create index idx_clients_email on public.clients (email);

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

create index idx_albums_designer on public.albums (designer_id);
create index idx_albums_status on public.albums (status);
create index idx_albums_phase on public.albums (phase);
create index idx_albums_created on public.albums (created_at desc);

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

create index idx_versions_album on public.album_versions (album_id);
create index idx_versions_status on public.album_versions (status);

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

create index idx_pages_version on public.album_pages (album_version_id);
create index idx_pages_spread on public.album_pages (album_version_id, spread_number);

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

create index idx_requests_album on public.requests (album_id);
create index idx_requests_page on public.requests (page_id);
create index idx_requests_status on public.requests (status);

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

create index idx_reviews_page on public.page_reviews (page_id);
create index idx_reviews_album on public.page_reviews (album_id);

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

create index idx_approvals_album on public.approvals (album_id);
create index idx_approvals_status on public.approvals (status);

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

create policy "Designers can manage their own albums"
  on public.albums
  using (designer_id = auth.uid());

-- Album versions inherit from album
alter table public.album_versions enable row level security;

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

create policy "Users can manage their own profile"
  on public.users
  using (id = auth.uid());

-- Clients: designers can manage their own clients
alter table public.clients enable row level security;

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

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();

create trigger trg_albums_updated_at
  before update on public.albums
  for each row execute function public.handle_updated_at();

create trigger trg_album_versions_updated_at
  before update on public.album_versions
  for each row execute function public.handle_updated_at();

create trigger trg_requests_updated_at
  before update on public.requests
  for each row execute function public.handle_updated_at();

create trigger trg_approvals_updated_at
  before update on public.approvals
  for each row execute function public.handle_updated_at();
