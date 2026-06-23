-- =====================================================
-- AlbumFlow Migration 013: Review Data Persistence
-- Adds server-side storage for review data so it
-- survives browser cache clears and device changes.
-- =====================================================

-- =====================================================
-- 1. REVIEW DATA TABLE
-- Stores review state as JSONB for flexibility.
-- Each album has exactly one review data record.
-- =====================================================
create table if not exists public.review_data (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id)
);

create index if not exists idx_review_data_album on public.review_data (album_id);

alter table public.review_data enable row level security;

-- Designers can manage review data on their albums
create policy "Designers can manage review data on their albums"
  on public.review_data
  using (exists (
    select 1 from public.albums a where a.id = review_data.album_id and a.designer_id = auth.uid()
  ));

-- Anyone with a valid share link can view/update review data
create policy "Clients can view review data via valid share link"
  on public.review_data for select
  using (public.album_has_valid_share_link(album_id));

create policy "Clients can insert review data via valid share link"
  on public.review_data for insert
  with check (public.album_has_valid_share_link(album_id));

create policy "Clients can update review data via valid share link"
  on public.review_data for update
  using (public.album_has_valid_share_link(album_id));

-- =====================================================
-- 2. UPDATED_AT TRIGGER
-- =====================================================
drop trigger if exists trg_review_data_updated_at on public.review_data;
create trigger trg_review_data_updated_at
  before update on public.review_data
  for each row execute function public.handle_updated_at();

-- =====================================================
-- 3. RPC: UPSERT REVIEW DATA
-- =====================================================
create or replace function public.upsert_review_data(
  p_album_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  insert into public.review_data (album_id, data)
  values (p_album_id, p_data)
  on conflict (album_id)
  do update set data = p_data, updated_at = now()
  returning data into v_result;

  return v_result;
end;
$$;

grant execute on function public.upsert_review_data to authenticated;
grant execute on function public.upsert_review_data to anon;

-- =====================================================
-- 4. RPC: GET REVIEW DATA
-- =====================================================
create or replace function public.get_review_data(p_album_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select data into v_result
  from public.review_data
  where album_id = p_album_id;

  return v_result;
end;
$$;

grant execute on function public.get_review_data to authenticated;
grant execute on function public.get_review_data to anon;
