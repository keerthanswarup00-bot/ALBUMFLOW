-- =====================================================
-- AlbumFlow Migration 007: Multi-Studio, Branding,
-- RLS fixes, Analytics, Notifications
-- =====================================================

-- =====================================================
-- 1. ADD STUDIO LOGO TO PROFILES
-- =====================================================
alter table public.profiles add column if not exists studio_logo_url text not null default '';

-- =====================================================
-- 2. FIX RLS: Client SELECT for requests
-- =====================================================
drop policy if exists "Clients can view requests via valid share link" on public.requests;
create policy "Clients can view requests via valid share link"
  on public.requests for select
  using (public.album_has_valid_share_link(album_id));

-- =====================================================
-- 3. FIX RLS: Client SELECT/INSERT for comments
-- =====================================================
drop policy if exists "Clients with valid share token can read comments" on public.comments;
create policy "Clients can view comments via valid share link"
  on public.comments for select
  using (public.album_has_valid_share_link(album_id));

drop policy if exists "Clients can insert comments via valid share link" on public.comments;
create policy "Clients can insert comments via valid share link"
  on public.comments for insert
  with check (public.album_has_valid_share_link(album_id));

-- =====================================================
-- 4. FIX RLS: activity_logs INSERT (only through RPCs)
-- =====================================================
drop policy if exists "System can insert activity logs" on public.activity_logs;
create policy "System can insert activity logs"
  on public.activity_logs for insert
  with check (
    auth.role() = 'authenticated' or
    public.album_has_valid_share_link(album_id)
  );

-- =====================================================
-- 5. NOTIFICATIONS TABLE
-- =====================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  album_id uuid references public.albums(id) on delete cascade,
  studio_name text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_user_unread on public.notifications (user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (user_id = auth.uid());

-- =====================================================
-- 6. ANALYTICS TABLE
-- =====================================================
create table if not exists public.review_analytics (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  first_opened_at timestamptz,
  last_viewed_at timestamptz,
  pages_viewed integer not null default 0,
  total_viewing_seconds integer not null default 0,
  comments_count integer not null default 0,
  voice_notes_count integer not null default 0,
  review_submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_review_analytics_album on public.review_analytics (album_id);

alter table public.review_analytics enable row level security;

drop policy if exists "Designers can view analytics on their albums" on public.review_analytics;
create policy "Designers can view analytics on their albums"
  on public.review_analytics for select
  using (exists (
    select 1 from public.albums a
    where a.id = review_analytics.album_id
    and a.designer_id = auth.uid()
  ));

drop policy if exists "System can insert analytics" on public.review_analytics;
create policy "System can insert analytics"
  on public.review_analytics for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "System can update analytics" on public.review_analytics;
create policy "System can update analytics"
  on public.review_analytics for update
  using (exists (
    select 1 from public.albums a
    where a.id = review_analytics.album_id
    and (a.designer_id = auth.uid() or public.album_has_valid_share_link(a.id))
  ));

-- =====================================================
-- 7. NOTIFICATION TRIGGER: New comment
-- =====================================================
create or replace function public.notify_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_album_title text;
begin
  select a.designer_id, a.title into v_designer_id, v_album_title
  from public.albums a where a.id = new.album_id;

  insert into public.notifications (user_id, type, title, message, album_id, studio_name)
  values (
    v_designer_id,
    'new_comment',
    'New Comment',
    'A new comment was added to "' || v_album_title || '"',
    new.album_id,
    ''
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment
  after insert on public.comments
  for each row execute function public.notify_new_comment();

-- =====================================================
-- 8. NOTIFICATION TRIGGER: Review submitted
-- =====================================================
create or replace function public.notify_review_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_album_title text;
begin
  select a.designer_id, a.title into v_designer_id, v_album_title
  from public.albums a where a.id = new.album_id;

  insert into public.notifications (user_id, type, title, message, album_id, studio_name)
  values (
    v_designer_id,
    'review_submitted',
    'Review Submitted',
    'Review submitted for "' || v_album_title || '"',
    new.album_id,
    ''
  );
  return new;
end;
$$;

-- =====================================================
-- 9. NOTIFICATION TRIGGER: Album approved
-- =====================================================
create or replace function public.notify_album_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;
  v_album_title text;
begin
  if new.status = 'approved' then
    select a.designer_id, a.title into v_designer_id, v_album_title
    from public.albums a where a.id = new.id;

    insert into public.notifications (user_id, type, title, message, album_id, studio_name)
    values (
      v_designer_id,
      'album_approved',
      'Album Approved',
      '"' || v_album_title || '" has been approved!',
      new.id,
      ''
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_album_approved on public.albums;
create trigger trg_notify_album_approved
  after update on public.albums
  for each row
  execute function public.notify_album_approved();

-- =====================================================
-- 10. UPDATED_AT TRIGGER FOR ANALYTICS
-- =====================================================
drop trigger if exists trg_review_analytics_updated_at on public.review_analytics;
create trigger trg_review_analytics_updated_at
  before update on public.review_analytics
  for each row execute function public.handle_updated_at();


-- =====================================================
-- 11. UPDATE get_studio_by_album_token to include logo
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
    select p.studio_name, p.owner_name, p.phone_number, p.studio_logo_url
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
