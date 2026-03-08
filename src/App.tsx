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
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/plans" element={<PlaceholderPage title="Orders" description="Order management coming soon" />} />
      <Route path="/floors" element={<PlaceholderPage title="Floors & Lines" description="Floor and line management coming soon" />} />
      <Route path="/hourly-entry" element={<HourlyEntry />} />
      <Route path="/lost-time" element={<PlaceholderPage title="Lost Time" description="Lost time tracking coming soon" />} />
      <Route path="/workers" element={<PlaceholderPage title="Workers" description="Worker management coming soon" />} />
      <Route path="/machines" element={<PlaceholderPage title="Machines" description="Machine tracking coming soon" />} />
      <Route path="/qc" element={<PlaceholderPage title="Quality Control" description="QC module coming soon" />} />
      <Route path="/inventory" element={<PlaceholderPage title="Inventory" description="Inventory management coming soon" />} />
      <Route path="/analytics" element={<PlaceholderPage title="Analytics" description="Analytics coming soon" />} />
      <Route path="/reports" element={<PlaceholderPage title="Reports" description="Reports coming soon" />} />
      <Route path="/mis" element={<PlaceholderPage title="MIS Reports" description="MIS reports coming soon" />} />
      <Route path="/admin/factories" element={<PlaceholderPage title="Factory Setup" description="Factory setup coming soon" />} />
      <Route path="/admin/settings" element={<PlaceholderPage title="Settings" description="Settings coming soon" />} />
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
