import type { ReactNode } from 'react';

interface ViewerLayoutProps {
  children: ReactNode;
  viewportHeight: number;
}

export function ViewerLayout({ children, viewportHeight }: ViewerLayoutProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-[#2c1810]"
      style={{ touchAction: 'none' }}
    >
      <div className="relative flex-1 overflow-hidden" style={{ height: viewportHeight }}>
        {children}
      </div>
    </div>
  );
}
