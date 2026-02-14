import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NegotiatedTimeBadge } from "@/components/implementation/NegotiatedTimeCard";
import { 
  ClipboardList, Users, Plus, Loader2, Building2, Clock, CalendarClock
} from "lucide-react";

interface Implementation {
  id: string;
  status: string;
  implementation_type: string | null;
  start_date: string;
  total_time_minutes: number;
  negotiated_time_minutes: number | null;
  client: { name: string } | null;
  analysts: string[];
  checklist_items: { is_completed: boolean }[];
}

interface Stats {
  totalImplementations: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalImplementations: 0, scheduled: 0, inProgress: 0, completed: 0, totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: implData } = await supabase
        .from("implementations")
        .select(`
          id, status, implementation_type, start_date,
          total_time_minutes, negotiated_time_minutes, implementer_id,
          client:clients(name), checklist_items(is_completed)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (implData && implData.length > 0) {
        const implIds = implData.map(impl => impl.id);

        // Fetch analysts from pivot table
        const { data: pivotData } = await supabase
          .from("implementation_analysts" as any)
          .select("implementation_id, analyst_id")
          .in("implementation_id", implIds);

        const allAnalystIds = new Set<string>();
        (pivotData as any[] || []).forEach((p: any) => allAnalystIds.add(p.analyst_id));
        implData.forEach(impl => {
          if (impl.implementer_id) allAnalystIds.add(impl.implementer_id);
        });

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", Array.from(allAnalystIds));

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.name]) || []);

        const pivotMap = new Map<string, string[]>();
        (pivotData as any[] || []).forEach((p: any) => {
          const existing = pivotMap.get(p.implementation_id) || [];
          const name = profilesMap.get(p.analyst_id);
          if (name) existing.push(name);
          pivotMap.set(p.implementation_id, existing);
        });

        const implementationsWithNames = implData.map(impl => {
          const pivotNames = pivotMap.get(impl.id);
          const analysts = pivotNames && pivotNames.length > 0
            ? pivotNames
            : impl.implementer_id
              ? [profilesMap.get(impl.implementer_id) || "Não atribuído"]
              : ["Não atribuído"];
          return { ...impl, analysts };
        });

        setImplementations(implementationsWithNames as Implementation[]);
      } else {
        setImplementations([]);
      }

      // Fetch stats
      const [totalRes, scheduledRes, inProgressRes, completedRes, usersRes] = await Promise.all([
        supabase.from("implementations").select("*", { count: "exact", head: true }),
        supabase.from("implementations").select("*", { count: "exact", head: true }).eq("status", "agendada"),
        supabase.from("implementations").select("*", { count: "exact", head: true }).eq("status", "em_andamento"),
        supabase.from("implementations").select("*", { count: "exact", head: true }).eq("status", "concluida"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        totalImplementations: totalRes.count || 0,
        scheduled: scheduledRes.count || 0,
        inProgress: inProgressRes.count || 0,
        completed: completedRes.count || 0,
        totalUsers: usersRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (items: { is_completed: boolean }[]) => {
    if (!items || items.length === 0) return 0;
    return Math.round((items.filter(i => i.is_completed).length / items.length) * 100);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral das implantações</p>
          </div>
          <Link to="/admin/implantacoes/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Implantação
            </Button>
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalImplementations}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{stats.inProgress}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{stats.completed}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.totalUsers}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Implantações Recentes</CardTitle>
            <CardDescription>Últimas 5 implantações cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            {implementations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma implantação encontrada.
                <br />
                <Link to="/admin/implantacoes/nova" className="text-primary hover:underline">
                  Criar primeira implantação
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {implementations.map((impl) => {
                  const progress = getProgress(impl.checklist_items);
                  return (
                    <Link
                      key={impl.id}
                      to={`/admin/implantacoes/${impl.id}`}
                      className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-medium text-foreground">
                            {impl.client?.name || "Cliente não definido"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Implantador(es): {impl.analysts.join(", ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(impl.status)}
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Tempo: {formatTime(impl.total_time_minutes)}</span>
                        <span>Início: {new Date(impl.start_date).toLocaleDateString("pt-BR")}</span>
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
