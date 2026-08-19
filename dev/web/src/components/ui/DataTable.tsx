import { type ReactNode } from 'react';
import { cn } from '@/hooks/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    render: (item: T) => ReactNode;
    className?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    page?: number;
    totalPages?: number;
    total?: number;
    onPageChange?: (page: number) => void;
    onRowClick?: (item: T) => void;
    emptyMessage?: string;
    emptyIcon?: ReactNode;
}

export function DataTable<T extends { id?: string }>({
    columns,
    data,
    loading,
    page = 1,
    totalPages = 1,
    total,
    onPageChange,
    onRowClick,
    emptyMessage = 'Nenhum registro encontrado',
    emptyIcon,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-surface-secondary">
                                {columns.map((col) => (
                                    <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase tracking-wider">
                                        <div className="skeleton h-4 w-20" />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-border-light">
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-4 py-3.5">
                                            <div className="skeleton h-4 w-full max-w-[180px]" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="flex flex-col items-center justify-center py-16 px-6">
                    {emptyIcon && <div className="text-secondary/40 mb-4">{emptyIcon}</div>}
                    <p className="text-secondary text-sm">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border bg-surface-secondary/60">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={cn(
                                        'text-left px-4 py-3 text-[11px] font-semibold text-secondary uppercase tracking-wider',
                                        col.className
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, idx) => (
                            <tr
                                key={item.id || idx}
                                className={cn(
                                    'border-b border-border-light last:border-0 transition-colors',
                                    onRowClick && 'cursor-pointer hover:bg-surface-secondary/50'
                                )}
                                onClick={() => onRowClick?.(item)}
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={cn('px-4 py-3.5 text-sm', col.className)}>
                                        {col.render(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-secondary/30">
                    <span className="text-xs text-secondary">
                        {total !== undefined ? `${total} registros` : `Página ${page} de ${totalPages}`}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            disabled={page <= 1}
                            onClick={() => onPageChange?.(page - 1)}
                            className="p-1.5 rounded-lg hover:bg-surface-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft size={16} className="text-secondary" />
                        </button>
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange?.(pageNum)}
                                    className={cn(
                                        'w-8 h-8 rounded-lg text-xs font-medium transition-colors',
                                        page === pageNum
                                            ? 'bg-primary text-white'
                                            : 'text-secondary hover:bg-surface-tertiary'
                                    )}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        <button
                            disabled={page >= totalPages}
                            onClick={() => onPageChange?.(page + 1)}
                            className="p-1.5 rounded-lg hover:bg-surface-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} className="text-secondary" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
