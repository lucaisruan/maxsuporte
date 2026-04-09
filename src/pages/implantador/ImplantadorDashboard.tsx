import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Clock, Loader2 } from "lucide-react";
import { NegotiatedTimeBadge } from "@/components/implementation/NegotiatedTimeCard";

interface Implementation {
  id: string;
  status: string;
  implementation_type: string | null;
  start_date: string;
  total_time_minutes: number;
  negotiated_time_minutes: number | null;
  has_data_migration: boolean;
  client: { name: string } | null;
  checklist_items: { is_completed: boolean; title: string }[];
}

export default function ImplantadorDashboard() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();

  useEffect(() => {
    if (user) {
      fetchImplementations();
    }
  }, [user]);

  const fetchImplementations = async () => {
    try {
      const { data: assignments } = await supabase
        .from("implementation_analysts" as any)
        .select("implementation_id")
        .eq("analyst_id", user?.id);

      const assignedIds = (assignments as any[] || []).map((a: any) => a.implementation_id);

      let query = supabase
        .from("implementations")
        .select(`
          id,
          status,
          implementation_type,
          start_date,
          total_time_minutes,
          negotiated_time_minutes,
          has_data_migration,
          client:clients(name),
          checklist_items(is_completed,title)
        `)
        .in("status", ["em_andamento", "agendada"])
        .order("created_at", { ascending: false });

      if (assignedIds.length > 0) {
        query = query.or(`implementer_id.eq.${user?.id},id.in.(${assignedIds.join(",")})`);
      } else {
        query = query.eq("implementer_id", user?.id);
      }

      const { data } = await query;

      if (data) {
        const unique = Array.from(new Map((data as Implementation[]).map(i => [i.id, i])).values());
        setImplementations(unique);
      }
    } catch (error) {
      console.error("Error fetching implementations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (impl: Implementation) => {
    const items = impl.checklist_items?.filter((item) => {
      if (item.title === "Migração de Dados" && !impl.has_data_migration) return false;
      return true;
    }) || [];
    if (items.length === 0) return 0;
    const completed = items.filter((item) => item.is_completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      agendada: { variant: "secondary", label: "Agendada" },
      em_andamento: { variant: "default", label: "Em Andamento" },
      pausada: { variant: "secondary", label: "Pausada" },
      concluida: { variant: "outline", label: "Concluída" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.em_andamento;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const stats = {
    total: implementations.length,
    inProgress: implementations.filter((i) => i.status === "em_andamento").length,
    completed: implementations.filter((i) => i.status === "concluida").length,
  };

  const basePath = role === "admin" ? "/admin" : "/implantador";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Minhas Implantações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe suas implantações em andamento</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-5 md:grid-cols-3 stagger-children">
          {[
            { label: "Total", value: stats.total, icon: ClipboardList, color: "text-foreground" },
            { label: "Em Andamento", value: stats.inProgress, icon: Clock, color: "text-primary" },
            { label: "Concluídas", value: stats.completed, icon: ClipboardList, color: "text-[hsl(142_76%_36%)]" },
          ].map((kpi) => (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/8">
                  <kpi.icon className="h-4 w-4 text-primary/70" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Implementations List */}
        <Card>
          <CardHeader>
            <CardTitle>Implantações Atribuídas</CardTitle>
            <CardDescription>Clique em uma implantação para gerenciá-la</CardDescription>
          </CardHeader>
          <CardContent>
            {implementations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Nenhuma implantação atribuída a você ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {implementations.map((impl) => {
                  const progress = getProgress(impl);
                  return (
                    <Link
                      key={impl.id}
                      to={`${basePath}/implantacoes/${impl.id}`}
                      className="block rounded-xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground">
                            {impl.client?.name || "Cliente não definido"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Início: {new Date(impl.start_date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(impl.status)}
                        </div>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="text-xs font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Tempo total: {formatTime(impl.total_time_minutes)}</span>
                        {impl.negotiated_time_minutes && impl.negotiated_time_minutes > 0 && (
                          <NegotiatedTimeBadge
                            negotiatedMinutes={impl.negotiated_time_minutes}
                            usedMinutes={impl.total_time_minutes}
                          />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
