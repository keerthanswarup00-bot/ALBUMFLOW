import { supabase } from './client';
import { ApiError } from '@/utils/errors';
import type { Profile } from '@/types';

function logError(context: string, error: unknown): void {
  console.error(`[profiles] ${context}:`, error);
  if (error && typeof error === 'object' && 'code' in error) {
    console.error(`[profiles] SQL code: ${(error as { code: string }).code}`);
  }
}

async function ensureProfile(userId: string, email?: string): Promise<Profile> {
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!selectError && existing) return existing;

  if (selectError && selectError.code !== 'PGRST116') {
    logError('ensureProfile select', selectError);
  }

  const defaultName = email ? email.split('@')[0] : 'User';

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      studio_name: '',
      owner_name: defaultName,
      phone_number: '',
    })
    .select()
    .single();

  if (insertError) {
    logError('ensureProfile insert', insertError);
    throw new ApiError(`Failed to create profile: ${insertError.message}`, 500, insertError);
  }

  return created;
}

export async function getProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return ensureProfile(userData.user.id, userData.user.email);
    }
    logError('getProfile', error);
    throw new ApiError(`Failed to fetch profile: ${error.message}`, 500, error);
  }

  return data;
}

export async function updateProfile(updates: {
  studio_name?: string;
  owner_name?: string;
  phone_number?: string;
  studio_logo_url?: string;
}): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new ApiError('Not authenticated', 401);
  }

  await ensureProfile(userData.user.id, userData.user.email);

  const payload: Record<string, unknown> = {};
  if (updates.studio_name !== undefined) payload.studio_name = updates.studio_name;
  if (updates.owner_name !== undefined) payload.owner_name = updates.owner_name;
  if (updates.phone_number !== undefined) payload.phone_number = updates.phone_number;
  if (updates.studio_logo_url !== undefined) payload.studio_logo_url = updates.studio_logo_url;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('user_id', userData.user.id)
    .select()
    .single();

  if (error) {
    logError('updateProfile', error);
    throw new ApiError(`Failed to update profile: ${error.message}`, 500, error);
  }

  return data;
}
