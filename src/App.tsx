import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SiteGateGuard } from "@/components/SiteGateGuard";
import SiteGate from "./pages/SiteGate";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ImplantacoesAdmin from "./pages/admin/ImplantacoesAdmin";
import NovaImplantacao from "./pages/admin/NovaImplantacao";
import UsuariosAdmin from "./pages/admin/UsuariosAdmin";
import RelatoriosProdutividade from "./pages/admin/RelatoriosProdutividade";
import DisponibilidadeCalendario from "./pages/admin/DisponibilidadeCalendario";
import ImplantadorDashboard from "./pages/implantador/ImplantadorDashboard";
import ImplantacaoDetalhe from "./pages/ImplantacaoDetalhe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Site Gate - first access point */}
      <Route path="/gate" element={<SiteGate />} />

      {/* Public routes - require site gate access */}
      <Route
        path="/login"
        element={
          <SiteGateGuard>
            {user ? <Navigate to={role === "admin" ? "/admin" : "/implantador"} replace /> : <Login />}
          </SiteGateGuard>
        }
      />
      <Route
        path="/cadastro"
        element={
          <SiteGateGuard>
            {user ? <Navigate to={role === "admin" ? "/admin" : "/implantador"} replace /> : <Cadastro />}
          </SiteGateGuard>
        }
      />

      {/* Redirect root to appropriate dashboard or gate */}
      <Route
        path="/"
        element={
          <SiteGateGuard>
            {user ? (
              <Navigate to={role === "admin" ? "/admin" : "/implantador"} replace />
            ) : (
              <Navigate to="/login" replace />
            )}
          </SiteGateGuard>
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/admin/implantacoes"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <ImplantacoesAdmin />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/admin/implantacoes/nova"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <NovaImplantacao />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/admin/implantacoes/:id"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <ImplantacaoDetalhe />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <UsuariosAdmin />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/admin/relatorios"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <RelatoriosProdutividade />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/admin/disponibilidade"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["admin"]}>
              <DisponibilidadeCalendario />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />

      {/* Implantador routes */}
      <Route
        path="/implantador"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["implantador"]}>
              <ImplantadorDashboard />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/implantador/implantacoes"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["implantador"]}>
              <ImplantadorDashboard />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />
      <Route
        path="/implantador/implantacoes/:id"
        element={
          <SiteGateGuard>
            <ProtectedRoute allowedRoles={["implantador"]}>
              <ImplantacaoDetalhe />
            </ProtectedRoute>
          </SiteGateGuard>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
