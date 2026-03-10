import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import HourlyEntry from "./pages/HourlyEntry";
import OrdersPage from "./pages/OrdersPage";
import FloorsPage from "./pages/FloorsPage";
import LostTimePage from "./pages/LostTimePage";
import WorkersPage from "./pages/WorkersPage";
import MachinesPage from "./pages/MachinesPage";
import QCPage from "./pages/QCPage";
import InventoryPage from "./pages/InventoryPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MISPage from "./pages/MISPage";
import PreProductionPage from "./pages/PreProductionPage";
import CuttingProductionPage from "./pages/CuttingProductionPage";
import CuttingQualityPage from "./pages/CuttingQualityPage";
import SewingProductionPage from "./pages/SewingProductionPage";
import SewingQualityPage from "./pages/SewingQualityPage";
import FinishingProductionPage from "./pages/FinishingProductionPage";
import FinishingQualityPage from "./pages/FinishingQualityPage";
import GeneralActivitiesPage from "./pages/GeneralActivitiesPage";
import StoresActivitiesPage from "./pages/StoresActivitiesPage";
import SettingsPage from "./pages/SettingsPage";
import ShipmentsPage from "./pages/ShipmentsPage";
import UserManagementPage from "./pages/UserManagementPage";
import FactorySetupPage from "./pages/FactorySetupPage";
import NotificationSettingsPage from "./pages/NotificationSettingsPage";
import ProductionPlanEntry from "./pages/ProductionPlanEntry";
import PlanningModule from "./pages/PlanningModule";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import OvertimePage from "./pages/OvertimePage";
import IEModulePage from "./pages/IEModulePage";
import FilterManagementPage from "./pages/FilterManagementPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/cutting" element={<DepartmentDashboard department="cutting" />} />
        <Route path="/dashboard/sewing" element={<DepartmentDashboard department="sewing" />} />
        <Route path="/dashboard/finishing" element={<DepartmentDashboard department="finishing" />} />
        <Route path="/plans" element={<OrdersPage />} />
        <Route path="/floors" element={<FloorsPage />} />
        <Route path="/hourly-entry" element={<HourlyEntry />} />
        <Route path="/lost-time" element={<LostTimePage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/machines" element={<MachinesPage />} />
        <Route path="/qc" element={<QCPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/shipments" element={<ShipmentsPage />} />
        <Route path="/reports" element={<Navigate to="/mis" replace />} />
        <Route path="/mis" element={<MISPage />} />
        <Route path="/mis/pre-production" element={<PreProductionPage />} />
        <Route path="/mis/cutting-production" element={<CuttingProductionPage />} />
        <Route path="/mis/cutting-quality" element={<CuttingQualityPage />} />
        <Route path="/mis/sewing-production" element={<SewingProductionPage />} />
        <Route path="/mis/sewing-quality" element={<SewingQualityPage />} />
        <Route path="/mis/finishing-production" element={<FinishingProductionPage />} />
        <Route path="/mis/finishing-quality" element={<FinishingQualityPage />} />
        <Route path="/mis/general" element={<GeneralActivitiesPage />} />
        <Route path="/mis/stores" element={<StoresActivitiesPage />} />
        <Route path="/plans/new" element={<ProductionPlanEntry />} />
        <Route path="/planning" element={<PlanningModule />} />
        <Route path="/overtime" element={<OvertimePage />} />
        <Route path="/ie" element={<IEModulePage />} />
        <Route path="/admin/factories" element={<FactorySetupPage />} />
        <Route path="/admin/settings" element={<SettingsPage />} />
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/notifications" element={<NotificationSettingsPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
