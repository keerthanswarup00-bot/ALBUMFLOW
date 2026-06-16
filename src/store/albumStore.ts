import { create } from 'zustand';
import type { Album, AlbumVersion, AlbumPage, AlbumFormData, AlbumStatus } from '@/types';
import * as albumService from '@/services/supabase/albums';
import * as versionsService from '@/services/supabase/versions';
import * as pagesService from '@/services/supabase/pages';

interface AlbumState {
  albums: Album[];
  currentAlbum: Album | null;
  versions: AlbumVersion[];
  currentVersion: AlbumVersion | null;
  pages: AlbumPage[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchAlbums: () => Promise<void>;
  fetchAlbumById: (id: string) => Promise<void>;
  createAlbum: (data: AlbumFormData, slug?: string) => Promise<Album>;
  updateAlbum: (id: string, data: Partial<AlbumFormData> & { status?: AlbumStatus; slug?: string }) => Promise<void>;
  deleteAlbum: (id: string) => Promise<void>;
  fetchAlbumPages: (albumId: string) => Promise<void>;
  clearCurrentAlbum: () => void;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  setVersions: (versions: AlbumVersion[]) => void;
  setCurrentVersion: (version: AlbumVersion | null) => void;
  addVersion: (version: AlbumVersion) => void;
  setPages: (pages: AlbumPage[]) => void;
  addPage: (page: AlbumPage) => void;
  removePage: (id: string) => void;
}

const initialState = {
  albums: [],
  currentAlbum: null,
  versions: [],
  currentVersion: null,
  pages: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

export const useAlbumStore = create<AlbumState>((set) => ({
  ...initialState,

  fetchAlbums: async () => {
    set({ isLoading: true, error: null });
    try {
      const albums = await albumService.getActiveAlbums();
      set({ albums, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch albums';
      set({ error: message, isLoading: false });
    }
  },

  fetchAlbumById: async (id: string) => {
    set({ isLoading: true, error: null, currentAlbum: null });
    try {
      const album = await albumService.getAlbumById(id);
      set({ currentAlbum: album, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch album';
      set({ error: message, isLoading: false });
    }
  },

  createAlbum: async (data: AlbumFormData, slug?: string) => {
    set({ isSaving: true, error: null });
    try {
      const album = await albumService.createAlbum(data, slug);
      set((state) => ({
        albums: [album, ...state.albums],
        isSaving: false,
      }));
      return album;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create album';
      set({ error: message, isSaving: false });
      throw err;
    }
  },

  updateAlbum: async (id: string, data: Partial<AlbumFormData> & { status?: AlbumStatus; slug?: string }) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await albumService.updateAlbum(id, data);
      set((state) => ({
        albums: state.albums.map((a) => (a.id === id ? updated : a)),
        currentAlbum: state.currentAlbum?.id === id ? updated : state.currentAlbum,
        isSaving: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update album';
      set({ error: message, isSaving: false });
      throw err;
    }
  },

  deleteAlbum: async (id: string) => {
    set({ isSaving: true, error: null });
    try {
      await albumService.deleteAlbum(id);
      set((state) => ({
        albums: state.albums.filter((a) => a.id !== id),
        currentAlbum: state.currentAlbum?.id === id ? null : state.currentAlbum,
        isSaving: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete album';
      set({ error: message, isSaving: false });
      throw err;
    }
  },

  fetchAlbumPages: async (albumId: string) => {
    try {
      const versions = await versionsService.getVersions(albumId);
      set({ versions });
      if (versions.length > 0) {
        const pages = await pagesService.getPagesByVersion(versions[0].id);
        set({ pages, currentVersion: versions[0] });
      } else {
        set({ pages: [], currentVersion: null });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch album pages';
      set({ error: message });
    }
  },

  clearCurrentAlbum: () => set({ currentAlbum: null }),

  clearError: () => set({ error: null }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  setVersions: (versions) => set({ versions }),
  setCurrentVersion: (currentVersion) => set({ currentVersion }),

  addVersion: (version) =>
    set((state) => ({ versions: [...state.versions, version] })),

  setPages: (pages) => set({ pages }),

  addPage: (page) =>
    set((state) => ({ pages: [...state.pages, page] })),

  removePage: (id) =>
    set((state) => ({
      pages: state.pages.filter((p) => p.id !== id),
    })),

  reset: () => set(initialState),
}));
