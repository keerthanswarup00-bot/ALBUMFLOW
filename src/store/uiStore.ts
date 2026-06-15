import { create } from 'zustand';

type SidebarVariant = 'expanded' | 'collapsed';

interface UIState {
  sidebarOpen: boolean;
  sidebarVariant: SidebarVariant;
  activeModal: string | null;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | null;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarVariant: (variant: SidebarVariant) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarVariant: 'expanded',
  activeModal: null,
  toastMessage: null,
  toastType: null,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  setSidebarVariant: (sidebarVariant) => set({ sidebarVariant }),

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  showToast: (message, type) => set({ toastMessage: message, toastType: type }),

  clearToast: () => set({ toastMessage: null, toastType: null }),
}));
