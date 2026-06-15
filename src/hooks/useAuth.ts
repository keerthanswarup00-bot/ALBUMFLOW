import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { onAuthStateChange } from '@/services/supabase/auth';

export function useAuth() {
  const initialize = useAuthStore((state) => state.initialize);
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const subscription = onAuthStateChange((u) => {
      setUser(u);
    });

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, [setUser]);

  return { user, isAuthenticated, isLoading, error, initialize, setUser };
}
