import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useThemeStore } from '@/hooks/useTheme';
import { Menu, LogOut, User, SunMoon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ThemeMode } from '@/hooks/useTheme';

const themeLabels: Record<ThemeMode, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const { mode, setMode } = useThemeStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  function handleLogout() {
    setShowConfirm(true);
  }

  function confirmLogout() {
    setShowConfirm(false);
    logout();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-primary px-4 lg:px-6 safe-area-top">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary dark:text-text-muted hover:bg-gray-100 dark:hover:bg-bg-secondary transition-colors cursor-pointer lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/dashboard" className="text-lg font-bold text-text-primary dark:text-text-primary">
          AlbumFlow
        </Link>
      </div>

      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-text-secondary dark:text-text-muted hover:bg-gray-100 dark:hover:bg-bg-secondary transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            <SunMoon className="h-5 w-5" />
          </button>
          {showThemeMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowThemeMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-elevated py-1 shadow-lg dark:shadow-black/40">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setMode(t); setShowThemeMenu(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                      mode === t
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-text-secondary dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-bg-secondary'
                    }`}
                  >
                    <span className="text-base">
                      {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}
                    </span>
                    {themeLabels[t]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-bg-secondary transition-colors min-h-10"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{user?.full_name}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary dark:text-text-muted hover:bg-gray-100 dark:hover:bg-bg-secondary transition-colors cursor-pointer"
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/65 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-bg-primary dark:bg-bg-elevated p-6 shadow-xl dark:shadow-black/40">
            <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">Sign out?</h3>
            <p className="mt-2 text-sm text-text-secondary dark:text-text-secondary">
              You'll need to sign in again to access your albums.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl border border-border-primary dark:border-border-primary py-3 text-sm font-medium text-text-secondary dark:text-text-secondary hover:bg-bg-secondary dark:hover:bg-bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
