-- =====================================================
-- AlbumFlow Migration 016: Production Recovery Sprint
-- Fixes:
--   1. Apply migration 015 function grants (skip bucket private)
--   2. Fix review_data RLS — anon must use RPCs, not direct table
--   3. Fix get_album_review_data to require authenticated
--   4. Add missing indexes
-- =====================================================

-- =====================================================
-- 1. Migration 015: Function search_path + grants
-- (SKIP bucket set public = false — bucket must remain
--  public for /object/public/ URLs to work)
-- =====================================================

-- handle_updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- current_user_id
create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select auth.uid()
$$;

-- Revoke blanket grants and re-grant selectively
revoke all privileges on all functions in schema public from anon;
revoke all privileges on all functions in schema public from authenticated;

-- anon-accessible RPCs (share-link flow)
grant execute on function public.validate_share_token to anon;
grant execute on function public.validate_share_token to authenticated;

grant execute on function public.get_album_by_token to anon;
grant execute on function public.get_album_by_token to authenticated;

grant execute on function public.get_album_by_slug to anon;
grant execute on function public.get_album_by_slug to authenticated;

grant execute on function public.approve_album to anon;
grant execute on function public.approve_album to authenticated;

grant execute on function public.request_album_changes to anon;
grant execute on function public.request_album_changes to authenticated;

grant execute on function public.upsert_review_data to anon;
grant execute on function public.upsert_review_data to authenticated;

grant execute on function public.get_review_data to anon;
grant execute on function public.get_review_data to authenticated;

grant execute on function public.get_studio_by_album_token to anon;
grant execute on function public.get_studio_by_album_token to authenticated;

-- authenticated-only RPCs
grant execute on function public.get_album_review_data to authenticated;
grant execute on function public.submit_album_for_review to authenticated;
grant execute on function public.delete_account to authenticated;

-- Revoke default grants so future functions aren't auto-granted
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on functions from authenticated;

-- =====================================================
-- 2. Fix review_data RLS
-- Anon should NOT be able to list/select ALL records.
-- Only RPCs (SECURITY DEFINER) should bypass auth for
-- the share-link flow.
-- =====================================================

drop policy if exists "Clients can view review data via valid share link" on public.review_data;

create policy "Anon can view review data via valid share link"
  on public.review_data for select
  using (public.album_has_valid_share_link(album_id));

-- =====================================================
-- 3. Fix get_album_review_data — require share token
-- The current version accepts p_album_id which lets anon
-- read ANY album's data if they have the UUID.
-- Replace with share-token-based access.
-- =====================================================

create or replace function public.get_album_review_data(p_share_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_result jsonb;
begin
  -- Resolve album from share token
  select album_id into v_album_id
  from public.share_links
  where token = p_share_token
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if v_album_id is null then
    return jsonb_build_object('error', 'invalid_or_expired_share_token');
  end if;

  -- Build response
  select jsonb_build_object(
    'album', row_to_json(a)::jsonb,
    'version', row_to_json(av)::jsonb,
    'pages', coalesce(
      (select jsonb_agg(row_to_json(ap)::jsonb order by ap.page_number)
       from public.album_pages ap
       where ap.album_version_id = av.id),
      '[]'::jsonb
    )
  ) into v_result
  from public.albums a
  join public.album_versions av on av.album_id = a.id
  where a.id = v_album_id
  order by av.created_at desc
  limit 1;

  return v_result;
end;
$$;

-- =====================================================
-- 4. Add missing indexes for query performance
-- =====================================================

create index if not exists idx_share_links_token on public.share_links (token);
create index if not exists idx_share_links_album on public.share_links (album_id);

-- =====================================================
-- 5. Verify RLS is enabled on all tables
-- =====================================================
-- RLS should be enabled on all tables. The following
-- tables had RLS enabled previously — verify they
-- still exist:
--   profiles, albums, album_versions, album_pages,
--   clients, share_links, comments, requests,
--   page_reviews, approvals, revisions, activity_logs,
--   album_settings, notifications, review_analytics,
--   review_data
-- =====================================================

-- Re-enable RLS on all tables (idempotent)
do $$
declare
  tbl text;
begin
  for tbl in
    select unest(array[
      'profiles', 'albums', 'album_versions', 'album_pages',
      'clients', 'share_links', 'comments', 'requests',
      'page_reviews', 'approvals', 'revisions', 'activity_logs',
      'album_settings', 'notifications', 'review_analytics', 'review_data'
    ])
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end;
$$;

-- =====================================================
-- 6. Verify storage RLS on objects bucket
-- =====================================================
-- Storage RLS was set up in migration 012. The bucket
-- is public (for URL access) but objects are protected
-- by RLS policies that check share link validity.
-- =====================================================

-- Re-apply storage RLS (idempotent)
create policy if not exists "Designers can manage their own album images"
  on storage.objects for all
  using (
    bucket_id = 'albums'
    and (storage.foldername(name))[1] = 'albums'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[2]
      and a.designer_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'albums'
    and (storage.foldername(name))[1] = 'albums'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[2]
      and a.designer_id = auth.uid()
    )
  );

create policy if not exists "Anyone with valid share link can view images"
  on storage.objects for select
  using (
    bucket_id = 'albums'
    and (storage.foldername(name))[1] = 'albums'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[2]
      and public.album_has_valid_share_link(a.id)
    )
  );
