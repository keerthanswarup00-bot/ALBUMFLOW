import { create } from 'zustand';
import type { VoiceRequest, VoiceDraft } from '@/types/viewer';
import { REVIEW_CONFIG } from '@/constants/review';

interface VoiceState {
  recordings: Record<string, VoiceRequest[]>;
  drafts: Record<string, VoiceDraft | null>;

  getRecordings: (albumId: string) => VoiceRequest[];
  addRecording: (albumId: string, pageNumber: number, duration: number, audioData: string) => void;
  deleteRecording: (albumId: string, recordingId: string) => void;
  getRecordingsByPage: (albumId: string, pageNumber: number) => VoiceRequest[];
  getRecordingCount: (albumId: string) => number;

  saveDraft: (albumId: string, draft: VoiceDraft) => void;
  getDraft: (albumId: string) => VoiceDraft | null;
  clearDraft: (albumId: string) => void;
}

function loadRecordings(albumId: string): VoiceRequest[] {
  try {
    const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.voicePrefix}${albumId}`);
    if (raw) return JSON.parse(raw) as VoiceRequest[];
  } catch {
    // localStorage read failed
  }
  return [];
}

function saveRecordings(albumId: string, recordings: VoiceRequest[]) {
  try {
    localStorage.setItem(`${REVIEW_CONFIG.storage.voicePrefix}${albumId}`, JSON.stringify(recordings));
  } catch {
    // localStorage write failed (quota or unavailable)
  }
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  recordings: {},
  drafts: {},

  getRecordings: (albumId: string) => {
    const cached = get().recordings[albumId];
    if (cached) return cached;
    const loaded = loadRecordings(albumId);
    set((state) => ({ recordings: { ...state.recordings, [albumId]: loaded } }));
    return loaded;
  },

  addRecording: (albumId: string, pageNumber: number, duration: number, audioData: string) => {
    const recordings = get().getRecordings(albumId);
    const newRecording: VoiceRequest = {
      id: generateId(),
      album_id: albumId,
      page_number: pageNumber,
      duration,
      audioData,
      created_at: Date.now(),
      status: 'open',
    };
    const updated = [...recordings, newRecording];
    set((state) => ({ recordings: { ...state.recordings, [albumId]: updated } }));
    saveRecordings(albumId, updated);
  },

  deleteRecording: (albumId: string, recordingId: string) => {
    const recordings = get().getRecordings(albumId);
    const updated = recordings.filter((r) => r.id !== recordingId);
    set((state) => ({ recordings: { ...state.recordings, [albumId]: updated } }));
    saveRecordings(albumId, updated);
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
      localStorage.setItem(`${REVIEW_CONFIG.storage.voiceDraftPrefix}${albumId}`, JSON.stringify(draft));
    } catch {
      // localStorage write failed
    }
  },

  getDraft: (albumId: string) => {
    const cached = get().drafts[albumId];
    if (cached !== undefined) return cached;
    try {
      const raw = localStorage.getItem(`${REVIEW_CONFIG.storage.voiceDraftPrefix}${albumId}`);
      if (raw) {
        const draft = JSON.parse(raw) as VoiceDraft;
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
      localStorage.removeItem(`${REVIEW_CONFIG.storage.voiceDraftPrefix}${albumId}`);
    } catch {
      // localStorage removal failed
    }
  },
}));
