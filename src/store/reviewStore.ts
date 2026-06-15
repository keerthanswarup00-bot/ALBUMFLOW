import { create } from 'zustand';
import type { PageReviewStatus, AlbumReviewData, AlbumReviewEntry } from '@/types/viewer';
import { REVIEW_CONFIG } from '@/constants/review';

interface ReviewState {
  data: Record<string, AlbumReviewData>;

  ensureAlbum: (albumId: string, totalPages: number) => AlbumReviewData;

  markPageViewed: (albumId: string, pageNumber: number, totalPages: number) => void;

  markPageReviewed: (albumId: string, pageNumber: number, totalPages: number) => void;

  undoReview: (albumId: string, pageNumber: number, totalPages: number) => void;

  getReviewedCount: (albumId: string) => number;

  getViewedCount: (albumId: string) => number;

  getCompletionPercent: (albumId: string, totalPages: number) => number;

  getUnreviewedPages: (albumId: string, totalPages: number) => number[];

  getReviewedPages: (albumId: string) => number[];
  isAlbumApproved: (albumId: string) => boolean;
  markAlbumApproved: (albumId: string) => void;

  getPageStatus: (albumId: string, pageNumber: number) => PageReviewStatus | undefined;
}

function loadFromStorage(albumId: string): AlbumReviewData | null {
  try {
    const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.prefix}${albumId}`);
    if (raw) return JSON.parse(raw) as AlbumReviewData;
  } catch {
    // storage unavailable or corrupted
  }
  return null;
}

function saveToStorage(albumId: string, data: AlbumReviewData) {
  try {
    localStorage.setItem(`${REVIEW_CONFIG.storage.prefix}${albumId}`, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

function emptyAlbumData(albumId: string, totalPages: number): AlbumReviewData {
  return {
    album_id: albumId,
    total_pages: totalPages,
    pages: {},
    updated_at: Date.now(),
  };
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  data: {},

  ensureAlbum: (albumId: string, totalPages: number) => {
    const cached = get().data[albumId];
    if (cached) return cached;

    const stored = loadFromStorage(albumId);
    if (stored) {
      set((state) => ({
        data: { ...state.data, [albumId]: stored },
      }));
      return stored;
    }

    const fresh = emptyAlbumData(albumId, totalPages);
    set((state) => ({
      data: { ...state.data, [albumId]: fresh },
    }));
    return fresh;
  },

  markPageViewed: (albumId: string, pageNumber: number, totalPages: number) => {
    const album = get().ensureAlbum(albumId, totalPages);
    const existing = album.pages[pageNumber];
    if (existing && existing.status !== 'viewed') return;

    const entry: AlbumReviewEntry = {
      page_number: pageNumber,
      status: existing?.status ?? 'viewed',
      updated_at: Date.now(),
    };

    const updated: AlbumReviewData = {
      ...album,
      pages: { ...album.pages, [pageNumber]: entry },
      updated_at: Date.now(),
    };

    set((state) => ({
      data: { ...state.data, [albumId]: updated },
    }));
    saveToStorage(albumId, updated);
  },

  markPageReviewed: (albumId: string, pageNumber: number, totalPages: number) => {
    const album = get().ensureAlbum(albumId, totalPages);
    const existing = album.pages[pageNumber];
    if (existing?.status === 'reviewed') return;

    const entry: AlbumReviewEntry = {
      page_number: pageNumber,
      status: 'reviewed',
      updated_at: Date.now(),
    };

    const updated: AlbumReviewData = {
      ...album,
      pages: { ...album.pages, [pageNumber]: entry },
      updated_at: Date.now(),
    };

    set((state) => ({
      data: { ...state.data, [albumId]: updated },
    }));
    saveToStorage(albumId, updated);
  },

  undoReview: (albumId: string, pageNumber: number, totalPages: number) => {
    const album = get().ensureAlbum(albumId, totalPages);
    const existing = album.pages[pageNumber];
    if (!existing || existing.status !== 'reviewed') return;

    const entry: AlbumReviewEntry = {
      page_number: pageNumber,
      status: 'viewed',
      updated_at: Date.now(),
    };

    const updated: AlbumReviewData = {
      ...album,
      pages: { ...album.pages, [pageNumber]: entry },
      updated_at: Date.now(),
    };

    set((state) => ({
      data: { ...state.data, [albumId]: updated },
    }));
    saveToStorage(albumId, updated);
  },

  getReviewedCount: (albumId: string) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    if (!album) return 0;
    return Object.values(album.pages).filter((p) => p.status === 'reviewed').length;
  },

  getViewedCount: (albumId: string) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    if (!album) return 0;
    return Object.values(album.pages).filter((p) => p.status === 'viewed' || p.status === 'reviewed').length;
  },

  getCompletionPercent: (albumId: string, totalPages: number) => {
    if (totalPages === 0) return 0;
    const count = get().getReviewedCount(albumId);
    return Math.round((count / totalPages) * 100);
  },

  getUnreviewedPages: (albumId: string, totalPages: number) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    if (!album) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const unreviewed: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      const entry = album.pages[i];
      if (!entry || entry.status !== 'reviewed') {
        unreviewed.push(i);
      }
    }
    return unreviewed;
  },

  getReviewedPages: (albumId: string) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    if (!album) return [];
    return Object.values(album.pages)
      .filter((p) => p.status === 'reviewed')
      .map((p) => p.page_number);
  },

  isAlbumApproved: (albumId: string) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    return album?.approved_at != null;
  },

  markAlbumApproved: (albumId: string) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    if (!album) return;
    const updated: AlbumReviewData = {
      ...album,
      approved_at: Date.now(),
      updated_at: Date.now(),
    };
    set((state) => ({
      data: { ...state.data, [albumId]: updated },
    }));
    saveToStorage(albumId, updated);
  },

  getPageStatus: (albumId: string, pageNumber: number) => {
    const album = get().data[albumId] ?? loadFromStorage(albumId);
    return album?.pages[pageNumber]?.status;
  },
}));
