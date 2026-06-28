import { supabase } from './client';
import { AuthError } from '@/utils/errors';
import type { User, Profile } from '@/types';

function mapSupabaseUserToAppUser(sbUser: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    full_name: (sbUser.user_metadata?.full_name as string) ?? '',
    avatar_url: (sbUser.user_metadata?.avatar_url as string) ?? null,
    studio_name: (sbUser.user_metadata?.studio_name as string) ?? null,
    studio_logo_url: null,
    phone: null,
    website: null,
    created_at: '',
    updated_at: '',
  };
}

function enrichUserFromProfile(user: User, profile: Profile): User {
  return {
    ...user,
    studio_name: profile.studio_name || user.studio_name,
    studio_logo_url: profile.studio_logo_url || null,
    phone: profile.phone_number || null,
    full_name: profile.owner_name || user.full_name,
  };
}

async function enrichUserWithProfile(user: User): Promise<{ user: User; profile: Profile | null }> {
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      return { user: enrichUserFromProfile(user, profileData), profile: profileData };
    }

    if (profileError?.code === 'PGRST116') {
      const defaultName = user.email?.split('@')[0] || 'User';
      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          studio_name: '',
          owner_name: defaultName,
          phone_number: '',
        })
        .select()
        .single();
      if (created) {
        return { user: enrichUserFromProfile(user, created), profile: created };
      } else if (insertError) {
        console.error('[auth] Failed to create profile:', insertError);
      }
    }
  } catch {
    // Profile fetch is non-critical
  }
  return { user, profile: null };
}

export async function signUp(email: string, password: string, metadata: {
  studio_name?: string;
  owner_name?: string;
  phone_number?: string;
  full_name?: string;
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: metadata.full_name || metadata.owner_name || email.split('@')[0],
        studio_name: metadata.studio_name || '',
        owner_name: metadata.owner_name || '',
        phone_number: metadata.phone_number || '',
      },
    },
  });

  if (error) {
    throw new AuthError(error.message, error.code ?? 'SIGN_UP_ERROR');
  }

  if (!data.user) {
    throw new AuthError('No user returned from sign up');
  }

  const user = mapSupabaseUserToAppUser(data.user);
  const { user: enrichedUser, profile } = await enrichUserWithProfile(user);

  return {
    user: enrichedUser,
    profile,
    session: data.session ? {
      user: enrichedUser,
      access_token: data.session.access_token,
      expires_at: data.session.expires_at ?? 0,
    } : null,
  };
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AuthError(error.message, error.code ?? 'SIGN_IN_ERROR');
  }

  if (!data.user) {
    throw new AuthError('No user returned from sign in');
  }

  const user = mapSupabaseUserToAppUser(data.user);
  const { user: enrichedUser, profile } = await enrichUserWithProfile(user);

  return {
    user: enrichedUser,
    profile,
    session: {
      user: enrichedUser,
      access_token: data.session?.access_token ?? '',
      expires_at: data.session?.expires_at ?? 0,
    },
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthError(error.message, 'SIGN_OUT_ERROR');
  }
}

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new AuthError(error.message, 'SESSION_ERROR');
  }

  if (!data.session?.user) {
    return null;
  }

  const sbUser = data.session.user;
  const user = mapSupabaseUserToAppUser(sbUser);

  let profile: Profile | null = null;
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      profile = profileData;
    } else if (profileError?.code === 'PGRST116') {
      const defaultName = sbUser.email?.split('@')[0] || 'User';
      const { data: created, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          studio_name: '',
          owner_name: defaultName,
          phone_number: '',
        })
        .select()
        .single();
      if (created) {
        profile = created;
      } else if (insertError) {
        console.error('[auth] Failed to create profile during init:', insertError);
      }
    } else if (profileError) {
      console.error('[auth] Failed to fetch profile during init:', profileError);
    }
  } catch {
    // Profile fetch is non-critical; continue with un-enriched user
  }

  const enrichedUser = profile ? enrichUserFromProfile(user, profile) : user;

  return {
    user: enrichedUser,
    profile,
    session: {
      user: enrichedUser,
      access_token: data.session.access_token,
      expires_at: data.session.expires_at ?? 0,
    },
  };
}

export async function resetPasswordForEmail(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) {
    throw new AuthError(error.message, error.code ?? 'RESET_PASSWORD_ERROR');
  }
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    throw new AuthError(error.message, error.code ?? 'UPDATE_PASSWORD_ERROR');
  }
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw new AuthError(error.message, 'DELETE_ACCOUNT_ERROR');
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const { user: enriched } = await enrichUserWithProfile(mapSupabaseUserToAppUser(session.user));
      callback(enriched);
    } else {
      callback(null);
    }
  });
}
