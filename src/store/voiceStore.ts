import { create } from 'zustand';
import type { VoiceRequest, VoiceDraft } from '@/types/viewer';
import { REVIEW_CONFIG } from '@/constants/review';

interface VoiceState {
  recordings: Record<string, VoiceRequest[]>;
  drafts: Record<string, VoiceDraft | null>;
  error: string | null;

  getRecordings: (albumId: string) => VoiceRequest[];
  addRecording: (albumId: string, pageNumber: number, duration: number, audio_url: string) => void;
  deleteRecording: (albumId: string, recordingId: string) => void;
  getRecordingsByPage: (albumId: string, pageNumber: number) => VoiceRequest[];
  getRecordingCount: (albumId: string) => number;

  saveDraft: (albumId: string, draft: VoiceDraft) => void;
  getDraft: (albumId: string) => VoiceDraft | null;
  clearDraft: (albumId: string) => void;
  clearError: () => void;
}

function loadRecordings(
  albumId: string,
  onError?: (error: string) => void
): VoiceRequest[] {
  try {
    const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.voicePrefix}${albumId}`);
    if (raw) return JSON.parse(raw) as VoiceRequest[];
  } catch (e) {
    onError?.((e as Error).message);
  }
  return [];
}

function saveRecordings(
  albumId: string,
  recordings: VoiceRequest[],
  onError?: (error: string) => void
) {
  try {
    localStorage.setItem(`${REVIEW_CONFIG.storage.voicePrefix}${albumId}`, JSON.stringify(recordings));
  } catch (e) {
    onError?.((e as Error).message);
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  recordings: {},
  drafts: {},
  error: null,

  getRecordings: (albumId: string) => {
    const cached = get().recordings[albumId];
    if (cached) return cached;
    const loaded = loadRecordings(albumId, (msg) => set({ error: msg }));
    set((state) => ({ recordings: { ...state.recordings, [albumId]: loaded } }));
    return loaded;
  },

  addRecording: (albumId: string, pageNumber: number, duration: number, audio_url: string) => {
    const recordings = get().getRecordings(albumId);
    const newRecording: VoiceRequest = {
      id: generateId(),
      album_id: albumId,
      page_number: pageNumber,
      duration,
      audio_url,
      created_at: Date.now(),
      status: 'open',
    };
    const updated = [...recordings, newRecording];
    set((state) => ({ recordings: { ...state.recordings, [albumId]: updated } }));
    saveRecordings(albumId, updated, (msg) => set({ error: msg }));
  },

  deleteRecording: (albumId: string, recordingId: string) => {
    const recordings = get().getRecordings(albumId);
    const updated = recordings.filter((r) => r.id !== recordingId);
    set((state) => ({ recordings: { ...state.recordings, [albumId]: updated } }));
    saveRecordings(albumId, updated, (msg) => set({ error: msg }));
  },

  getRecordingsByPage: (albumId: string, pageNumber: number) => {
    return get().getRecordings(albumId).filter((r) => r.page_number === pageNumber);
  },

  getRecordingCount: (albumId: string) => {
    return get().getRecordings(albumId).length;
  },

  saveDraft: (albumId: string, draft: VoiceDraft) => {
    set((state) => ({ drafts: { ...state.drafts, [albumId]: draft } }));
    try {
      const meta = { duration: draft.duration, saved_at: draft.saved_at };
      localStorage.setItem(`${REVIEW_CONFIG.storage.voiceDraftPrefix}${albumId}`, JSON.stringify(meta));
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  getDraft: (albumId: string) => {
    const cached = get().drafts[albumId];
    if (cached !== undefined) return cached;
    try {
      const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.voiceDraftPrefix}${albumId}`);
      if (raw) {
        const meta = JSON.parse(raw) as { duration: number; saved_at: number };
        const draft: VoiceDraft = {
          duration: meta.duration,
          audioData: '',
          saved_at: meta.saved_at,
        };
        set((state) => ({ drafts: { ...state.drafts, [albumId]: draft } }));
        return draft;
      }
    } catch (e) {
      set({ error: (e as Error).message });
    }
    set((state) => ({ drafts: { ...state.drafts, [albumId]: null } }));
    return null;
  },

  clearDraft: (albumId: string) => {
    set((state) => ({ drafts: { ...state.drafts, [albumId]: null } }));
    try {
      localStorage.removeItem(`${REVIEW_CONFIG.storage.voiceDraftPrefix}${albumId}`);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
