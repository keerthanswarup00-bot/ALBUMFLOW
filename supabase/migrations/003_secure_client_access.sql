-- =====================================================
-- AlbumFlow Migration 003: Secure Client Access System
-- Adds share_links, comments, revisions, activity_logs, album_settings
-- Implements token-based client access with RLS
-- =====================================================

-- 0. EXTENSIONS (ensure pgcrypto for gen_random_bytes)
create extension if not exists "pgcrypto";

-- =====================================================
-- 1. SHARE LINKS
-- Secure token-based access for clients (no auth required)
-- =====================================================
create table if not exists public.share_links (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  token_hash text not null unique, -- bcrypt hash of the token
  token_prefix text not null, -- first 8 chars for lookup without timing attack
  name text, -- e.g., "Client Proof Link", "Designer Review Link"
  expires_at timestamptz, -- null = never expires
  revoked_at timestamptz, -- soft revoke
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Permissions
  can_view boolean not null default true,
  can_comment boolean not null default true,
  can_approve boolean not null default true,
  can_download boolean not null default false,
  
  -- Access tracking
  last_accessed_at timestamptz,
  access_count integer not null default 0
);

create index idx_share_links_album on public.share_links (album_id);
create index idx_share_links_token_prefix on public.share_links (token_prefix);
create index idx_share_links_expires on public.share_links (expires_at) where expires_at is not null;

-- =====================================================
-- 2. COMMENTS (Unified - replaces requests + page_reviews)
-- Threaded comments with page attachment
-- =====================================================
do $$ begin
  create type comment_type as enum ('general', 'page', 'revision_request', 'approval');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type comment_status as enum ('open', 'resolved', 'dismissed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  page_id uuid references public.album_pages(id) on delete set null,
  parent_id uuid references public.comments(id) on delete cascade, -- for replies
  share_link_id uuid references public.share_links(id) on delete set null, -- which link created this
  author_name text not null,
  author_type text not null check (author_type in ('client', 'designer')), -- no auth for clients
  type comment_type not null default 'general',
  status comment_status not null default 'open',
  content text not null,
  metadata jsonb default '{}'::jsonb, -- pin position, etc.
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comments_album on public.comments (album_id);
create index idx_comments_page on public.comments (page_id);
create index idx_comments_parent on public.comments (parent_id);
create index idx_comments_share_link on public.comments (share_link_id);
create index idx_comments_status on public.comments (status);
create index idx_comments_created on public.comments (created_at desc);

-- =====================================================
-- 3. REVISIONS (Album version iterations with designer notes)
-- =====================================================
do $$ begin
  create type revision_status as enum ('draft', 'submitted', 'client_review', 'revision_requested', 'approved');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.revisions (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  album_version_id uuid not null references public.album_versions(id) on delete cascade,
  revision_number integer not null,
  designer_notes text,
  client_feedback_summary text,
  status revision_status not null default 'draft',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id, revision_number)
);

create index idx_revisions_album on public.revisions (album_id);
create index idx_revisions_version on public.revisions (album_version_id);
create index idx_revisions_status on public.revisions (status);

