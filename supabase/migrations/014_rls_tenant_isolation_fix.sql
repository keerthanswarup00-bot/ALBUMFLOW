-- =====================================================
-- AlbumFlow Migration 014: RLS Tenant Isolation Fix
-- Fixes P0 security breach where User B could see
-- User A's albums in their dashboard if User A's
-- album had a valid share link.
--
-- Root cause chain:
--   1. album_has_valid_share_link ran as invoker (not SECURITY DEFINER)
--   2. The permissive share_links SELECT policy allowed ANY
--      authenticated user to read ALL valid share links
--   3. The albums/versions/pages SELECT policies used
--      album_has_valid_share_link(id) which returned TRUE
--      for any album with a valid share link
-- =====================================================

-- =====================================================
-- 1. Make album_has_valid_share_link SECURITY DEFINER
-- Required so that when called from RLS policies (e.g.
-- storage.objects, review_data) it can read share_links
-- without being constrained by the caller's RLS.
-- =====================================================
create or replace function public.album_has_valid_share_link(p_album_id uuid)
returns boolean
language sql
security definer
set search_path = public
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
-- 2. Drop the overly permissive share_links SELECT policy
-- This policy allowed ANY authenticated user to read ALL
-- valid share links. It was originally needed because
-- album_has_valid_share_link ran as invoker; now that
-- function is SECURITY DEFINER, the policy is dead code.
-- validate_share_token RPC is also SECURITY DEFINER.
-- =====================================================
drop policy if exists "Anyone can read valid share links for token check" on public.share_links;

-- =====================================================
-- 3. Remove album_has_valid_share_link from albums SELECT
-- The public review flow uses SECURITY DEFINER RPCs
-- (get_album_by_token, get_album_by_slug) that bypass
-- RLS. No direct table query needs this bypass.
-- Leaving it in place allowed B to see A's albums.
-- =====================================================
drop policy if exists "Public can view albums via valid share token" on public.albums;
create policy "Public can view albums via valid share token"
  on public.albums for select
  using (designer_id = auth.uid());

-- =====================================================
-- 4. Same fix for album_versions
-- =====================================================
drop policy if exists "Public can view versions via valid share token" on public.album_versions;
create policy "Public can view versions via valid share token"
  on public.album_versions for select
  using (exists (
    select 1 from public.albums a
    where a.id = album_versions.album_id
    and a.designer_id = auth.uid()
  ));

-- =====================================================
-- 5. Same fix for album_pages
-- =====================================================
drop policy if exists "Public can view pages via valid share token" on public.album_pages;
create policy "Public can view pages via valid share token"
  on public.album_pages for select
  using (exists (
    select 1 from public.album_versions av
    join public.albums a on a.id = av.album_id
    where av.id = album_pages.album_version_id
    and a.designer_id = auth.uid()
  ));
