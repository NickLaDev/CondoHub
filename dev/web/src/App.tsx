import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/login/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { InstancesPage } from '@/pages/instances/InstancesPage';
import { InstanceDetailPage } from '@/pages/instances/InstanceDetailPage';
import { PlansPage } from '@/pages/plans/PlansPage';
import { SupportPage } from '@/pages/support/SupportPage';
import { LogsPage } from '@/pages/logs/LogsPage';
import type { ReactNode } from 'react';

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="flex flex-col items-center gap-3">
        <img src="/logo-icon.png" alt="CondoHub" className="w-12 h-12 rounded-xl bg-primary/5 p-2" />
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <AuthLoadingScreen />;
  }
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const loginElement = isLoading
    ? <AuthLoadingScreen />
    : isAuthenticated
      ? <Navigate to="/admin/dashboard" replace />
      : <LoginPage />;

  return (
    <Routes>
      <Route path="/admin/login" element={loginElement} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/admin/instances" element={<ProtectedRoute><InstancesPage /></ProtectedRoute>} />
      <Route path="/admin/instances/:id" element={<ProtectedRoute><InstanceDetailPage /></ProtectedRoute>} />
      <Route path="/admin/plans" element={<ProtectedRoute><PlansPage /></ProtectedRoute>} />
      <Route path="/admin/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
      <Route path="/admin/logs" element={<ProtectedRoute><LogsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
