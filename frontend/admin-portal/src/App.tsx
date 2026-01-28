import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "@/pages/Dashboard";
import LiveMap from "@/pages/LiveMap";
import Analytics from "@/pages/Analytics";
import Patrols from "@/pages/Patrols";
import Settings from "@/pages/Settings";
import ReportCrime from "@/pages/ReportCrime";
import AdminLoginPage from "@/pages/AdminLoginPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/report" element={<ReportCrime />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/patrols" element={<Patrols />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AdminAuthProvider>
        <BrowserRouter>
          <ProtectedRoutes />
        </BrowserRouter>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
