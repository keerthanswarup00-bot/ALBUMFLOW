import { create } from 'zustand';
import type { AlbumUpdate, AlbumUpdatePage } from '@/types/viewer';

const UPDATES_PREFIX = 'albumflow_updates_';

function loadUpdates(albumId: string): AlbumUpdate[] {
  try {
    const raw = localStorage.getItem(`${UPDATES_PREFIX}${albumId}`);
    if (raw) return JSON.parse(raw) as AlbumUpdate[];
  } catch { /* ignore */ }
  return [];
}

function saveUpdates(albumId: string, updates: AlbumUpdate[]) {
  try {
    localStorage.setItem(`${UPDATES_PREFIX}${albumId}`, JSON.stringify(updates));
  } catch { /* ignore */ }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface UpdateState {
  updates: Record<string, AlbumUpdate[]>;

  getUpdates: (albumId: string) => AlbumUpdate[];
  getLatestUpdate: (albumId: string) => AlbumUpdate | null;
  getUpdateByNumber: (albumId: string, number: number) => AlbumUpdate | null;
  createUpdate: (albumId: string, notes: string, pages: AlbumUpdatePage[]) => AlbumUpdate;
  getUpdateCount: (albumId: string) => number;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updates: {},

  getUpdates: (albumId: string) => {
    const cached = get().updates[albumId];
    if (cached) return cached;
    const loaded = loadUpdates(albumId);
    set((s) => ({ updates: { ...s.updates, [albumId]: loaded } }));
    return loaded;
  },

  getLatestUpdate: (albumId: string) => {
    const updates = get().getUpdates(albumId);
    return updates.length > 0 ? updates[updates.length - 1] : null;
  },

  getUpdateByNumber: (albumId: string, number: number) => {
    const updates = get().getUpdates(albumId);
    return updates.find((u) => u.update_number === number) ?? null;
  },

  createUpdate: (albumId: string, notes: string, pages: AlbumUpdatePage[]) => {
    const updates = get().getUpdates(albumId);
    const updateNumber = updates.length + 1;
    const newUpdate: AlbumUpdate = {
      id: generateId(),
      album_id: albumId,
      update_number: updateNumber,
      label: updateNumber === 1 ? 'Original Upload' : `Album Update ${updateNumber - 1}`,
      notes,
      pages,
      page_count: pages.length,
      created_at: Date.now(),
    };
    const updated = [...updates, newUpdate];
    set((s) => ({ updates: { ...s.updates, [albumId]: updated } }));
    saveUpdates(albumId, updated);
    return newUpdate;
  },

  getUpdateCount: (albumId: string) => {
    return get().getUpdates(albumId).length;
  },
}));
