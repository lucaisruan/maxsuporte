import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ImplantacoesAdmin from "./pages/admin/ImplantacoesAdmin";
import NovaImplantacao from "./pages/admin/NovaImplantacao";
import EditarImplantacao from "./pages/admin/EditarImplantacao";
import UsuariosAdmin from "./pages/admin/UsuariosAdmin";
import RelatoriosProdutividade from "./pages/admin/RelatoriosProdutividade";
import DisponibilidadeCalendario from "./pages/admin/DisponibilidadeCalendario";
import ConfiguracaoComissoes from "./pages/admin/ConfiguracaoComissoes";
import RelatorioComissoes from "./pages/admin/RelatorioComissoes";
import SolicitacoesConclusao from "./pages/admin/SolicitacoesConclusao";
import ImplantadorDashboard from "./pages/implantador/ImplantadorDashboard";
import ImplantacaoDetalhe from "./pages/ImplantacaoDetalhe";
import VisitasList from "./pages/visitas/VisitasList";
import NovaVisita from "./pages/visitas/NovaVisita";
import VisitaDetalhe from "./pages/visitas/VisitaDetalhe";
import BaseConhecimentoIA from "./pages/admin/BaseConhecimentoIA";
import GuiaVisitas from "./pages/visitas/GuiaVisitas";
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
      {/* Public routes */}
      <Route
        path="/login"
        element={
          user ? <Navigate to={role === "admin" ? "/admin" : "/implantador"} replace /> : <Login />
        }
      />
      <Route
        path="/cadastro"
        element={
          user ? <Navigate to={role === "admin" ? "/admin" : "/implantador"} replace /> : <Cadastro />
        }
      />

      {/* Redirect root to appropriate dashboard or login */}
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={role === "admin" ? "/admin" : "/implantador"} replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/implantacoes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ImplantacoesAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/implantacoes/nova"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <NovaImplantacao />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/implantacoes/:id"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ImplantacaoDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/minhas-implantacoes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ImplantadorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/implantacoes/:id/editar"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <EditarImplantacao />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <UsuariosAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/relatorios"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <RelatoriosProdutividade />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/disponibilidade"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DisponibilidadeCalendario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/comissoes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ConfiguracaoComissoes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/relatorio-comissoes"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <RelatorioComissoes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/solicitacoes-conclusao"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <SolicitacoesConclusao />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/visitas"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <VisitasList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/visitas/nova"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <NovaVisita />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/visitas/:id"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <VisitaDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/base-conhecimento"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <BaseConhecimentoIA />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/guia-visitas"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <GuiaVisitas />
          </ProtectedRoute>
        }
      />

      {/* Implantador routes */}
      <Route
        path="/implantador"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <ImplantadorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/implantacoes"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <ImplantadorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/implantacoes/:id"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <ImplantacaoDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/relatorio-comissoes"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <RelatorioComissoes />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/visitas"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <VisitasList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/visitas/nova"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <NovaVisita />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/visitas/:id"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <VisitaDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/implantador/guia-visitas"
        element={
          <ProtectedRoute allowedRoles={["implantador"]}>
            <GuiaVisitas />
          </ProtectedRoute>
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
