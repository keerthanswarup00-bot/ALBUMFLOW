import { supabase } from './client';
import { AuthError } from '@/utils/errors';
import type { User } from '@/types';

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

async function enrichUserWithProfile(user: User): Promise<User> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('studio_name, studio_logo_url, phone_number, owner_name')
      .eq('user_id', user.id)
      .single();
    if (data) {
      return {
        ...user,
        studio_name: data.studio_name || user.studio_name,
        studio_logo_url: data.studio_logo_url || null,
        phone: data.phone_number || null,
        full_name: data.owner_name || user.full_name,
      };
    }
  } catch {
    // Profile fetch is non-critical; return original user
  }
  return user;
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
  const enrichedUser = await enrichUserWithProfile(user);

  return {
    user: enrichedUser,
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
  const enrichedUser = await enrichUserWithProfile(user);

  return {
    user: enrichedUser,
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

  const user = mapSupabaseUserToAppUser(data.session.user);
  const enrichedUser = await enrichUserWithProfile(user);

  return {
    user: enrichedUser,
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
  return supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback(mapSupabaseUserToAppUser(session.user));
    } else {
      callback(null);
    }
  });
}
