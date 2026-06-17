-- =====================================================
-- AlbumFlow Migration 010: Delete Account RPC
-- Security definer RPC that allows authenticated users
-- to delete their own auth.users record (cascades to
-- profiles, albums, and other related data).
-- =====================================================

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_account to authenticated;
