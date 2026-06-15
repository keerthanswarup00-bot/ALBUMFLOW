import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/uiStore';
import { LayoutDashboard, FolderOpen, Settings, MessageSquare, ImageIcon } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/albums', label: 'Albums', icon: FolderOpen },
  { to: '/review-management', label: 'Review Management', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarOpen } = useUIStore();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-gray-200 bg-white pt-16 transition-transform duration-200 lg:static lg:translate-x-0',
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
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
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

      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-gray-900">AlbumFlow</p>
            <p className="text-gray-500">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
