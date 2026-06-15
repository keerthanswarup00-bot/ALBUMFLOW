import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import * as authService from '@/services/supabase/auth';

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    login(email, password);
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
          <h2 className="text-2xl font-semibold text-gray-900">Reset Password</h2>
          <p className="mt-1 text-sm text-gray-500">
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
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {resetSent ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Reset link sent! Check your email.
          </div>
        ) : (
          <Button onClick={handleResetPassword} isLoading={resetLoading} size="lg" className="w-full">
            Send Reset Link
          </Button>
        )}

        <button
          onClick={() => { setShowReset(false); setResetSent(false); clearError(); }}
          className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Sign in</h2>
        <p className="mt-1 text-sm text-gray-500">
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
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
          className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          Forgot password?
        </button>
      </div>
    </form>
  );
}
