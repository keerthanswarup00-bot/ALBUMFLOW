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
    studio_name: null,
    studio_logo_url: null,
    phone: null,
    website: null,
    created_at: '',
    updated_at: '',
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

  return {
    user: mapSupabaseUserToAppUser(data.user),
    session: {
      user: mapSupabaseUserToAppUser(data.user),
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

  return {
    user: mapSupabaseUserToAppUser(data.session.user),
    session: {
      user: mapSupabaseUserToAppUser(data.session.user),
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

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback(mapSupabaseUserToAppUser(session.user));
    } else {
      callback(null);
    }
  });
}
