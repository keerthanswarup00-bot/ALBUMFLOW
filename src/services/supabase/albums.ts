import { supabase } from './client';
import { ApiError } from '@/utils/errors';
import type { Album, AlbumFormData } from '@/types';
import { deleteImages } from './storage';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'untitled';
}

function mapRowToAlbum(row: Record<string, unknown>): Album {
  return {
    id: row.id as string,
    designer_id: row.designer_id as string,
    client_id: (row.client_id as string) ?? null,
    client_name: row.client_name as string,
    client_email: (row.client_email as string) ?? '',
    title: row.title as string,
    description: (row.description as string) ?? null,
    event_type: (row.event_type as Album['event_type']) ?? 'wedding',
    slug: (row.slug as string) ?? null,
    cover_image_url: (row.cover_image_url as string) ?? null,
    status: (row.status as Album['status']) ?? 'draft',
    phase: (row.phase as Album['phase']) ?? 'proofing',
    deadline: (row.deadline as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function getAlbumById(id: string): Promise<Album | null> {
  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new ApiError(`Failed to fetch album: ${error.message}`, 500, error);
  }

  return data ? mapRowToAlbum(data) : null;
}

export async function createAlbum(
  formData: AlbumFormData,
  slug?: string
): Promise<Album> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new ApiError('Not authenticated', 401);
  }

  const albumSlug = slug || slugify(formData.title);

  const { count, error: countError } = await supabase
    .from('albums')
    .select('id', { count: 'exact', head: true })
    .eq('designer_id', userData.user.id)
    .eq('slug', albumSlug)
    .not('status', 'eq', 'archived');

  if (countError) {
    console.error('[albums] slug check error:', countError);
  } else if (count && count > 0) {
    throw new ApiError(`The share link "${albumSlug}" is already in use. Please choose a different slug.`, 409);
  }

  const { data, error } = await supabase
    .from('albums')
    .insert({
      designer_id: userData.user.id,
      title: formData.title,
      slug: albumSlug,
      client_name: formData.client_name || 'Untitled',
      client_email: formData.client_email || '',
      event_type: formData.event_type,
      description: formData.description || null,
      deadline: formData.deadline || null,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('[albums] createAlbum error:', error);
    console.error('[albums] SQL code:', error.code);
    console.error('[albums] SQL details:', error.details);
    console.error('[albums] SQL hint:', error.hint);
    throw new ApiError(`Failed to create album: ${error.message}`, 500, error);
  }

  return mapRowToAlbum(data);
}

export async function updateAlbum(
  id: string,
  updates: Partial<AlbumFormData & { status?: Album['status']; slug?: string; cover_image_url?: string | null }>
): Promise<Album> {
  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    payload.title = updates.title;
    if (!updates.slug) {
      payload.slug = slugify(updates.title);
    }
  }
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.client_name !== undefined) payload.client_name = updates.client_name;
  if (updates.client_email !== undefined) payload.client_email = updates.client_email;
  if (updates.event_type !== undefined) payload.event_type = updates.event_type;
  if (updates.description !== undefined) payload.description = updates.description || null;
  if (updates.deadline !== undefined) payload.deadline = updates.deadline || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.cover_image_url !== undefined) payload.cover_image_url = updates.cover_image_url;

  if (Object.keys(payload).length === 0) {
    throw new ApiError('No fields to update', 400);
  }

  const { data, error } = await supabase
    .from('albums')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to update album: ${error.message}`, 500, error);
  }

  return mapRowToAlbum(data);
}

function extractStoragePath(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/albums\/(.+)/);
  return match ? match[1] : null;
}

export async function deleteAlbum(id: string): Promise<void> {
  const { data: versions } = await supabase
    .from('album_versions')
    .select('id')
    .eq('album_id', id);

  if (versions && versions.length > 0) {
    const versionIds = versions.map(v => v.id);
    const { data: pages } = await supabase
      .from('album_pages')
      .select('original_url, image_url, thumbnail_url')
      .in('album_version_id', versionIds);

    if (pages && pages.length > 0) {
      const paths = pages.flatMap(p =>
        [extractStoragePath(p.original_url), extractStoragePath(p.image_url), extractStoragePath(p.thumbnail_url)]
          .filter(Boolean) as string[]
      );
      if (paths.length > 0) {
        deleteImages(paths).catch((err) =>
          console.error('[albums] Storage cleanup failed:', err)
        );
      }
    }
  }

  const { error } = await supabase
    .from('albums')
    .update({ status: 'archived' })
    .eq('id', id);

  if (error) {
    throw new ApiError(`Failed to delete album: ${error.message}`, 500, error);
  }
}

export async function getActiveAlbums(): Promise<Album[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new ApiError('Not authenticated', 401);
  }

  const { data, error } = await supabase
    .from('albums')
    .select('*')
    .eq('designer_id', userData.user.id)
    .not('status', 'eq', 'archived')
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(`Failed to fetch albums: ${error.message}`, 500, error);
  }

  return (data ?? []).map(mapRowToAlbum);
}