-- =====================================================
-- 4. ACTIVITY LOGS (Audit trail)
-- =====================================================
do $$ begin
  create type activity_type as enum (
    'album_created', 'album_updated', 'album_archived', 'album_restored',
    'images_uploaded', 'images_reordered', 'image_replaced', 'image_deleted',
    'share_link_created', 'share_link_revoked', 'share_link_accessed',
    'comment_created', 'comment_replied', 'comment_resolved', 'comment_dismissed',
    'revision_submitted', 'revision_reviewed', 'revision_approved', 'revision_rejected',
    'approval_submitted', 'approval_signed', 'settings_changed'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.activity_logs (
  id uuid primary key default uuid_generate_v4(),
  album_id uuid not null references public.albums(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null, -- null for client actions
  share_link_id uuid references public.share_links(id) on delete set null,
  type activity_type not null,
  description text not null,
  metadata jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_album on public.activity_logs (album_id);
create index idx_activity_logs_user on public.activity_logs (user_id);
create index idx_activity_logs_share_link on public.activity_logs (share_link_id);
create index idx_activity_logs_created on public.activity_logs (created_at desc);
create index idx_activity_logs_type on public.activity_logs (type);

-- =====================================================
-- 5. ALBUM SETTINGS (Per-album configuration)
-- =====================================================
create table if not exists public.album_settings (
  album_id uuid primary key references public.albums(id) on delete cascade,
  allow_downloads boolean not null default false,
  allow_comments boolean not null default true,
  require_approval_checklist boolean not null default true,
  watermark_enabled boolean not null default false,
  watermark_text text,
  client_can_see_all_pages boolean not null default true,
  auto_mark_viewed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Generate secure random token (32 bytes = 256 bits)
create or replace function public.generate_share_token()
returns text
language sql
volatile
as $$
  select encode(gen_random_bytes(32), 'base64url');
$$;

-- Hash token for storage (using crypt with bcrypt)
create or replace function public.hash_share_token(token text)
returns text
language sql
volatile
as $$
  select crypt(token, gen_salt('bf', 12));
$$;

-- Verify token against hash
create or replace function public.verify_share_token(token text, token_hash text)
returns boolean
language sql
stable
as $$
  select token_hash = crypt(token, token_hash);
$$;

-- Extract token prefix (first 8 chars) for indexed lookup
create or replace function public.token_prefix(token text)
returns text
language sql
immutable
as $$
  select substring(token from 1 for 8);
$$;

-- Validate share link token and return album_id if valid
create or replace function public.validate_share_token(token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record record;
  album_uuid uuid;
begin
  -- Lookup by prefix first (indexed, constant-time)
  select * into link_record
  from public.share_links
  where token_prefix = public.token_prefix(token)
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return null;
  end if;

  -- Verify full token hash (constant-time via crypt)
  if not public.verify_share_token(token, link_record.token_hash) then
    return null;
  end if;

  -- Update access tracking
  update public.share_links
  set last_accessed_at = now(),
      access_count = access_count + 1
  where id = link_record.id;

  return link_record.album_id;
end;
$$;

-- Get share link details by token (for permission checks)
create or replace function public.get_share_link_by_token(token text)
returns public.share_links
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.share_links;
begin
  select * into link_record
  from public.share_links
  where token_prefix = public.token_prefix(token)
    and revoked_at is null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return null;
  end if;

  if not public.verify_share_token(token, link_record.token_hash) then
    return null;
  end if;

  return link_record;
end;
$$;

-- =====================================================
-- 7. ROW LEVEL SECURITY FOR NEW TABLES
-- =====================================================

-- SHARE LINKS: Designers manage their own; clients validate via token functions
alter table public.share_links enable row level security;

create policy "Designers can manage share links for their albums"
  on public.share_links
  using (
    exists (
      select 1 from public.albums
      where albums.id = share_links.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- COMMENTS: Designers manage all; clients can insert/view via share link
alter table public.comments enable row level security;

create policy "Designers can manage comments on their albums"
  on public.comments
  using (
    exists (
      select 1 from public.albums
      where albums.id = comments.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- Clients can insert comments if they have valid share link with can_comment
create policy "Clients can insert comments via valid share link"
  on public.comments
  for insert
  with check (
    public.get_share_link_by_token(current_setting('request.jwt.claims', true)::json->>'share_token') is not null
    and (public.get_share_link_by_token(current_setting('request.jwt.claims', true)::json->>'share_token')).can_comment
  );

-- Clients can view comments on their album via valid share link
create policy "Clients can view comments via valid share link"
  on public.comments
  for select
  using (
    album_id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
  );

-- REVISIONS: Designers manage; clients view via share link
alter table public.revisions enable row level security;

create policy "Designers can manage revisions for their albums"
  on public.revisions
  using (
    exists (
      select 1 from public.albums
      where albums.id = revisions.album_id
      and albums.designer_id = auth.uid()
    )
  );

create policy "Clients can view revisions via valid share link"
  on public.revisions
  for select
  using (
    album_id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
  );

-- ACTIVITY LOGS: Designers view; clients never access
alter table public.activity_logs enable row level security;

create policy "Designers can view activity logs for their albums"
  on public.activity_logs
  using (
    exists (
      select 1 from public.albums
      where albums.id = activity_logs.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- ALBUM SETTINGS: Designers manage
alter table public.album_settings enable row level security;

create policy "Designers can manage settings for their albums"
  on public.album_settings
  using (
    exists (
      select 1 from public.albums
      where albums.id = album_settings.album_id
      and albums.designer_id = auth.uid()
    )
  );

-- =====================================================
-- 8. UPDATE EXISTING TABLES RLS FOR CLIENT ACCESS
-- =====================================================

-- ALBUMS: Add client read policy via share token
create policy "Clients can view album via valid share link"
  on public.albums
  for select
  using (
    id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
  );

-- ALBUM VERSIONS: Add client read policy via share token
create policy "Clients can view versions via valid share link"
  on public.album_versions
  for select
  using (
    album_id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
  );

-- ALBUM PAGES: Add client read policy via share token
create policy "Clients can view pages via valid share link"
  on public.album_pages
  for select
  using (
    album_version_id in (
      select id from public.album_versions
      where album_id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
    )
  );

-- APPROVALS: Add client insert/select via share token
create policy "Clients can submit approval via valid share link"
  on public.approvals
  for insert
  with check (
    album_id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
    and (public.get_share_link_by_token(current_setting('request.jwt.claims', true)::json->>'share_token')).can_approve
  );

create policy "Clients can view approval via valid share link"
  on public.approvals
  for select
  using (
    album_id = public.validate_share_token(current_setting('request.jwt.claims', true)::json->>'share_token')
  );

-- =====================================================
-- 9. UPDATED_AT TRIGGERS FOR NEW TABLES
-- =====================================================

create trigger trg_share_links_updated_at
  before update on public.share_links
  for each row execute function public.handle_updated_at();

create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.handle_updated_at();

create trigger trg_revisions_updated_at
  before update on public.revisions
  for each row execute function public.handle_updated_at();

create trigger trg_album_settings_updated_at
  before update on public.album_settings
  for each row execute function public.handle_updated_at();

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

grant select, insert on public.share_links to authenticated;
grant select on public.share_links to anon; -- for token validation functions

grant select, insert, update on public.comments to authenticated;
grant select, insert on public.comments to anon; -- via RLS policies

grant select, insert, update on public.revisions to authenticated;
grant select on public.revisions to anon; -- via RLS policies

grant select on public.activity_logs to authenticated;

grant select, insert, update on public.album_settings to authenticated;

grant execute on function public.generate_share_token to authenticated;
grant execute on function public.hash_share_token to authenticated;
grant execute on function public.verify_share_token to authenticated;
grant execute on function public.token_prefix to authenticated, anon;
grant execute on function public.validate_share_token to anon, authenticated;
grant execute on function public.get_share_link_by_token to anon, authenticated;