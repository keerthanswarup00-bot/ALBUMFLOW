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
