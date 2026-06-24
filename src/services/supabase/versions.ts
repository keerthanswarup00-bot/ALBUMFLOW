import { supabase } from './client';
import { ApiError } from '@/utils/errors';
import type { AlbumVersion } from '@/types';

function mapRowToVersion(row: Record<string, unknown>): AlbumVersion {
  return {
    id: row.id as string,
    album_id: row.album_id as string,
    version_number: row.version_number as number,
    label: (row.label as string) ?? null,
    status: (row.status as AlbumVersion['status']) ?? 'ready',
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    page_count: (row.page_count as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function ensureVersion(albumId: string): Promise<AlbumVersion> {
  const { data: existing, error: fetchError } = await supabase
    .from('album_versions')
    .select('*')
    .eq('album_id', albumId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (fetchError) {
    throw new ApiError(`Failed to fetch versions: ${fetchError.message}`, 500, fetchError);
  }

  if (existing && existing.length > 0) {
    return mapRowToVersion(existing[0]);
  }

  const { data, error: insertError } = await supabase
    .from('album_versions')
    .insert({
      album_id: albumId,
      version_number: 1,
      label: 'Version 1',
      status: 'uploading',
      page_count: 0,
    })
    .select()
    .single();

  if (insertError) {
    throw new ApiError(`Failed to create version: ${insertError.message}`, 500, insertError);
  }

  return mapRowToVersion(data);
}

export async function updateVersionPageCount(
  versionId: string,
  count: number
): Promise<void> {
  const { error } = await supabase
    .from('album_versions')
    .update({
      page_count: count,
      status: count > 0 ? 'ready' : 'uploading',
    })
    .eq('id', versionId);

  if (error) {
    throw new ApiError(`Failed to update version: ${error.message}`, 500, error);
  }
}

export async function getVersions(albumId: string): Promise<AlbumVersion[]> {
  const { data, error } = await supabase
    .from('album_versions')
    .select('*')
    .eq('album_id', albumId)
    .order('version_number', { ascending: false });

  if (error) {
    throw new ApiError(`Failed to fetch versions: ${error.message}`, 500, error);
  }

  return (data ?? []).map(mapRowToVersion);
}

export async function getLatestVersionPageCount(albumId: string): Promise<number> {
  const { data, error } = await supabase
    .from('album_versions')
    .select('page_count')
    .eq('album_id', albumId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (error) {
    throw new ApiError(`Failed to fetch page count: ${error.message}`, 500, error);
  }

  return data?.[0]?.page_count ?? 0;
}
