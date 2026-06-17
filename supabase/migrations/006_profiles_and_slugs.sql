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
