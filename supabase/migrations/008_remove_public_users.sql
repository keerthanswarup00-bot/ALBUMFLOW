-- =====================================================
-- AlbumFlow Migration 008: Remove public.users table
-- Eliminates the duplicate user system.
-- All FKs now point to auth.users directly.
-- handle_new_user() only writes to profiles.
-- =====================================================

-- =====================================================
-- 1. Drop FK constraints referencing public.users
--    Must drop before we can drop the table
-- =====================================================
alter table public.albums
  drop constraint if exists albums_designer_id_fkey;

alter table public.clients
  drop constraint if exists clients_designer_id_fkey;

alter table public.share_links
  drop constraint if exists share_links_created_by_fkey;

alter table public.comments
  drop constraint if exists comments_author_id_fkey;

alter table public.revisions
  drop constraint if exists revisions_created_by_fkey;

alter table public.activity_logs
  drop constraint if exists activity_logs_actor_id_fkey;

-- =====================================================
-- 2. Recreate FKs pointing to auth.users
-- =====================================================
alter table public.albums
  add constraint albums_designer_id_fkey
  foreign key (designer_id) references auth.users(id) on delete cascade;

alter table public.clients
  add constraint clients_designer_id_fkey
  foreign key (designer_id) references auth.users(id) on delete cascade;

alter table public.share_links
  add constraint share_links_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete cascade;

alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references auth.users(id) on delete set null;

alter table public.revisions
  add constraint revisions_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.activity_logs
  add constraint activity_logs_actor_id_fkey
  foreign key (actor_id) references auth.users(id) on delete set null;

-- =====================================================
-- 3. Update handle_new_user() to only write to profiles
--    Stop inserting into public.users
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, studio_name, owner_name, phone_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'studio_name', ''),
    coalesce(
      new.raw_user_meta_data ->> 'owner_name',
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
    ),
    coalesce(new.raw_user_meta_data ->> 'phone_number', '')
  );

  return new;
end;
$$;

-- =====================================================
-- 4. Update current_user_id() to use auth.uid() directly
--    No more public.users lookup needed
-- =====================================================
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

-- =====================================================
-- 5. Drop triggers on public.users
-- =====================================================
drop trigger if exists trg_users_updated_at on public.users;

-- =====================================================
-- 6. Drop RLS on public.users
-- =====================================================
drop policy if exists "Users can manage their own profile" on public.users;
alter table public.users disable row level security;

-- =====================================================
-- 7. Drop public.users table
-- =====================================================
drop table if exists public.users cascade;

-- =====================================================
-- 8. Rebuild on_auth_user_created trigger
--    (still fires on auth.users, calls updated handle_new_user)
-- =====================================================
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 9. Grant table permissions for all existing objects
--    (ALTER DEFAULT PRIVILEGES in schema.sql handles future objects)
-- =====================================================
grant all privileges on all tables in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
grant all privileges on all functions in schema public to anon, authenticated, service_role;
