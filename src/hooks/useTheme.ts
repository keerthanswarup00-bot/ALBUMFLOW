import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

function getSystemPref(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(resolved: 'light' | 'dark') {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('albumflow-theme') : null) as ThemeMode | null;
const initialMode: ThemeMode = stored ?? 'system';
const initialResolved = initialMode === 'system' ? getSystemPref() : initialMode;
applyTheme(initialResolved);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  resolved: initialResolved,
  setMode: (mode) => {
    localStorage.setItem('albumflow-theme', mode);
    const resolved = mode === 'system' ? getSystemPref() : mode;
    applyTheme(resolved);
    set({ mode, resolved });
  },
}));

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const state = useThemeStore.getState();
    if (state.mode === 'system') {
      const resolved = e.matches ? 'dark' : 'light';
      applyTheme(resolved);
      useThemeStore.setState({ resolved });
    }
  });
}
