import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { getRoleLabel } from "@/lib/roleLabels";
import {
  LayoutDashboard, ClipboardList, X, BarChart3, Calendar, DollarSign,
  FileText, ClipboardCheck, MessageSquare, BookOpen, Brain, Bot,
  ListChecks, FolderKanban, Users, ChevronDown, Settings, PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface SidebarLink {
  to: string;
  icon: any;
  label: string;
}

interface SidebarGroup {
  type: "group";
  icon: any;
  label: string;
  children: SidebarLink[];
}

type SidebarItem = SidebarLink | SidebarGroup;

function isGroup(item: SidebarItem): item is SidebarGroup {
  return (item as SidebarGroup).type === "group";
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { role } = useAuth();
  const location = useLocation();

  const adminItems: SidebarItem[] = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/implantacoes", icon: ClipboardList, label: "Implantações" },
    { to: "/admin/minhas-implantacoes", icon: ClipboardList, label: "Minhas Implantações" },
    { to: "/admin/demandas", icon: FolderKanban, label: "Demandas" },
    { to: "/admin/disponibilidade", icon: Calendar, label: "Disponibilidade" },
    { to: "/admin/visitas", icon: MessageSquare, label: "Visitas" },
    { to: "/admin/guia-visitas", icon: BookOpen, label: "Guia Visitas" },
    { to: "/admin/metricas-ia", icon: Bot, label: "Métricas IA" },
    {
      type: "group",
      icon: PieChart,
      label: "Relatórios",
      children: [
        { to: "/admin/relatorios", icon: BarChart3, label: "Produtividade" },
        { to: "/admin/relatorio-demandas", icon: BarChart3, label: "Performance Operacional" },
        { to: "/admin/relatorio-comissoes", icon: FileText, label: "Comissões" },
        { to: "/admin/solicitacoes-conclusao", icon: ClipboardCheck, label: "Solicitações" },
      ],
    },
    {
      type: "group",
      icon: Settings,
      label: "Configurações",
      children: [
        { to: "/admin/usuarios", icon: Users, label: "Gestão de Usuários" },
        { to: "/admin/comissoes", icon: DollarSign, label: "Comissões" },
        { to: "/admin/base-conhecimento", icon: Brain, label: "Base Conhecimento IA" },
        { to: "/admin/demandas/modelos", icon: ListChecks, label: "Modelos POP" },
      ],
    },
  ];

  const implantadorItems: SidebarItem[] = [
    { to: "/implantador", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/implantador/implantacoes", icon: ClipboardList, label: "Minhas Implantações" },
    { to: "/implantador/demandas", icon: FolderKanban, label: "Demandas" },
    { to: "/implantador/visitas", icon: MessageSquare, label: "Visitas" },
    { to: "/implantador/guia-visitas", icon: BookOpen, label: "Guia Visitas" },
    { to: "/implantador/relatorio-comissoes", icon: FileText, label: "Relatório" },
  ];

  const items = role === "admin" ? adminItems : implantadorItems;

  // Auto-expand groups that contain the active route
  const getInitialExpanded = () => {
    const expanded: Record<string, boolean> = {};
    items.forEach((item) => {
      if (isGroup(item)) {
        const hasActiveChild = item.children.some((c) => location.pathname === c.to);
        if (hasActiveChild) expanded[item.label] = true;
      }
    });
    return expanded;
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>(getInitialExpanded);

  const toggleGroup = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-foreground/50 md:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 md:relative md:translate-x-0 bg-[#a0181c]",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4 md:hidden">
          <span className="text-lg font-bold text-sidebar-foreground">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-sidebar-foreground hover:bg-sidebar-accent">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {items.map((item) => {
            if (isGroup(item)) {
              const isExpanded = !!expanded[item.label];
              const hasActiveChild = item.children.some((c) => location.pathname === c.to);

              return (
                <div key={item.label} className="space-y-0.5">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      hasActiveChild
                        ? "text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5 border-l border-sidebar-border/40 pl-3">
                      {item.children.map((child) => {
                        const isActive = location.pathname === child.to;
                        return (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.label}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-accent-foreground">
              {getRoleLabel(role || "")}
            </p>
            <p className="mt-1 text-xs text-sidebar-accent-foreground/70">MAX SUPORTE</p>
          </div>
        </div>
      </aside>
    </>
  );
}
