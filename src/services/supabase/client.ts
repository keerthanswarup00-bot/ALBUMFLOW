import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENV, getMissingEnvVars } from '@/env';

const missing = getMissingEnvVars();
const isReady = missing.length === 0;

function buildMissingVarProxy(): SupabaseClient {
  const msg =
    `Missing Supabase environment variables: ${missing.join(', ')}. ` +
    `The app will not function correctly until these are set.`;
  console.error('[albumflow]', msg);

  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      return () => {
        throw new Error(
          `Supabase client method "${String(prop)}" called, but ${msg}`
        );
      };
    },
  });
}

let client: SupabaseClient;

if (isReady) {
  client = createClient(ENV.SUPABASE_URL!, ENV.SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  client = buildMissingVarProxy();
}

export const supabase = client;
export const supabaseIsReady = isReady;
export const supabaseMissingVars = missing;
