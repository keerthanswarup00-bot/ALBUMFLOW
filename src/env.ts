/**
 * Centralized environment variable access with startup diagnostics.
 * All VITE_* variables should be accessed through this module.
 */

export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
} as const;

const REQUIRED_VARS: Array<{ key: string; value: string | undefined; label: string }> = [
  { key: 'VITE_SUPABASE_URL', value: ENV.SUPABASE_URL, label: 'Supabase Project URL' },
  { key: 'VITE_SUPABASE_ANON_KEY', value: ENV.SUPABASE_ANON_KEY, label: 'Supabase Anon Key' },
];

export function getMissingEnvVars() {
  return REQUIRED_VARS.filter((v) => !v.value).map((v) => v.key);
}

export function hasAllEnvVars() {
  return getMissingEnvVars().length === 0;
}

const missing = getMissingEnvVars();
if (missing.length > 0) {
  if (typeof console !== 'undefined') {
    console.error(
      `[albumflow] Missing environment variables: ${missing.join(', ')}\n` +
      `  Create a .env file or set them in your deployment (Vercel, etc.).\n` +
      `  See .env.example for the required variables.`
    );
  }
}
