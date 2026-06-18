import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ROUTES } from '@/constants/routes';
import * as authService from '@/services/supabase/auth';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
    } catch {
      // Error is handled in the store's state
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) return;
    setResetLoading(true);
    clearError();
    try {
      await authService.resetPasswordForEmail(email);
      setResetSent(true);
      setResetLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      useAuthStore.setState({ error: message });
      setResetLoading(false);
    }
  }

  if (showReset) {
    return (
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary">Reset Password</h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
            Enter your email to receive a reset link
          </p>
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="designer@studio.com"
          required
          autoComplete="email"
        />

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {resetSent ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 px-4 py-3 text-sm text-green-700 dark:text-green-400">
            Reset link sent! Check your email.
          </div>
        ) : (
          <Button onClick={handleResetPassword} isLoading={resetLoading} size="lg" className="w-full">
            Send Reset Link
          </Button>
        )}

        <button
          onClick={() => { setShowReset(false); setResetSent(false); clearError(); }}
          className="text-center text-sm text-text-secondary dark:text-text-secondary hover:text-text-secondary dark:hover:text-text-primary transition-colors cursor-pointer"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-text-primary dark:text-text-primary">Sign in</h2>
        <p className="mt-1 text-sm text-text-secondary dark:text-text-secondary">
          Sign in to your designer account
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="designer@studio.com"
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" isLoading={isLoading} size="lg" className="w-full">
          Sign in
        </Button>
        <button
          type="button"
          onClick={() => { setShowReset(true); clearError(); }}
          className="text-center text-sm text-text-secondary dark:text-text-secondary hover:text-text-secondary dark:hover:text-text-primary transition-colors cursor-pointer"
        >
          Forgot password?
        </button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-primary dark:border-border-primary" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-bg-primary dark:bg-bg-primary px-2 text-text-muted dark:text-text-muted">New here?</span>
        </div>
      </div>

      <Link
        to={ROUTES.SIGNUP}
        className="block w-full rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated px-6 py-3.5 text-center text-base font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary transition-colors"
      >
        Create Studio Account
      </Link>
    </form>
  );
}
