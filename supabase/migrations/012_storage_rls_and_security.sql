-- =====================================================
-- AlbumFlow Migration 012: Storage RLS & Security Hardening
-- Fixes: storage bucket RLS, share_links column exposure,
-- activity_logs restrictions, analytics policy tightening
-- =====================================================

-- =====================================================
-- 1. STORAGE BUCKET RLS — albums bucket
-- =====================================================
-- Enable RLS on the storage bucket (requires storage extension)
-- Note: This uses the storage schema which is a Supabase extension

-- Allow authenticated users to manage their own album images
-- Path format: albums/{albumId}/v{versionNumber}/{variant}/{filename}
create policy "Designers can manage their own album images"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'albums'
    and (storage.foldername(name))[1] = 'albums'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[2]
      and a.designer_id = auth.uid()
    )
  );

-- Allow anon users to read images via valid share link
create policy "Anyone with valid share link can view images"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'albums'
    and (storage.foldername(name))[1] = 'albums'
    and exists (
      select 1 from public.albums a
      where a.id::text = (storage.foldername(name))[2]
      and (
        a.designer_id = auth.uid()
        or public.album_has_valid_share_link(a.id)
      )
    )
  );

-- =====================================================
-- 2. SHARE LINKS — Restrict anon SELECT to token only
-- =====================================================
-- Drop the overly permissive anon SELECT policy
drop policy if exists "Anyone can read valid share links for token check" on public.share_links;

-- Create a restricted policy: anon can only see the token column
-- We accomplish this by only creating a policy for authenticated users
-- and letting anon access go through the validate_share_token RPC instead
create policy "Anyone can read valid share links for token check"
  on public.share_links
  for select
  to authenticated
  using (
    exists (
      select 1 from public.albums a
      where a.id = share_links.album_id
      and a.designer_id = auth.uid()
    )
  );

-- Create a separate view for public token validation
create or replace view public.valid_share_tokens as
  select token
  from public.share_links
  where revoked_at is null
    and (expires_at is null or expires_at > now());

grant select on public.valid_share_tokens to anon;
grant select on public.valid_share_tokens to authenticated;

-- =====================================================
-- 3. ACTIVITY LOGS — Tighten insert policy
-- =====================================================
drop policy if exists "System can insert activity logs" on public.activity_logs;
create policy "System can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

-- =====================================================
-- 4. ACTIVITY LOGS — Restrict SELECT to own studio
-- =====================================================
drop policy if exists "Users can view activity logs" on public.activity_logs;
create policy "Users can view activity logs"
  on public.activity_logs
  for select
  to authenticated
  using (
    exists (
      select 1 from public.albums a
      where a.id = album_id
      and a.designer_id = auth.uid()
    )
  );

-- =====================================================
-- 5. REVIEW ANALYTICS — Remove share-link update bypass
-- =====================================================
drop policy if exists "System can update analytics" on public.review_analytics;
create policy "System can update analytics"
  on public.review_analytics
  for update
  to authenticated
  using (
    exists (
      select 1 from public.albums a
      where a.id = review_analytics.album_id
      and a.designer_id = auth.uid()
    )
  );

-- =====================================================
-- 6. COVER IMAGE URL TRIGGER
-- Auto-set cover_image_url when first page is added
-- =====================================================
create or replace function public.auto_set_cover_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.albums
  set cover_image_url = coalesce(new.thumbnail_url, new.image_url)
  where id = (
    select av.album_id
    from public.album_versions av
    where av.id = new.album_version_id
  )
  and cover_image_url is null;
  return new;
end;
$$;

drop trigger if exists trg_auto_set_cover on public.album_pages;
create trigger trg_auto_set_cover
  after insert on public.album_pages
  for each row
  execute function public.auto_set_cover_image();

-- =====================================================
-- 7. PAGE DELETE — Trigger to clean up storage
-- =====================================================
create or replace function public.cleanup_page_storage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paths text[];
begin
  v_paths := array_remove(
    array[
      regexp_replace(old.original_url, '^.*?/storage/v1/object/public/albums/', 'albums/'),
      regexp_replace(old.image_url, '^.*?/storage/v1/object/public/albums/', 'albums/'),
      regexp_replace(old.thumbnail_url, '^.*?/storage/v1/object/public/albums/', 'albums/')
    ],
    null
  );
  -- Delete from storage if paths are valid
  if array_length(v_paths, 1) > 0 then
    perform storage.delete('albums', v_paths);
  end if;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_page_storage on public.album_pages;
create trigger trg_cleanup_page_storage
  after delete on public.album_pages
  for each row
  execute function public.cleanup_page_storage();

-- =====================================================
-- 8. NOTIFICATION — Also insert into activity_logs
-- =====================================================
create or replace function public.log_comment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (album_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    new.album_id,
    new.author_id,
    'comment_created',
    'comments',
    new.id,
    jsonb_build_object('page_number', new.page_number)
  );
  return new;
end;
$$;

drop trigger if exists trg_log_comment_activity on public.comments;
create trigger trg_log_comment_activity
  after insert on public.comments
  for each row
  execute function public.log_comment_activity();
