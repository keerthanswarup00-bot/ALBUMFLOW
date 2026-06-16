import { supabase } from './client';
import { ApiError } from '@/utils/errors';

export interface ReviewAnalytics {
  id: string;
  album_id: string;
  first_opened_at: string | null;
  last_viewed_at: string | null;
  pages_viewed: number;
  total_viewing_seconds: number;
  comments_count: number;
  voice_notes_count: number;
  review_submitted_at: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getAnalytics(albumId: string): Promise<ReviewAnalytics | null> {
  const { data, error } = await supabase
    .from('review_analytics')
    .select('*')
    .eq('album_id', albumId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new ApiError(`Failed to fetch analytics: ${error.message}`, 500, error);
  }

  return data;
}

export async function getAllAnalytics(): Promise<ReviewAnalytics[]> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new ApiError('Not authenticated', 401);

  const { data, error } = await supabase
    .from('review_analytics')
    .select('*')
    .in('album_id', (await supabase
      .from('albums')
      .select('id')
      .eq('designer_id', userData.user.id)
    ).data?.map(a => a.id) ?? []);

  if (error) throw new ApiError(`Failed to fetch analytics: ${error.message}`, 500, error);
  return data ?? [];
}
