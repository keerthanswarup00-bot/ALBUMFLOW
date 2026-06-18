import { create } from 'zustand';
import type { ReviewCycleStatus, TimelineEntry, ApprovalRecord, ApprovalChecklistItem } from '@/types/viewer';

const CYCLE_PREFIX = 'albumflow_cycle_';
const TIMELINE_PREFIX = 'albumflow_timeline_';
const APPROVAL_PREFIX = 'albumflow_approval_';

function loadJSON<T>(key: string, onError?: (error: string) => void): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch (e) {
    onError?.((e as Error).message);
  }
  return null;
}

function saveJSON(key: string, data: unknown, onError?: (error: string) => void) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    onError?.((e as Error).message);
  }
}

interface ReviewCycleState {
  statuses: Record<string, ReviewCycleStatus>;
  timelines: Record<string, TimelineEntry[]>;
  approvals: Record<string, ApprovalRecord>;
  error: string | null;

  getStatus: (albumId: string) => ReviewCycleStatus;
  setStatus: (albumId: string, status: ReviewCycleStatus) => void;

  getTimeline: (albumId: string) => TimelineEntry[];
  addTimelineEntry: (albumId: string, entry: Omit<TimelineEntry, 'id' | 'album_id'>) => void;

  isApproved: (albumId: string) => boolean;
  getApproval: (albumId: string) => ApprovalRecord | null;
  submitApproval: (albumId: string, checklist: ApprovalChecklistItem[]) => void;

  markReviewStarted: (albumId: string) => void;
  submitReview: (albumId: string) => void;
  markChangesInProgress: (albumId: string) => void;
  markReadyForApproval: (albumId: string) => void;
  markClosed: (albumId: string) => void;
  resetStatus: (albumId: string) => void;
  clearError: () => void;
}

export const useReviewCycleStore = create<ReviewCycleState>((set, get) => ({
  statuses: {},
  timelines: {},
  approvals: {},
  error: null,

  getStatus: (albumId: string) => {
    const cached = get().statuses[albumId];
    if (cached) return cached;
    const stored = loadJSON<ReviewCycleStatus>(`${CYCLE_PREFIX}${albumId}`, (msg) => set({ error: msg }));
    if (stored) {
      set((s) => ({ statuses: { ...s.statuses, [albumId]: stored } }));
      return stored;
    }
    return 'draft';
  },

  setStatus: (albumId: string, status: ReviewCycleStatus) => {
    set((s) => ({ statuses: { ...s.statuses, [albumId]: status } }));
    saveJSON(`${CYCLE_PREFIX}${albumId}`, status, (msg) => set({ error: msg }));
  },

  getTimeline: (albumId: string) => {
    const cached = get().timelines[albumId];
    if (cached) return cached;
    const stored = loadJSON<TimelineEntry[]>(`${TIMELINE_PREFIX}${albumId}`, (msg) => set({ error: msg }));
    const entries = stored ?? [];
    set((s) => ({ timelines: { ...s.timelines, [albumId]: entries } }));
    return entries;
  },

  addTimelineEntry: (albumId: string, entry) => {
    const timeline = get().getTimeline(albumId);
    const newEntry: TimelineEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      album_id: albumId,
    };
    const updated = [...timeline, newEntry];
    set((s) => ({ timelines: { ...s.timelines, [albumId]: updated } }));
    saveJSON(`${TIMELINE_PREFIX}${albumId}`, updated, (msg) => set({ error: msg }));
  },

  isApproved: (albumId: string) => {
    const approval = get().getApproval(albumId);
    return approval !== null;
  },

  getApproval: (albumId: string) => {
    const cached = get().approvals[albumId];
    if (cached) return cached;
    const stored = loadJSON<ApprovalRecord>(`${APPROVAL_PREFIX}${albumId}`, (msg) => set({ error: msg }));
    if (stored) {
      set((s) => ({ approvals: { ...s.approvals, [albumId]: stored } }));
      return stored;
    }
    return null;
  },

  submitApproval: (albumId: string, checklist: ApprovalChecklistItem[]) => {
    if (get().isApproved(albumId)) return;
    const record: ApprovalRecord = {
      album_id: albumId,
      approved_at: Date.now(),
      checklist,
    };
    set((s) => ({ approvals: { ...s.approvals, [albumId]: record } }));
    saveJSON(`${APPROVAL_PREFIX}${albumId}`, record, (msg) => set({ error: msg }));
    get().setStatus(albumId, 'approved');
    get().addTimelineEntry(albumId, {
      type: 'approved',
      description: 'Album approved by client',
      timestamp: Date.now(),
    });
  },

  markReviewStarted: (albumId: string) => {
    const status = get().getStatus(albumId);
    if (status !== 'awaiting_review') return;
    get().setStatus(albumId, 'review_in_progress');
    get().addTimelineEntry(albumId, {
      type: 'review_started',
      description: 'Client opened album for review',
      timestamp: Date.now(),
    });
  },

  submitReview: (albumId: string) => {
    const status = get().getStatus(albumId);
    if (status === 'review_submitted') return;
    get().setStatus(albumId, 'review_submitted');
    get().addTimelineEntry(albumId, {
      type: 'review_submitted',
      description: 'Feedback sent to designer',
      timestamp: Date.now(),
    });
  },

  markChangesInProgress: (albumId: string) => {
    const status = get().getStatus(albumId);
    if (status !== 'review_submitted') return;
    get().setStatus(albumId, 'changes_in_progress');
    get().addTimelineEntry(albumId, {
      type: 'changes_in_progress',
      description: 'Designer is implementing changes',
      timestamp: Date.now(),
    });
  },

  markReadyForApproval: (albumId: string) => {
    get().setStatus(albumId, 'ready_for_approval');
    get().addTimelineEntry(albumId, {
      type: 'ready_for_approval',
      description: 'Updated version ready for final approval',
      timestamp: Date.now(),
    });
  },

  markClosed: (albumId: string) => {
    get().setStatus(albumId, 'closed');
    get().addTimelineEntry(albumId, {
      type: 'closed',
      description: 'Album closed',
      timestamp: Date.now(),
    });
  },

  resetStatus: (albumId: string) => {
    get().setStatus(albumId, 'draft');
    saveJSON(`${TIMELINE_PREFIX}${albumId}`, [], (msg) => set({ error: msg }));
    set((s) => ({ timelines: { ...s.timelines, [albumId]: [] } }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
