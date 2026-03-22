import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { CablesPage } from '../pages/CablesPage';
import { ConnectionsPage } from '../pages/ConnectionsPage';
import { DashboardPage } from '../pages/DashboardPage';
import { EquipmentDetailPage } from '../pages/EquipmentDetailPage';
import { EquipmentPage } from '../pages/EquipmentPage';
import { LoginPage } from '../pages/LoginPage';
import { ReportsPage } from '../pages/ReportsPage';
import { SwitchCabinetDetailPage } from '../pages/SwitchCabinetDetailPage';
import { SwitchCabinetsPage } from '../pages/SwitchCabinetsPage';
import { UpsDetailPage } from '../pages/UpsDetailPage';
import { UpsPage } from '../pages/UpsPage';
import { ZoneDetailPage } from '../pages/ZoneDetailPage';
import { ZonesPage } from '../pages/ZonesPage';
import { AccessManagementPage } from '../pages/AccessManagementPage';
import { authApi } from '../services/api/client';
import { useAuthStore } from '../store/auth-store';

function AuthLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500">
      Проверка авторизации...
    </div>
  );
}

function AuthBootstrap() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const setAuthCheckInProgress = useAuthStore((state) => state.setAuthCheckInProgress);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      if (user) {
        setUser(null);
      }
      setAuthCheckInProgress(false);
      return () => {
        cancelled = true;
      };
    }

    setAuthCheckInProgress(true);

    authApi.me()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthCheckInProgress(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [logout, setAuthCheckInProgress, setUser, token, user]);

  return null;
}

function PublicOnlyRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAuthCheckInProgress = useAuthStore((state) => state.isAuthCheckInProgress);

  if (isAuthCheckInProgress) {
    return <AuthLoader />;
  }

  if (token && user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function ProtectedLayout() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAuthCheckInProgress = useAuthStore((state) => state.isAuthCheckInProgress);

  if (isAuthCheckInProgress) {
    return <AuthLoader />;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function AppRouter() {
  return (
    <Router>
      <AuthBootstrap />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
          <Route path="/ups" element={<UpsPage />} />
          <Route path="/ups/:id" element={<UpsDetailPage />} />
          <Route path="/switch-cabinets" element={<SwitchCabinetsPage />} />
          <Route path="/switch-cabinets/:id" element={<SwitchCabinetDetailPage />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/zones/:id" element={<ZoneDetailPage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/cables" element={<CablesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/access-management" element={<AccessManagementPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
