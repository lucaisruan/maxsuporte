import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Users, ClipboardList, X, BarChart3, Calendar, DollarSign, FileText, ClipboardCheck, MessageSquare, Brain, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { role } = useAuth();
  const location = useLocation();

  const adminLinks = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/implantacoes", icon: ClipboardList, label: "Implantações" },
    { to: "/admin/minhas-implantacoes", icon: ClipboardList, label: "Minhas Implantações" },
    { to: "/admin/usuarios", icon: Users, label: "Gestão de Usuários" },
    { to: "/admin/relatorios", icon: BarChart3, label: "Produtividade" },
    { to: "/admin/disponibilidade", icon: Calendar, label: "Disponibilidade" },
    { to: "/admin/comissoes", icon: DollarSign, label: "Comissões" },
    { to: "/admin/relatorio-comissoes", icon: FileText, label: "Relatório" },
    { to: "/admin/solicitacoes-conclusao", icon: ClipboardCheck, label: "Solicitações" },
    { to: "/admin/visitas", icon: MessageSquare, label: "Visitas" },
    { to: "/admin/base-conhecimento", icon: Brain, label: "Base IA" },
    { to: "/admin/guia-visitas", icon: BookOpen, label: "Guia Visitas" },
  ];

  const implantadorLinks = [
    { to: "/implantador", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/implantador/implantacoes", icon: ClipboardList, label: "Minhas Implantações" },
    { to: "/implantador/relatorio-comissoes", icon: FileText, label: "Relatório" },
    { to: "/implantador/visitas", icon: MessageSquare, label: "Visitas" },
    { to: "/implantador/guia-visitas", icon: BookOpen, label: "Guia Visitas" },
  ];

  const links = role === "admin" ? adminLinks : implantadorLinks;

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar shadow-lg transition-transform duration-300 md:relative md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border/30 px-5 md:hidden">
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
            Menu
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent/15 hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-5">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "bg-sidebar-accent/20 text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                )}
              >
                <link.icon className={cn("h-[18px] w-[18px]", isActive ? "opacity-100" : "opacity-75")} />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border/30 p-4">
          <div className="rounded-lg bg-sidebar-accent/10 px-3 py-2.5">
            <p className="text-xs font-medium text-sidebar-foreground/90">
              {role === "admin" ? "Administrador" : "Implantador"}
            </p>
            <p className="mt-0.5 text-[11px] text-sidebar-foreground/50">
              Sistema de Controle de Implantações
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
