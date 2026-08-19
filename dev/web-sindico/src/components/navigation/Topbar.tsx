import { Bell, ChevronRight, LogOut, Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { resolveRouteMeta } from '@/routes/nav';
import { useAuthStore } from '@/store/auth';

interface TopbarProps {
  onToggleSidebar: () => void;
}

function formatRoleLabel(role: string | null | undefined) {
  if (!role) {
    return 'Sessao tenant';
  }

  return role
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getInitials(value: string | null | undefined) {
  const parts = (value ?? '')
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return 'CH';
  }

  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { instanceKey } = useTenantContext();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const routeMeta = resolveRouteMeta(location.pathname, instanceKey);
  const roleLabel = formatRoleLabel(user?.roles?.[0]);
  const initials = getInitials(roleLabel);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  }

  return (
    <header className="topbar">
      <div className="topbar__context">
        <button
          type="button"
          className="icon-button topbar__menu-button"
          onClick={onToggleSidebar}
          aria-label="Abrir navegacao"
        >
          <Menu size={18} />
        </button>

        <div className="topbar__breadcrumbs" aria-label="Breadcrumb">
          <span>CondoHub</span>
          <ChevronRight size={14} />
          <strong>{routeMeta?.label ?? 'Dashboard'}</strong>
        </div>
      </div>

      <div className="topbar__account">
        <button
          type="button"
          className="icon-button topbar__icon-button"
          aria-label="Notificacoes"
        >
          <Bell size={18} />
        </button>

        <div className="topbar__divider" aria-hidden="true" />

        <div className="topbar__account-copy" title={user?.name ?? roleLabel}>
          <strong>{roleLabel}</strong>
          <span>{instanceKey}</span>
        </div>

        <div className="topbar__avatar" aria-hidden="true">
          {initials}
        </div>

        <button
          type="button"
          className="icon-button topbar__icon-button"
          onClick={handleLogout}
          aria-label="Encerrar sessao"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
