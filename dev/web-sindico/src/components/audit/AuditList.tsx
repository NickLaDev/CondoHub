import { DataTable } from '@/components/data/DataTable';
import { formatLogDateTime } from '@/modules/logs/utils';
import type { InstanceLogEntry } from '@/modules/logs/types';

interface AuditListProps {
  logs: InstanceLogEntry[];
  loading?: boolean;
  error?: string | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  onOpenDetail?: (log: InstanceLogEntry) => void;
}

export function AuditList({
  logs,
  loading = false,
  error = null,
  pagination,
  onOpenDetail,
}: AuditListProps) {
  const columns = [
    {
      key: 'createdAt',
      header: 'Data/Hora',
      render: (value: string | null) => formatLogDateTime(value),
    },
    {
      key: 'actorName',
      header: 'Ator',
      render: (value: string | null) => value ?? 'Sistema',
    },
    {
      key: 'action',
      header: 'Acao',
    },
    {
      key: 'entity',
      header: 'Entidade',
      render: (value: string | null) => value ?? '-',
    },
    {
      key: 'requestId',
      header: 'Request ID',
      render: (value: string | null) => value ?? '-',
    },
    {
      key: 'context',
      header: 'Contexto',
      render: (value: string | null) => value ?? '-',
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      loading={loading}
      error={error}
      emptyMessage="Nenhum log encontrado para os filtros atuais."
      pagination={pagination}
      actions={onOpenDetail
        ? (item) => (
            <button
              type="button"
              className="table-link"
              onClick={() => onOpenDetail(item)}
            >
              Ver detalhe
            </button>
          )
        : undefined}
    />
  );
}
