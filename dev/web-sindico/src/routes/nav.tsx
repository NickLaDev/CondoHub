import type { LucideIcon } from 'lucide-react';
import {
  Blocks,
  Building2,
  Clock3,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageCircleMore,
  PackageSearch,
  ScrollText,
  Send,
  Shield,
  Ticket,
  UserCog,
  UserRoundPlus,
  Users,
  Wrench,
} from 'lucide-react';
import type { TenantRole } from '@/modules/auth/types';

export interface TenantNavigationLeaf {
  label: string;
  suffix: string;
  icon: LucideIcon;
  implemented: boolean;
  roles?: TenantRole[];
}

export interface TenantNavigationSection {
  label: string;
  icon: LucideIcon;
  items: TenantNavigationLeaf[];
}

export const dashboardNavigationItem: TenantNavigationLeaf = {
  label: 'Dashboard',
  suffix: '/dashboard',
  icon: LayoutDashboard,
  implemented: true,
  roles: ['SINDICO_ADMIN'],
};

export const tenantNavigationSections: TenantNavigationSection[] = [
  {
    label: 'Condomínio',
    icon: Building2,
    items: [
      {
        label: 'Perfil do Condomínio',
        suffix: '/condo/profile',
        icon: Building2,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
      {
        label: 'Blocos',
        suffix: '/structure/blocks',
        icon: Blocks,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
      {
        label: 'Unidades',
        suffix: '/structure/units',
        icon: Home,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
    ],
  },
  {
    label: 'Usuários',
    icon: Users,
    items: [
      {
        label: 'Moradores',
        suffix: '/users/residents',
        icon: Users,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
      {
        label: 'Funcionários',
        suffix: '/users/staff',
        icon: UserCog,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
      {
        label: 'Convites',
        suffix: '/invites',
        icon: UserRoundPlus,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
    ],
  },
  {
    label: 'Comunicação',
    icon: Megaphone,
    items: [
      {
        label: 'Mural',
        suffix: '/announcements',
        icon: Megaphone,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
      {
        label: 'Canais',
        suffix: '/channels',
        icon: MessageCircleMore,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
      {
        label: 'Atendimento',
        suffix: '/inbox',
        icon: Send,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
    ],
  },
  {
    label: 'Operacional',
    icon: Wrench,
    items: [
      {
        label: 'Tickets',
        suffix: '/tickets',
        icon: Ticket,
        implemented: true,
        roles: ['SINDICO_ADMIN', 'FUNC_MANUTENCAO'],
      },
      {
        label: 'Encomendas',
        suffix: '/deliveries',
        icon: PackageSearch,
        implemented: true,
        roles: ['SINDICO_ADMIN', 'FUNC_ENTREGAS'],
      },
      {
        label: 'Turnos',
        suffix: '/turns',
        icon: Clock3,
        implemented: true,
        roles: ['SINDICO_ADMIN', 'FUNC_ENTREGAS'],
      },
    ],
  },
  {
    label: 'Sistema',
    icon: Shield,
    items: [
      {
        label: 'Logs',
        suffix: '/logs',
        icon: ScrollText,
        implemented: true,
        roles: ['SINDICO_ADMIN'],
      },
    ],
  },
];

export function buildTenantPath(instanceKey: string, suffix: string) {
  return `/${instanceKey}${suffix}`;
}

const flattenedNavigation = [
  dashboardNavigationItem,
  ...tenantNavigationSections.flatMap((section) => section.items),
];

export function resolveRouteMeta(pathname: string, instanceKey: string) {
  const prefix = `/${instanceKey}`;
  const relativePath = pathname.startsWith(prefix)
    ? pathname.slice(prefix.length) || '/dashboard'
    : pathname;

  return flattenedNavigation
    .slice()
    .sort((left, right) => right.suffix.length - left.suffix.length)
    .find((item) => relativePath === item.suffix || relativePath.startsWith(`${item.suffix}/`));
}
