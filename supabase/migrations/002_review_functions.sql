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
