import { supabase } from './client';
import { ApiError } from '@/utils/errors';
import type { AlbumPage } from '@/types';

export interface PageInsertData {
  album_version_id: string;
  page_number: number;
  spread_number: number;
  orientation: 'portrait' | 'landscape';
  image_url: string;
  thumbnail_url: string | null;
  medium_url: string | null;
  original_url: string | null;
  width: number;
  height: number;
  file_size: number;
}

function mapRowToPage(row: Record<string, unknown>): AlbumPage {
  return {
    id: row.id as string,
    album_version_id: row.album_version_id as string,
    page_number: row.page_number as number,
    spread_number: row.spread_number as number,
    orientation: (row.orientation as AlbumPage['orientation']) ?? 'portrait',
    image_url: row.image_url as string,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
    medium_url: (row.medium_url as string) ?? null,
    original_url: (row.original_url as string) ?? null,
    width: row.width as number,
    height: row.height as number,
    file_size: row.file_size as number,
    created_at: row.created_at as string,
  };
}

export async function createPage(data: PageInsertData): Promise<AlbumPage> {
  const { data: result, error } = await supabase
    .from('album_pages')
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to create page: ${error.message}`, 500, error);
  }

  return mapRowToPage(result);
}

export async function getPagesByVersion(versionId: string): Promise<AlbumPage[]> {
  const { data, error } = await supabase
    .from('album_pages')
    .select('*')
    .eq('album_version_id', versionId)
    .order('page_number', { ascending: true });

  if (error) {
    throw new ApiError(`Failed to fetch pages: ${error.message}`, 500, error);
  }

  return (data ?? []).map(mapRowToPage);
}

export async function deletePage(id: string): Promise<void> {
  const { error } = await supabase
    .from('album_pages')
    .delete()
    .eq('id', id);

  if (error) {
    throw new ApiError(`Failed to delete page: ${error.message}`, 500, error);
  }
}

export async function getNextPageNumber(versionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('album_pages')
    .select('page_number')
    .eq('album_version_id', versionId)
    .order('page_number', { ascending: false })
    .limit(1);

  if (error) {
    throw new ApiError(`Failed to get next page number: ${error.message}`, 500, error);
  }

  return (data?.[0]?.page_number ?? 0) + 1;
}
