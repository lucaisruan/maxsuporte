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
  client: { name: string } | null;
  checklist_items: { is_completed: boolean }[];
}

export default function ImplantadorDashboard() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchImplementations();
    }
  }, [user]);

  const fetchImplementations = async () => {
    try {
      // Fetch all implementations assigned to this implantador
      // Including scheduled ones - they should see all their assigned work
      const { data } = await supabase
        .from("implementations")
        .select(`
          id,
          status,
          implementation_type,
          start_date,
          total_time_minutes,
          negotiated_time_minutes,
          client:clients(name),
          checklist_items(is_completed)
        `)
        .eq("implementer_id", user?.id)
        .order("created_at", { ascending: false });

      if (data) {
        setImplementations(data as Implementation[]);
      }
    } catch (error) {
      console.error("Error fetching implementations:", error);
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
      agendada: { variant: "secondary", label: "Agendada" },
      em_andamento: { variant: "default", label: "Em Andamento" },
      pausada: { variant: "secondary", label: "Pausada" },
      concluida: { variant: "outline", label: "Concluída" },
      cancelada: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.em_andamento;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getImplementationTypeBadge = (type: string | null) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      web: "Web",
      manager: "Manager",
      basic: "Basic",
    };
    return (
      <Badge variant="outline" className="text-xs">
        {labels[type] || type}
      </Badge>
    );
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Implantações</h1>
          <p className="text-muted-foreground">Acompanhe suas implantações em andamento</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
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
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Implementations List */}
        <Card>
          <CardHeader>
            <CardTitle>Implantações Atribuídas</CardTitle>
            <CardDescription>Clique em uma implantação para gerenciá-la</CardDescription>
          </CardHeader>
          <CardContent>
            {implementations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma implantação atribuída a você ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {implementations.map((impl) => {
                  const progress = getProgress(impl.checklist_items);
                  return (
                    <Link
                      key={impl.id}
                      to={`/implantador/implantacoes/${impl.id}`}
                      className="block rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">
                              {impl.client?.name || "Cliente não definido"}
                            </h3>
                            {getImplementationTypeBadge(impl.implementation_type)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Início: {new Date(impl.start_date).toLocaleDateString("pt-BR")}
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
