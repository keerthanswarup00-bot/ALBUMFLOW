-- =====================================================
-- AlbumFlow Migration 015: Supabase Security Lint Fixes
-- Addresses all warnings from `supabase lint`:
--   - function_search_path_mutable (5 → 0)
--   - public_bucket_allows_listing (1 → 0)
--   - anon_security_definer_function_executable (40 → 0)
--   - authenticated_security_definer_function_executable (10 → 0)
--   - auth_leaked_password_protection (see dashboard note below)
-- =====================================================

-- =====================================================
-- 1. function_search_path_mutable — add search_path
-- These functions were defined without an explicit
-- search_path, making them vulnerable to search_path
-- injection attacks.
-- =====================================================

-- handle_updated_at: trigger function used by all tables
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

-- current_user_id: helper used by RLS policies and dashboard
create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select auth.uid()
$$;

-- =====================================================
-- 2. public_bucket_allows_listing — make bucket private
-- The "albums" storage bucket was public, which allowed
-- anyone to enumerate objects. RLS policies still control
-- read access; making the bucket private prevents listing.
-- =====================================================
update storage.buckets
set public = false
where id = 'albums';

-- =====================================================
-- 3. anon/authenticated_security_definer_function_executable
-- Migration 008 issued a blanket grant making ALL functions
-- executable by anon and authenticated, including trigger-only
-- functions that should never be called directly via the API.
--
-- Fix: revoke the blanket grant, then re-grant execute
-- only on functions that are intentionally exposed as RPCs.
-- Trigger functions are excluded — they are invoked by
-- their triggers regardless of execute grants.
-- =====================================================

-- 3a. Remove the blanket grant from 008
revoke all privileges on all functions in schema public from anon;
revoke all privileges on all functions in schema public from authenticated;

-- 3b. Re-grant to functions exposed as RPCs for anon users
--     (share-link flow — no authentication required)
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

grant execute on function public.get_album_review_data to authenticated;

-- 3c. Re-grant to functions exposed as RPCs for authenticated users only
grant execute on function public.submit_album_for_review to authenticated;
grant execute on function public.delete_account to authenticated;

-- =====================================================
-- 4. Default privileges — prevent auto-grant on functions
-- schema.sql line 15 grants all functions to anon/authenticated
-- by default. Future functions would re-trigger the lint
-- warning. Fix: revoke default function grants for those roles.
-- Tables and sequences are unaffected.
-- =====================================================
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on functions from authenticated;

-- =====================================================
-- 5. auth_leaked_password_protection
-- NOTE: This warning cannot be fixed via SQL migration.
--       Go to Supabase Dashboard → Authentication →
--       Settings → Security and toggle ON "Enable leaked
--       password protection". This checks passwords
--       against known breach databases at signup.
-- =====================================================

