import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { LayoutDashboard, FolderOpen, Settings, MessageSquare, ImageIcon, SunMoon } from 'lucide-react';
import { useThemeStore } from '@/hooks/useTheme';
import type { ThemeMode } from '@/hooks/useTheme';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/albums', label: 'Albums', icon: FolderOpen },
  { to: '/review-management', label: 'Review Management', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen } = useUIStore();
  const { mode, setMode } = useThemeStore();

  function cycleTheme() {
    const modes: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = modes.indexOf(mode);
    setMode(modes[(idx + 1) % modes.length]);
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-primary pt-16 transition-transform duration-200 lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-text-secondary dark:text-text-secondary hover:bg-gray-100 dark:hover:bg-bg-secondary hover:text-text-primary dark:hover:text-text-primary',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border-primary dark:border-border-primary p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-sm font-medium text-blue-700 dark:text-blue-400">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-medium text-text-primary dark:text-text-primary">AlbumFlow</p>
            <p className="text-text-secondary dark:text-text-muted">v1.0.0</p>
          </div>
          <button
            onClick={cycleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary dark:text-text-muted hover:bg-gray-100 dark:hover:bg-bg-secondary transition-colors cursor-pointer"
            title={`Theme: ${mode}`}
          >
            <SunMoon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
