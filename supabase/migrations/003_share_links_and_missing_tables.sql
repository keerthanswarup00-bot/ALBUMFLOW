-- =====================================================
-- AlbumFlow Complete Schema & Migration (v2)
-- Fixes: unambiguous variable names in functions
-- =====================================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

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

create trigger trg_comments_updated_at
  before update on public.comments
  for each row execute function public.handle_updated_at();

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
