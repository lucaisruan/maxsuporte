import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { LayoutDashboard, Users, ClipboardList, X, BarChart3, Calendar, DollarSign, FileText, ClipboardCheck, MessageSquare, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
interface SidebarProps {
  open: boolean;
  onClose: () => void;
}
export function Sidebar({
  open,
  onClose
}: SidebarProps) {
  const {
    role
  } = useAuth();
  const location = useLocation();
  const adminLinks = [{
    to: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard"
  }, {
    to: "/admin/implantacoes",
    icon: ClipboardList,
    label: "Implantações"
  }, {
    to: "/admin/minhas-implantacoes",
    icon: ClipboardList,
    label: "Minhas Implantações"
  }, {
    to: "/admin/usuarios",
    icon: Users,
    label: "Gestão de Usuários"
  }, {
    to: "/admin/relatorios",
    icon: BarChart3,
    label: "Produtividade"
  }, {
    to: "/admin/disponibilidade",
    icon: Calendar,
    label: "Disponibilidade"
  }, {
    to: "/admin/comissoes",
    icon: DollarSign,
    label: "Comissões"
  }, {
    to: "/admin/relatorio-comissoes",
    icon: FileText,
    label: "Relatório"
  }, {
    to: "/admin/solicitacoes-conclusao",
    icon: ClipboardCheck,
    label: "Solicitações"
  }, {
    to: "/admin/visitas",
    icon: MessageSquare,
    label: "Visitas"
  }, {
    to: "/admin/base-conhecimento",
    icon: Brain,
    label: "Base Conhecimento IA"
  }, {
    to: "/admin/guia-visitas",
    icon: BookOpen,
    label: "Guia Visitas"
  }];
  const implantadorLinks = [{
    to: "/implantador",
    icon: LayoutDashboard,
    label: "Dashboard"
  }, {
    to: "/implantador/implantacoes",
    icon: ClipboardList,
    label: "Minhas Implantações"
  }, {
    to: "/implantador/relatorio-comissoes",
    icon: FileText,
    label: "Relatório"
  }, {
    to: "/implantador/visitas",
    icon: MessageSquare,
    label: "Visitas"
  }, {
    to: "/implantador/guia-visitas",
    icon: BookOpen,
    label: "Guia Visitas"
  }];
  const links = role === "admin" ? adminLinks : implantadorLinks;
  return <>
      {/* Overlay for mobile */}
      {open && <div className="fixed inset-0 z-40 bg-foreground/50 md:hidden" onClick={onClose} />}

      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 md:relative md:translate-x-0 bg-[#a0181c]", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 md:hidden">
          <span className="text-lg font-bold text-sidebar-foreground">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground hover:bg-sidebar-accent">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {links.map((link) => {
          const isActive = location.pathname === link.to;
          return <NavLink key={link.to} to={link.to} onClick={onClose} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground")}>
                <link.icon className="h-5 w-5" />
                {link.label}
              </NavLink>;
        })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-accent-foreground">
              {role === "admin" ? "Administrador" : "Implantador"}
            </p>
            <p className="mt-1 text-xs text-sidebar-accent-foreground/70">MAX IMPLANTAÇÕES

          </p>
          </div>
        </div>
      </aside>
    </>;
}