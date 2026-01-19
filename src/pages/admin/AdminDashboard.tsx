import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardList, 
  Users, 
  Plus, 
  Loader2,
  Building2,
  Clock
} from "lucide-react";

interface Implementation {
  id: string;
  status: string;
  start_date: string;
  total_time_minutes: number;
  client: { name: string } | null;
  implementer: { name: string } | null;
  checklist_items: { is_completed: boolean }[];
}

interface Stats {
  totalImplementations: number;
  inProgress: number;
  completed: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalImplementations: 0,
    inProgress: 0,
    completed: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch implementations with related data
      const { data: implData } = await supabase
        .from("implementations")
        .select(`
          id,
          status,
          start_date,
          total_time_minutes,
          implementer_id,
          client:clients(name),
          checklist_items(is_completed)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch implementer names separately
      if (implData && implData.length > 0) {
        const implementerIds = implData.map(impl => impl.implementer_id).filter(Boolean);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", implementerIds);

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.name]) || []);
        
        const implementationsWithNames = implData.map(impl => ({
          ...impl,
          implementer: impl.implementer_id ? { name: profilesMap.get(impl.implementer_id) || "Não atribuído" } : null
        }));
        
        setImplementations(implementationsWithNames as Implementation[]);
      } else {
        setImplementations([]);
      }

      // Fetch stats
      const { count: totalImpl } = await supabase
        .from("implementations")
        .select("*", { count: "exact", head: true });

      const { count: inProgress } = await supabase
        .from("implementations")
        .select("*", { count: "exact", head: true })
        .eq("status", "em_andamento");

      const { count: completed } = await supabase
        .from("implementations")
        .select("*", { count: "exact", head: true })
        .eq("status", "concluida");

      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      setStats({
        totalImplementations: totalImpl || 0,
        inProgress: inProgress || 0,
        completed: completed || 0,
        totalUsers: totalUsers || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProgress = (items: { is_completed: boolean }[]) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter((item) => item.is_completed).length;
    return Math.round((completed / items.length) * 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
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

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Implantações</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalImplementations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Implementations */}
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
                            Implantador: {impl.implementer?.name || "Não atribuído"}
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
