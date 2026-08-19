import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { TenantContextProvider } from '@/app/tenant/TenantContextProvider';
import { TenantAdminAppShell } from '@/components/layout/TenantAdminAppShell';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { SelectInstancePage } from '@/modules/auth/pages/SelectInstancePage';
import { DashboardPage } from '@/modules/dashboard/pages/DashboardPage';
import { CondoProfilePage } from '@/modules/condo/pages/CondoProfilePage';
import { BlocksPage } from '@/modules/structure/pages/BlocksPage';
import { UnitsPage } from '@/modules/structure/pages/UnitsPage';
import { ResidentsPage } from '@/modules/users/pages/ResidentsPage';
import { StaffPage } from '@/modules/users/pages/StaffPage';
import { InvitesPage } from '@/modules/invites/pages/InvitesPage';
import { AnnouncementsPage } from '@/modules/announcements/pages/AnnouncementsPage';
import { ChannelsPage } from '@/modules/channels/pages/ChannelsPage';
import { InboxPage } from '@/modules/inbox/pages/InboxPage';
import { TicketsPage } from '@/modules/tickets/pages/TicketsPage';
import { TicketDetailPage } from '@/modules/tickets/pages/TicketDetailPage';
import { DeliveriesPage } from '@/modules/deliveries/pages/DeliveriesPage';
import { TurnsPage } from '@/modules/turns/pages/TurnsPage';
import { LogsPage } from '@/modules/logs/pages/LogsPage';
import { PublicTenantRoute } from '@/routes/guards/PublicTenantRoute';
import { RequireTenantAuth } from '@/routes/guards/RequireTenantAuth';
import { InstanceEntryPage } from '@/routes/pages/InstanceEntryPage';
import { ModulePlaceholderPage } from '@/routes/pages/ModulePlaceholderPage';

function TenantContextLayout() {
  const { instanceKey = '' } = useParams();

  return (
    <TenantContextProvider instanceKey={instanceKey}>
      <Outlet />
    </TenantContextProvider>
  );
}

function ProtectedTenantLayout() {
  return (
    <RequireTenantAuth>
      <TenantAdminAppShell>
        <Outlet />
      </TenantAdminAppShell>
    </RequireTenantAuth>
  );
}

function TenantIndexRedirect() {
  const { instanceKey = '' } = useParams();
  return <Navigate to={`/${instanceKey}/dashboard`} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InstanceEntryPage />} />
      <Route path="/select-instance" element={<SelectInstancePage />} />

      <Route path="/:instanceKey" element={<TenantContextLayout />}>
        {/* Legacy tenant login kept only for manual compatibility; normal auth redirects target /. */}
        <Route
          path="login"
          element={
            <PublicTenantRoute>
              <LoginPage />
            </PublicTenantRoute>
          }
        />

        <Route element={<ProtectedTenantLayout />}>
          <Route index element={<TenantIndexRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="condo/profile" element={<CondoProfilePage />} />
          <Route path="structure/blocks" element={<BlocksPage />} />
          <Route path="structure/units" element={<UnitsPage />} />
          <Route path="users/residents" element={<ResidentsPage />} />
          <Route path="users/staff" element={<StaffPage />} />
          <Route path="invites" element={<InvitesPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="channels" element={<ChannelsPage />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="deliveries" element={<DeliveriesPage />} />
          <Route path="turns" element={<TurnsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route
            path="announcements-placeholder"
            element={
              <ModulePlaceholderPage
                title="Mural"
                description="Estrutura base preparada para o modulo de comunicados."
              />
            }
          />
          <Route
            path="channels-placeholder"
            element={
              <ModulePlaceholderPage
                title="Canais"
                description="Estrutura base preparada para o modulo de canais comunitarios."
              />
            }
          />
          <Route
            path="inbox-placeholder"
            element={
              <ModulePlaceholderPage
                title="Atendimento"
                description="Estrutura base preparada para o modulo de inbox por unidade."
              />
            }
          />
          <Route
            path="tickets-placeholder"
            element={
              <ModulePlaceholderPage
                title="Tickets"
                description="Estrutura base preparada para o modulo de chamados."
              />
            }
          />
          <Route
            path="deliveries-placeholder"
            element={
              <ModulePlaceholderPage
                title="Encomendas"
                description="Estrutura base preparada para o modulo de encomendas."
              />
            }
          />
          <Route
            path="turns-placeholder"
            element={
              <ModulePlaceholderPage
                title="Turnos"
                description="Estrutura base preparada para o modulo de turnos operacionais."
              />
            }
          />
          <Route
            path="logs-placeholder"
            element={
              <ModulePlaceholderPage
                title="Logs"
                description="Estrutura base preparada para o modulo de auditoria da instancia."
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<InstanceEntryPage />} />
    </Routes>
  );
}
