import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { LayoutDashboard, FolderOpen, Settings, MessageSquare } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/albums', label: 'Albums', icon: FolderOpen },
  { to: '/review-management', label: 'Reviews', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border-primary dark:border-border-primary bg-bg-primary dark:bg-bg-primary safe-area-bottom lg:hidden">
      <ul className="flex items-center justify-around">
        {navItems.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-text-secondary dark:text-text-muted hover:text-text-secondary dark:hover:text-text-secondary',
                )
              }
            >
              <item.icon className="h-6 w-6" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
