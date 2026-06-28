import { supabase } from './client';

type StorageProvider = 'local' | 'server';

const STORAGE_PREFIXES = {
  review: 'albumflow_review_',
  cycle: 'albumflow_cycle_',
  timeline: 'albumflow_timeline_',
  approval: 'albumflow_approval_',
  requests: 'albumflow_requests_',
  voice: 'albumflow_voice_',
  updates: 'albumflow_updates_',
} as const;

async function getExistingData(albumId: string): Promise<Record<string, unknown> | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;
  try {
    const { data, error } = await supabase.rpc('get_review_data', {
      p_album_id: albumId,
    });
    if (!error && data && typeof data === 'object') return data as Record<string, unknown>;
  } catch (e) {
    console.warn('[reviewData] getExistingData error:', e);
  }
  return null;
}

export async function saveReviewData(albumId: string, dataSlice: Record<string, unknown>): Promise<StorageProvider> {
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    try {
      const existing = await getExistingData(albumId);
      const merged = { ...existing, ...dataSlice };
      const { error } = await supabase.rpc('upsert_review_data', {
        p_album_id: albumId,
        p_data: merged,
      });
      if (!error) return 'server';
    } catch {
      // Fall through to localStorage
    }
  }
  const key = Object.keys(dataSlice)[0] || 'data';
  try {
    localStorage.setItem(`albumflow_${key}_${albumId}`, JSON.stringify(dataSlice[key]));
  } catch {
    // storage full
  }
  return 'local';
}

export async function loadReviewData<T>(albumId: string, key?: string): Promise<T | null> {
  const existing = await getExistingData(albumId);
  if (existing) {
    if (key && existing[key] !== undefined) return existing[key] as T;
    if (!key) return existing as T;
    return null;
  }

  if (key) {
    try {
      const raw = localStorage.getItem(`albumflow_${key}_${albumId}`);
      if (raw) return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export async function clearReviewData(albumId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    try {
      await supabase.rpc('upsert_review_data', {
        p_album_id: albumId,
        p_data: {},
      });
    } catch {
      // Continue to clear local
    }
  }
  for (const prefix of Object.values(STORAGE_PREFIXES)) {
    localStorage.removeItem(prefix + albumId);
  }
}
