-- =====================================================
-- AlbumFlow Migration 009: Album Slug Routes
-- Adds get_album_by_slug RPC for /review/:slug route
-- =====================================================

-- =====================================================
-- 1. NEW RPC: GET ALBUM BY SLUG
-- =====================================================
drop function if exists public.get_album_by_slug(text);
create or replace function public.get_album_by_slug(p_slug text)
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
  select a.id, a.status::text into v_album_id, v_album_status
  from public.albums a
  where a.slug = p_slug
  limit 1;

  if v_album_id is null then
    return json_build_object('error', 'album_not_found');
  end if;

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

grant execute on function public.get_album_by_slug to anon;
grant execute on function public.get_album_by_slug to authenticated;
