import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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
// ReportsPage removed - merged into MIS
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
import PendingApprovalPage from "./pages/PendingApprovalPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, isApproved } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  if (!isApproved) return <Navigate to="/pending-approval" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PendingApprovalRoute() {
  const { session, loading, isApproved } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  if (isApproved) return <Navigate to="/dashboard" replace />;
  return <PendingApprovalPage />;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route path="/pending-approval" element={<PendingApprovalRoute />} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
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
      <Route path="/admin/factories" element={<FactorySetupPage />} />
      <Route path="/admin/settings" element={<SettingsPage />} />
      <Route path="/admin/users" element={<UserManagementPage />} />
      <Route path="/admin/notifications" element={<NotificationSettingsPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
