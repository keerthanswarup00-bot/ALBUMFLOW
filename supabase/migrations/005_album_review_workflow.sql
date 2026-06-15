-- =====================================================
-- AlbumFlow Migration 005: Album-Level Review Workflow
-- Adds: submit for review, approve all, request changes
-- =====================================================

-- =====================================================
-- 1. Submit album for review (designer action)
-- =====================================================
create or replace function public.submit_album_for_review(p_album_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album record;
begin
  select a.id, a.status, a.phase, a.designer_id
  into v_album
  from public.albums a
  where a.id = p_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  if v_album.designer_id <> auth.uid() then
    return json_build_object('error', 'not_authorized');
  end if;

  update public.albums
  set status = 'awaiting_review',
      phase = 'review',
      updated_at = now()
  where id = p_album_id;

  return json_build_object('success', true, 'status', 'awaiting_review');
end;
$$;

grant execute on function public.submit_album_for_review to authenticated;

-- =====================================================
-- 2. Approve album (client action via share token)
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
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
  end if;

  select a.id, a.status, a.phase into v_album
  from public.albums a
  where a.id = v_album_id;

  if v_album.id is null then
    return json_build_object('error', 'album_not_found');
  end if;

  select av.id into v_version_id
  from public.album_versions av
  where av.album_id = v_album_id
  order by av.version_number desc
  limit 1;

  insert into public.approvals (album_id, album_version_id, client_name, client_email, status, signed_at)
  values (v_album_id, v_version_id, p_client_name, p_client_email, 'approved', now());

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
-- 3. Request changes at album level (client action via share token)
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
begin
  v_album_id := public.validate_share_token(p_token);
  if v_album_id is null then
    return json_build_object('error', 'invalid_or_expired_token');
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
