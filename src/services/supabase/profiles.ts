import { supabase } from './client';
import { ApiError } from '@/utils/errors';
import type { Profile } from '@/types';

export async function getProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new ApiError(`Failed to fetch profile: ${error.message}`, 500, error);
  }

  return data;
}

export async function updateProfile(updates: {
  studio_name?: string;
  owner_name?: string;
  phone_number?: string;
}): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new ApiError('Not authenticated', 401);
  }

  const payload: Record<string, unknown> = {};
  if (updates.studio_name !== undefined) payload.studio_name = updates.studio_name;
  if (updates.owner_name !== undefined) payload.owner_name = updates.owner_name;
  if (updates.phone_number !== undefined) payload.phone_number = updates.phone_number;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userData.user.id)
    .select()
    .single();

  if (error) {
    throw new ApiError(`Failed to update profile: ${error.message}`, 500, error);
  }

  return data;
}
