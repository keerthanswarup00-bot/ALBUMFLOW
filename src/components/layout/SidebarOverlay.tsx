import { useUIStore } from '@/store/uiStore';

export function SidebarOverlay() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  if (!sidebarOpen) return null;

  return (
    <div
      className="fixed inset-0 z-10 bg-black/50 lg:hidden"
      onClick={() => setSidebarOpen(false)}
      aria-hidden="true"
    />
  );
}
