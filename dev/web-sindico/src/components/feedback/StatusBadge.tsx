import { clsx } from 'clsx';

export type StatusType =
  | 'active'
  | 'inactive'
  | 'archived'
  | 'pending'
  | 'expired'
  | 'info'
  | 'violet'
  | 'warning'
  | 'success'
  | 'neutral'
  | 'danger';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  label?: string;
  title?: string;
}

const statusConfig = {
  active: {
    label: 'Ativo',
    className: 'status-badge--active',
  },
  inactive: {
    label: 'Inativo',
    className: 'status-badge--inactive',
  },
  archived: {
    label: 'Arquivado',
    className: 'status-badge--archived',
  },
  pending: {
    label: 'Pendente',
    className: 'status-badge--pending',
  },
  expired: {
    label: 'Expirado',
    className: 'status-badge--expired',
  },
  info: {
    label: 'Informativo',
    className: 'status-badge--info',
  },
  violet: {
    label: 'Em andamento',
    className: 'status-badge--violet',
  },
  warning: {
    label: 'Atencao',
    className: 'status-badge--warning',
  },
  success: {
    label: 'Sucesso',
    className: 'status-badge--success',
  },
  neutral: {
    label: 'Neutro',
    className: 'status-badge--neutral',
  },
  danger: {
    label: 'Critico',
    className: 'status-badge--danger',
  },
} as const;

export function StatusBadge({ status, className, label, title }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={clsx('status-badge', config.className, className)} title={title}>
      {label ?? config.label}
    </span>
  );
}
