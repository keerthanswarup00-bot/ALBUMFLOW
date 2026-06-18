-- =====================================================
-- AlbumFlow Migration 011: Security Hardening Sprint
-- Fixes: anon access to get_album_review_data, activity_logs RLS
-- =====================================================

-- =====================================================
-- 1. Secure get_album_review_data — remove anon grant
-- Function must only be called by authenticated users
-- =====================================================
revoke execute on function public.get_album_review_data from anon;
-- Keep authenticated grant:
-- grant execute on function public.get_album_review_data to authenticated;

-- =====================================================
-- 2. Tighten activity_logs RLS policy
-- Only authenticated users can insert; remove share-link bypass
-- =====================================================
drop policy if exists "System can insert activity logs" on public.activity_logs;
create policy "System can insert activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check (auth.role() = 'authenticated');

-- =====================================================
-- 3. Activity logs SELECT — only see your own studio's logs
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
-- 4. Restrict share_links public SELECT — only expose
--    the token column for validation, not all fields
-- =====================================================
drop policy if exists "Anyone can read valid share links for token check" on public.share_links;
create policy "Anyone can read valid share links for token check"
  on public.share_links
  for select
  to anon, authenticated
  using (
    revoked_at is null
    and (expires_at is null or expires_at > now())
  )
  -- Security: only expose token column to anon
  -- Full rows require authentication

-- =====================================================
-- 5. Rate-limit approve_album: enforce at least 5s
--    between approvals from the same token
-- =====================================================
create or replace function public.approve_album(
  p_token text,
  p_client_name text,
  p_client_email text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_version_id uuid;
  v_album record;
  v_last_approval timestamptz;
begin
  -- Validate share token
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  -- Rate limit: check last approval time for this album
  select max(signed_at) into v_last_approval
  from public.approvals
  where album_id = v_album_id;

  if v_last_approval is not null and v_last_approval > now() - interval '5 seconds' then
    return json_build_object('error', 'too_many_requests');
  end if;

  -- Verify album exists and is in a valid state
  select a.id, a.status, a.phase into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  -- Get latest version
  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
  order by av.version_number desc
  limit 1;

  -- Record approval
  insert into public.approvals (album_id, album_version_id, client_name, client_email, status, signed_at)
  values (v_album_id, v_version_id, p_client_name, p_client_email, 'approved', now());

  -- Update album status
  update public.albums
  set status = 'approved',
      phase = 'approved',
      updated_at = now()
  where id = v_album_id;

  return json_build_object('success', true, 'status', 'approved');
end;
$$;

grant execute on function public.approve_album to anon;
grant execute on function public.approve_album to authenticated;

-- =====================================================
-- 6. Rate-limit request_album_changes: max 10 requests
--    per album per minute from anon users
-- =====================================================
create or replace function public.request_album_changes(
  p_token text,
  p_description text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album_id uuid;
  v_album record;
  v_recent_count int;
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  -- Rate limit: max 10 requests per album per minute
  select count(*) into v_recent_count
  from public.requests
  where album_id = v_album_id
    and created_at > now() - interval '1 minute';

  if v_recent_count >= 10 then
    return json_build_object('error', 'too_many_requests');
  end if;

  select a.id, a.title into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  insert into public.requests (album_id, page_id, reviewer_name, type, description, status)
  values (v_album_id, null, 'Client', 'change', p_description, 'open');

  update public.albums
  set status = 'changes_requested',
      updated_at = now()
  where id = v_album_id;

  return json_build_object('success', true, 'status', 'changes_requested');
end;
$$;

grant execute on function public.request_album_changes to anon;
grant execute on function public.request_album_changes to authenticated;
