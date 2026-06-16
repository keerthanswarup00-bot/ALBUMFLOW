import { create } from 'zustand';
import type { ViewerRequestChange, RequestChangeCategory, PinPlacement, RequestDraft } from '@/types/viewer';
import { REVIEW_CONFIG } from '@/constants/review';

interface RequestState {
  requests: Record<string, ViewerRequestChange[]>;
  drafts: Record<string, RequestDraft | null>;

  getRequests: (albumId: string) => ViewerRequestChange[];
  addRequest: (albumId: string, pageNumber: number, category: RequestChangeCategory, message: string, pin: PinPlacement | null) => void;
  updateRequest: (albumId: string, requestId: string, updates: Partial<ViewerRequestChange>) => void;
  deleteRequest: (albumId: string, requestId: string) => void;
  getRequestsByPage: (albumId: string, pageNumber: number) => ViewerRequestChange[];
  getRequestCount: (albumId: string) => number;
  getPinRequests: (albumId: string) => ViewerRequestChange[];
  getGeneralRequests: (albumId: string) => ViewerRequestChange[];
  getOpenRequests: (albumId: string) => ViewerRequestChange[];
  getUnsubmittedCount: (albumId: string) => number;
  markAllAsSubmitted: (albumId: string) => void;
  saveDraft: (albumId: string, draft: RequestDraft) => void;
  getDraft: (albumId: string) => RequestDraft | null;
  clearDraft: (albumId: string) => void;
}

function loadRequests(albumId: string): ViewerRequestChange[] {
  try {
    const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.requestsPrefix}${albumId}`);
    if (raw) return JSON.parse(raw) as ViewerRequestChange[];
  } catch {
    // localStorage read failed
  }
  return [];
}

function saveRequests(albumId: string, requests: ViewerRequestChange[]) {
  try {
    localStorage.setItem(`${REVIEW_CONFIG.storage.requestsPrefix}${albumId}`, JSON.stringify(requests));
  } catch {
    // localStorage write failed (quota or unavailable)
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  requests: {},
  drafts: {},

  getRequests: (albumId: string) => {
    const cached = get().requests[albumId];
    if (cached) return cached;
    const loaded = loadRequests(albumId);
    set((state) => ({ requests: { ...state.requests, [albumId]: loaded } }));
    return loaded;
  },

  addRequest: (albumId: string, pageNumber: number, category: RequestChangeCategory, message: string, pin: PinPlacement | null) => {
    const requests = get().getRequests(albumId);
    const newRequest: ViewerRequestChange = {
      id: generateId(),
      album_id: albumId,
      page_number: pageNumber,
      category,
      message,
      pin,
      status: 'open',
      submitted: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    const updated = [...requests, newRequest];
    set((state) => ({ requests: { ...state.requests, [albumId]: updated } }));
    saveRequests(albumId, updated);
  },

  updateRequest: (albumId: string, requestId: string, updates: Partial<ViewerRequestChange>) => {
    const requests = get().getRequests(albumId);
    const updated = requests.map((r) =>
      r.id === requestId ? { ...r, ...updates, updated_at: Date.now() } : r
    );
    set((state) => ({ requests: { ...state.requests, [albumId]: updated } }));
    saveRequests(albumId, updated);
  },

  deleteRequest: (albumId: string, requestId: string) => {
    const requests = get().getRequests(albumId);
    const updated = requests.filter((r) => r.id !== requestId);
    set((state) => ({ requests: { ...state.requests, [albumId]: updated } }));
    saveRequests(albumId, updated);
  },

  getRequestsByPage: (albumId: string, pageNumber: number) => {
    return get().getRequests(albumId).filter((r) => r.page_number === pageNumber);
  },

  getRequestCount: (albumId: string) => {
    return get().getRequests(albumId).length;
  },

  getPinRequests: (albumId: string) => {
    return get().getRequests(albumId).filter((r) => r.category === 'pin');
  },

  getGeneralRequests: (albumId: string) => {
    return get().getRequests(albumId).filter((r) => r.category === 'general');
  },

  getOpenRequests: (albumId: string) => {
    return get().getRequests(albumId).filter((r) => r.status === 'open');
  },

  getUnsubmittedCount: (albumId: string) => {
    return get().getRequests(albumId).filter((r) => !r.submitted).length;
  },

  markAllAsSubmitted: (albumId: string) => {
    const requests = get().getRequests(albumId);
    const updated = requests.map((r) => ({ ...r, submitted: true, updated_at: Date.now() }));
    set((state) => ({ requests: { ...state.requests, [albumId]: updated } }));
    saveRequests(albumId, updated);
  },

  saveDraft: (albumId: string, draft: RequestDraft) => {
    set((state) => ({ drafts: { ...state.drafts, [albumId]: draft } }));
    try {
      localStorage.setItem(`${REVIEW_CONFIG.storage.draftPrefix}${albumId}`, JSON.stringify(draft));
    } catch {
      // localStorage write failed
    }
  },

  getDraft: (albumId: string) => {
    const cached = get().drafts[albumId];
    if (cached !== undefined) return cached;
    try {
      const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.draftPrefix}${albumId}`);
      if (raw) {
        const draft = JSON.parse(raw) as RequestDraft;
        set((state) => ({ drafts: { ...state.drafts, [albumId]: draft } }));
        return draft;
      }
    } catch {
      // localStorage read failed
    }
    set((state) => ({ drafts: { ...state.drafts, [albumId]: null } }));
    return null;
  },

  clearDraft: (albumId: string) => {
    set((state) => ({ drafts: { ...state.drafts, [albumId]: null } }));
    try {
      localStorage.removeItem(`${REVIEW_CONFIG.storage.draftPrefix}${albumId}`);
    } catch {
      // localStorage removal failed
    }
  },
}));
