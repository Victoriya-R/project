import { Navigate, Outlet, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAuthStore } from '../store/auth-store';
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

function ProtectedLayout() {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <AppShell><Outlet /></AppShell>;
}

export function AppRouter() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
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
