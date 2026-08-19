import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, SearchInput, FilterBar, Select } from '@/components/ui/PageHeader';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { SeverityBadge } from '@/components/ui/StatusBadge';
import { DetailDrawer } from '@/components/ui/Overlays';
import { ScrollText, ExternalLink } from 'lucide-react';
import { logsService } from '@/services';
import type { AuditLog, PaginatedResponse } from '@/types';
import { formatDateTime, getActionLabel } from '@/hooks/utils';

export function LogsPage() {
    const [data, setData] = useState<PaginatedResponse<AuditLog> | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await logsService.list({ search, action: actionFilter, page, pageSize: 10 });
            setData(res);
        } finally { setLoading(false); }
    }, [search, actionFilter, page]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const columns: Column<AuditLog>[] = [
        {
            key: 'timestamp', header: 'Data/Hora',
            render: (log) => <span className="text-xs text-secondary font-mono whitespace-nowrap">{formatDateTime(log.timestamp)}</span>,
        },
        {
            key: 'action', header: 'Ação',
            render: (log) => <span className="text-sm font-medium text-tertiary">{getActionLabel(log.action)}</span>,
        },
        {
            key: 'actor', header: 'Ator',
            render: (log) => <span className="text-sm text-tertiary">{log.actor}</span>,
        },
        {
            key: 'instance', header: 'Instância',
            render: (log) => <span className="text-sm text-secondary">{log.instanceName || '—'}</span>,
        },
        {
            key: 'severity', header: 'Severidade',
            render: (log) => <SeverityBadge severity={log.severity} />,
        },
        {
            key: 'summary', header: 'Resumo', className: 'max-w-[250px]',
            render: (log) => <span className="text-xs text-secondary truncate block">{log.summary}</span>,
        },
        {
            key: 'actions', header: '', className: 'w-10',
            render: (log) => (
                <button onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                    className="p-1.5 rounded-lg hover:bg-surface-secondary text-secondary hover:text-accent transition-colors" title="Ver detalhes">
                    <ExternalLink size={14} />
                </button>
            ),
        },
    ];

    const actionOptions = [
        { value: 'ALL', label: 'Todas as ações' },
        { value: 'INSTANCE_CREATED', label: 'Instância criada' },
        { value: 'INSTANCE_UPDATED', label: 'Instância atualizada' },
        { value: 'INSTANCE_SUSPENDED', label: 'Instância suspensa' },
        { value: 'INSTANCE_REACTIVATED', label: 'Instância reativada' },
        { value: 'PLAN_CREATED', label: 'Plano criado' },
        { value: 'PLAN_UPDATED', label: 'Plano atualizado' },
        { value: 'PLAN_ARCHIVED', label: 'Plano arquivado' },
        { value: 'SINDICO_RESET', label: 'Reset de síndico' },
        { value: 'SINDICO_INVITE_CREATED', label: 'Convite criado' },
        { value: 'ADMIN_LOGIN', label: 'Login admin' },
    ];

    return (
        <AppShell title="Logs" subtitle="Auditoria global da plataforma">
            <PageHeader title="Logs de auditoria" description="Rastreie todas as ações executadas na plataforma." />

            <FilterBar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Buscar em logs..." className="w-64" />
                <Select value={actionFilter} onChange={(v) => { setActionFilter(v); setPage(1); }} options={actionOptions} />
            </FilterBar>

            <DataTable
                columns={columns}
                data={data?.data || []}
                loading={loading}
                page={data?.page || 1}
                totalPages={data?.totalPages || 1}
                total={data?.total}
                onPageChange={setPage}
                onRowClick={(log) => setSelectedLog(log)}
                emptyMessage="Nenhum log encontrado"
                emptyIcon={<ScrollText size={48} />}
            />

            <DetailDrawer open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Detalhes do log" subtitle={selectedLog ? getActionLabel(selectedLog.action) : ''} width="max-w-lg">
                {selectedLog && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Data/Hora</p>
                                <p className="text-sm text-tertiary font-mono">{formatDateTime(selectedLog.timestamp)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Severidade</p>
                                <SeverityBadge severity={selectedLog.severity} />
                            </div>
                            <div>
                                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Ação</p>
                                <p className="text-sm text-tertiary">{getActionLabel(selectedLog.action)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Código</p>
                                <p className="text-sm text-tertiary font-mono">{selectedLog.action}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Ator</p>
                            <p className="text-sm text-tertiary">{selectedLog.actor}</p>
                            {selectedLog.actorEmail && <p className="text-xs text-secondary">{selectedLog.actorEmail}</p>}
                        </div>
                        {selectedLog.instanceName && (
                            <div>
                                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Instância</p>
                                <p className="text-sm text-tertiary">{selectedLog.instanceName}</p>
                                <p className="text-xs text-secondary font-mono">{selectedLog.instanceId}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Resumo</p>
                            <p className="text-sm text-tertiary">{selectedLog.summary}</p>
                        </div>
                        {selectedLog.details && (
                            <div>
                                <p className="text-[11px] text-secondary uppercase tracking-wider font-medium mb-1">Detalhes técnicos</p>
                                <pre className="text-xs text-tertiary bg-surface-secondary rounded-lg p-3 overflow-x-auto font-mono">
                                    {JSON.stringify(selectedLog.details, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </DetailDrawer>
        </AppShell>
    );
}
