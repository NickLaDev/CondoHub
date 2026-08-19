import { Link } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/EmptyState';

interface ModulePlaceholderPageProps {
  title: string;
  description: string;
}

export function ModulePlaceholderPage({
  title,
  description,
}: ModulePlaceholderPageProps) {
  const { instanceKey } = useTenantContext();

  return (
    <PermissionGuard allow={['SINDICO_ADMIN']}>
      <div className="page-stack">
        <PageHeader
          title={title}
          description={description}
          badge="Fase seguinte"
        />

        <EmptyState
          title="Estrutura preparada para expansão"
          description="A navegação, a proteção de rota e o contexto tenant já estão ativos. O conteúdo funcional deste módulo entra na próxima fase."
          action={
            <Link className="button button--ghost" to={`/${instanceKey}/dashboard`}>
              Voltar ao dashboard
            </Link>
          }
        />
      </div>
    </PermissionGuard>
  );
}
