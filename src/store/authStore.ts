import { create } from 'zustand';
import type { User, Profile } from '@/types';
import * as authService from '@/services/supabase/auth';
import * as profileService from '@/services/supabase/profiles';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata: {
    studio_name?: string;
    owner_name?: string;
    phone_number?: string;
  }) => Promise<{ user: User | null; session: boolean }>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  loadProfile: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  initialize: async () => {
    try {
      const result = await authService.getCurrentSession();
      const user = result?.user ?? null;
      const profile = result?.profile ?? null;
      set({
        user,
        profile,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signInWithEmail(email, password);
      set({
        user: result.user,
        profile: result.profile ?? null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  signUp: async (email, password, metadata) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.signUp(email, password, metadata);
      if (result.session) {
        set({
          user: result.user,
          profile: result.profile ?? null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          user: result.user,
          isLoading: false,
          error: null,
        });
      }
      return { user: result.user, session: !!result.session };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.signOut();
    } finally {
      set({ user: null, profile: null, isAuthenticated: false, error: null });
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      await authService.deleteAccount();
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  loadProfile: async () => {
    try {
      const profile = await profileService.getProfile();
      set({ profile });
    } catch {
      // silently fail - profile loading is non-critical
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
