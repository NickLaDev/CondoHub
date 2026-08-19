import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  error?: string | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
  };
  actions?: (item: T) => ReactNode;
  getRowKey?: (item: T, index: number) => string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'Nenhum item encontrado.',
  error = null,
  pagination,
  actions,
  getRowKey,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className="inline-feedback inline-feedback--error">
        <div>{error}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="table-loading">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="table-loading__row">
            <div className="skeleton table-loading__line" />
            <div className="skeleton table-loading__line table-loading__line--short" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <div className="table-empty">{emptyMessage}</div>;
  }

  return (
    <div className="table-block">
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.header}</th>
              ))}
              {actions ? <th className="data-table__actions-header">Acoes</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={getRowKey ? getRowKey(item, index) : index}>
                {columns.map((column) => (
                  <td key={String(column.key)} className={column.className || ''}>
                    {column.render
                      ? column.render(item[column.key as keyof T], item)
                      : String(item[column.key as keyof T] || '')}
                  </td>
                ))}
                {actions ? <td className="data-table__actions-cell">{actions(item)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 ? (
        <div className="table-pagination">
          <div className="table-pagination__meta">
            Mostrando {data.length} de {pagination.totalItems} itens
          </div>
          <div className="table-pagination__controls">
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1}
              className="icon-button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="table-pagination__page">
              Pagina {pagination.currentPage} de {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="icon-button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
