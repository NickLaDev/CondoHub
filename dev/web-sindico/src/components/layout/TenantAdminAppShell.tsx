import { useState, type PropsWithChildren } from 'react';
import { SidebarNav } from '@/components/navigation/SidebarNav';
import { Topbar } from '@/components/navigation/Topbar';

export function TenantAdminAppShell({ children }: PropsWithChildren) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="tenant-shell">
      <SidebarNav isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {isSidebarOpen ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar navegação"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div className="tenant-shell__main">
        <Topbar onToggleSidebar={() => setIsSidebarOpen((current) => !current)} />
        <main className="tenant-shell__content">{children}</main>
      </div>
    </div>
  );
}
