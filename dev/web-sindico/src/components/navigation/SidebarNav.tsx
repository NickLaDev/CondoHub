import { NavLink } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { CondoHubLogo } from '@/components/brand/CondoHubLogo';
import { useAuthStore } from '@/store/auth';
import {
  buildTenantPath,
  dashboardNavigationItem,
  tenantNavigationSections,
} from '@/routes/nav';

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatSectionLabel(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.startsWith('condom')) {
    return 'Estrutura';
  }

  if (normalized.startsWith('usu')) {
    return 'Usuarios';
  }

  if (normalized.startsWith('com')) {
    return 'Comunicacao';
  }

  if (normalized.startsWith('oper')) {
    return 'Operacional';
  }

  if (normalized.startsWith('sis')) {
    return 'Sistema';
  }

  return label;
}

export function SidebarNav({ isOpen, onClose }: SidebarNavProps) {
  const { instanceKey } = useTenantContext();
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const visibleSections = tenantNavigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        !item.roles?.length || item.roles.some((role) => roles.includes(role)),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <CondoHubLogo tone="light" subtitle="Painel Admin" />
      </div>

      <nav className="sidebar__nav" aria-label="Menu principal do tenant">
        <section className="sidebar__group">
          <header className="sidebar__group-title">
            <span>Principal</span>
          </header>

          <div className="sidebar__group-links">
            <PermissionGuard allow={dashboardNavigationItem.roles ?? ['SINDICO_ADMIN']} hideOnDeny>
              <NavLink
                to={buildTenantPath(instanceKey, dashboardNavigationItem.suffix)}
                className={({ isActive }) =>
                  `sidebar__link sidebar__link--primary${isActive ? ' sidebar__link--active' : ''}`
                }
                onClick={onClose}
              >
                <dashboardNavigationItem.icon size={18} />
                <span>{dashboardNavigationItem.label}</span>
              </NavLink>
            </PermissionGuard>
          </div>
        </section>

        {visibleSections.map((section) => (
          <section key={section.label} className="sidebar__group">
            <header className="sidebar__group-title">
              <span>{formatSectionLabel(section.label)}</span>
            </header>

            <div className="sidebar__group-links">
              {section.items.map((item) => (
                <PermissionGuard key={item.suffix} allow={item.roles} hideOnDeny>
                  <NavLink
                    to={buildTenantPath(instanceKey, item.suffix)}
                    className={({ isActive }) =>
                      `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                    }
                    onClick={onClose}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                </PermissionGuard>
              ))}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
