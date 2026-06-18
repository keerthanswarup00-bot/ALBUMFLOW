import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-secondary dark:bg-bg-primary px-4 py-12 safe-area-inset">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary">AlbumFlow</h1>
        <p className="mt-2 text-center text-sm text-text-secondary dark:text-text-secondary">
          Wedding album proofing made simple
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
