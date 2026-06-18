import { supabaseIsReady, supabaseMissingVars } from '@/services/supabase/client';

export function EnvBanner() {
  if (supabaseIsReady) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-lg rounded-2xl border-2 border-red-300 bg-red-50 p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-3xl">&#9888;</span>
        </div>
        <h1 className="mb-2 text-xl font-bold text-red-800">Configuration Error</h1>
        <p className="mb-4 text-base text-red-700">
          The application could not connect to its database because environment variables are missing.
        </p>
        <div className="mb-6 rounded-xl bg-bg-primary p-4 text-left">
          <p className="mb-2 text-sm font-bold text-text-secondary">Missing variables:</p>
          <ul className="space-y-1">
            {supabaseMissingVars.map((v) => (
              <li key={v} className="font-mono text-sm text-red-600">
                {v}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-bg-primary p-4 text-left text-sm text-text-secondary">
          <p className="mb-1 font-bold text-text-secondary">To fix this:</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>Copy <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">.env.example</code> to <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">.env</code></li>
            <li>Fill in your Supabase project credentials</li>
            <li>Restart the dev server or redeploy</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
