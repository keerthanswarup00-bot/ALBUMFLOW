import { supabase } from './client';
import { ApiError } from '@/utils/errors';
import type { ShareLink } from '@/types/viewer';

function mapRowToShareLink(row: Record<string, unknown>): ShareLink {
  return {
    id: row.id as string,
    album_id: row.album_id as string,
    token: row.token as string,
    label: (row.label as string) ?? null,
    expires_at: (row.expires_at as string) ?? null,
    max_access_count: (row.max_access_count as number) ?? null,
    access_count: row.access_count as number,
    last_accessed_at: (row.last_accessed_at as string) ?? null,
    created_by: row.created_by as string,
    created_at: row.created_at as string,
    revoked_at: (row.revoked_at as string) ?? null,
  };
}

export async function getActiveShareLink(albumId: string): Promise<ShareLink | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('album_id', albumId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new ApiError(`Failed to fetch share link: ${error.message}`, 500, error);
  }

  return (data && data.length > 0) ? mapRowToShareLink(data[0]) : null;
}

export async function getActiveShareToken(albumId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('token')
    .eq('album_id', albumId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new ApiError(`Failed to fetch share link: ${error.message}`, 500, error);
  }

  return (data && data.length > 0) ? data[0].token : null;
}

export async function getShareLinks(albumId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('album_id', albumId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(`Failed to fetch share links: ${error.message}`, 500, error);
  }

  return (data ?? []).map(mapRowToShareLink);
}

export async function createShareLink(albumId: string): Promise<ShareLink> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new ApiError('Not authenticated', 401);
  }

  const payload: Record<string, unknown> = {
    album_id: albumId,
    token: await generateToken(),
    created_by: userData.user.id,
  };

  const { data, error } = await supabase
    .from('share_links')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to create share link: ${error.message}`, 500, error);
  }

  return mapRowToShareLink(data);
}

async function generateToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function deleteShareLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('id', linkId);

  if (error) {
    throw new ApiError(`Failed to delete share link: ${error.message}`, 500, error);
  }
}
