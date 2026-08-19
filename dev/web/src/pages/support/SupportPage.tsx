import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, Select } from '@/components/ui/PageHeader';
import { ConfirmDialog, Toast } from '@/components/ui/Overlays';
import { ShieldAlert, Search, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supportService, instancesService } from '@/services';
import { SupportActionType } from '@/types';
import type { Instance } from '@/types';

export function SupportPage() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [instanceId, setInstanceId] = useState('');
    const [targetEmail, setTargetEmail] = useState('');
    const [actionType, setActionType] = useState<string>(SupportActionType.RESET_PASSWORD);
    const [newPassword, setNewPassword] = useState('');
    const [reason, setReason] = useState('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [toast, setToast] = useState({ show: false, message: '', variant: 'success' as const });

    useEffect(() => {
        instancesService
            .list({ page: 1, pageSize: 100 })
            .then((res) => setInstances(res.data))
            .catch(() => setInstances([]));
    }, []);

    const selectedInstance = instances.find(i => i.id === instanceId);
    // Motivo é nota interna do operador — o backend não persiste, então não bloqueia o submit.
    const canSubmit = instanceId && targetEmail && newPassword.length >= 6;

    const handleConfirm = async () => {
        setConfirmOpen(false);
        setLoading(true);
        setResult(null);
        try {
            const res = await supportService.resetSindico({
                instanceId, targetEmail, actionType: actionType as SupportActionType, reason, newPassword,
            });
            setResult(res);
            setToast({ show: true, message: 'Ação executada com sucesso!', variant: 'success' as const });
        } catch {
            setResult({ success: false, message: 'Erro ao executar ação de suporte.' });
        } finally { setLoading(false); }
    };

    return (
        <AppShell title="Suporte" subtitle="Ações operacionais de suporte administrativo">
            <div className="flex items-start gap-3 px-5 py-4 bg-warning-light border border-warning/20 rounded-xl mb-6">
                <ShieldAlert size={20} className="text-warning flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-semibold text-tertiary">Área de operação sensível</p>
                    <p className="text-xs text-secondary mt-0.5">Todas as ações aqui são auditáveis e irreversíveis.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <SectionCard title="1. Localizar instância">
                        <div className="flex items-center gap-3">
                            <Search size={16} className="text-secondary" />
                            <select value={instanceId} onChange={(e) => setInstanceId(e.target.value)} className="flex-1 px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option value="">Selecione uma instância...</option>
                                {instances.map(i => <option key={i.id} value={i.id}>{i.name} ({i.instanceKey})</option>)}
                            </select>
                        </div>
                        {selectedInstance && (
                            <div className="mt-3 px-4 py-3 bg-surface-secondary rounded-lg">
                                <p className="text-sm font-medium text-tertiary">{selectedInstance.name}</p>
                                <p className="text-xs text-secondary mt-0.5 font-mono">{selectedInstance.instanceKey}</p>
                            </div>
                        )}
                    </SectionCard>

                    <SectionCard title="2. Email do alvo">
                        <input type="email" value={targetEmail} onChange={(e) => setTargetEmail(e.target.value)} placeholder="sindico@condominio.com.br" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                    </SectionCard>

                    <SectionCard title="3. Tipo de ação">
                        <Select value={actionType} onChange={setActionType} options={[
                            { value: SupportActionType.RESET_PASSWORD, label: 'Reset de senha' },
                        ]} className="w-full" />
                    </SectionCard>

                    <SectionCard title="4. Nova senha">
                        <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Senha temporária do síndico" autoComplete="off" className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono" />
                        <p className="text-xs text-secondary mt-1">Mín. 6 caracteres. Informe ao síndico por canal seguro.</p>
                    </SectionCard>

                    <SectionCard title="5. Motivo (opcional)">
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Nota interna do operador (não enviada ao backend)..." className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none" />
                    </SectionCard>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setConfirmOpen(true)} disabled={!canSubmit || loading} className="flex items-center gap-2 px-5 py-2.5 bg-warning text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                            {loading ? 'Executando...' : 'Executar ação'}
                        </button>
                        <button onClick={() => { setInstanceId(''); setTargetEmail(''); setNewPassword(''); setReason(''); setResult(null); }} className="px-4 py-2.5 text-sm font-medium text-secondary bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors">Limpar</button>
                    </div>
                </div>

                <div className="space-y-4">
                    {result && (
                        <SectionCard title="Resultado">
                            <div className={`flex items-start gap-3 p-4 rounded-lg ${result.success ? 'bg-success-light' : 'bg-danger-light'}`}>
                                {result.success ? <CheckCircle2 size={20} className="text-success flex-shrink-0" /> : <AlertTriangle size={20} className="text-danger flex-shrink-0" />}
                                <p className="text-sm text-tertiary">{result.message}</p>
                            </div>
                        </SectionCard>
                    )}
                    <SectionCard title="Informações">
                        <div className="space-y-3 text-xs text-secondary">
                            <p>• Ações registradas nos logs de auditoria</p>
                            <p>• Reset define a nova senha informada para o síndico</p>
                            <p>• Informe a senha ao síndico por canal seguro</p>
                            <p>• Alvo deve ser um SINDICO_ADMIN ativo da instância</p>
                        </div>
                    </SectionCard>
                </div>
            </div>

            <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirm} title="Confirmar ação de suporte"
                message={<div className="space-y-2"><p>Ação: <strong>{actionType === SupportActionType.RESET_PASSWORD ? 'Reset de senha' : 'Criar convite'}</strong></p><p>Instância: <strong>{selectedInstance?.name}</strong></p><p>Alvo: <strong>{targetEmail}</strong></p><p className="text-danger font-medium mt-2">Esta ação é irreversível e será auditada.</p></div>}
                confirmLabel="Confirmar e executar" variant="danger" loading={loading}
            />
            <Toast show={toast.show} message={toast.message} variant={toast.variant} onClose={() => setToast({ ...toast, show: false })} />
        </AppShell>
    );
}
