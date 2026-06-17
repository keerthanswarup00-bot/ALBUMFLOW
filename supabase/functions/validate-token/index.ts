import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.12';

serve(async (req: Request) => {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const { data, error } = await supabase.rpc('get_album_by_token', { p_token: token });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = data as {
      album: Record<string, unknown> | null;
      version: Record<string, unknown> | null;
      pages: Record<string, unknown>[];
    };

    if (result?.error === 'invalid_or_expired_token') {
      return new Response(JSON.stringify({ error: 'invalid_or_expired_token' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!result?.album) {
      return new Response(JSON.stringify({ error: 'album_not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
