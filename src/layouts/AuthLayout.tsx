import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-50 px-4 py-12 safe-area-inset">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">AlbumFlow</h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Wedding album proofing made simple
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
