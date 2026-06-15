import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { SidebarOverlay } from '@/components/layout/SidebarOverlay';
import { Toast } from '@/components/ui/Toast';

export function AppLayout() {
  return (
    <div className="flex min-h-dvh">
      <SidebarOverlay />
      <Sidebar />
      <div className="flex flex-1 flex-col lg:ml-0">
        <Header />
        <main className="flex-1 px-4 py-6 pb-24 lg:px-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
      <Toast />
    </div>
  );
}
