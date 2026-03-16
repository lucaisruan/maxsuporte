import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, ClipboardCheck, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Demand {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  total_score: number;
  max_score: number;
  created_at: string;
  template_name?: string;
  analysts?: string[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "secondary", icon: Clock },
  em_andamento: { label: "Em Andamento", variant: "default", icon: ClipboardCheck },
  concluida: { label: "Concluída", variant: "outline", icon: CheckCircle2 },
  atrasada: { label: "Atrasada", variant: "destructive", icon: AlertTriangle },
};

export default function DemandasList() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const { role } = useAuth();

  const basePath = role === "admin" ? "/admin" : "/implantador";

  useEffect(() => {
    fetchDemands();
  }, []);

  const fetchDemands = async () => {
    const { data } = await supabase
      .from("demands")
      .select("*, demand_templates(name), demand_analysts(analyst_id, profiles:analyst_id(name))")
      .order("created_at", { ascending: false });

    if (data) {
      setDemands(
        data.map((d: any) => ({
          id: d.id,
          title: d.title,
          description: d.description,
          status: d.status,
          deadline: d.deadline,
          total_score: d.total_score,
          max_score: d.max_score,
          created_at: d.created_at,
          template_name: d.demand_templates?.name,
          analysts: d.demand_analysts?.map((a: any) => a.profiles?.name).filter(Boolean) || [],
        }))
      );
    }
    setLoading(false);
  };

  const filtered = statusFilter === "all"
    ? demands
    : demands.filter((d) => d.status === statusFilter);

  // Check for overdue demands
  useEffect(() => {
    const now = new Date();
    demands.forEach(async (d) => {
      if (d.status === "pendente" || d.status === "em_andamento") {
        if (d.deadline && new Date(d.deadline) < now) {
          await supabase.from("demands").update({ status: "atrasada" as any }).eq("id", d.id);
        }
      }
    });
  }, [demands]);

  const stats = {
    pendente: demands.filter((d) => d.status === "pendente").length,
    em_andamento: demands.filter((d) => d.status === "em_andamento").length,
    concluida: demands.filter((d) => d.status === "concluida").length,
    atrasada: demands.filter((d) => d.status === "atrasada").length,
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
            <h1 className="text-2xl font-bold text-foreground">Demandas Operacionais</h1>
            <p className="text-muted-foreground">Gerencie as demandas e procedimentos</p>
          </div>
          {role === "admin" && (
            <Button asChild>
              <Link to={`${basePath}/demandas/nova`}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Demanda
              </Link>
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <Card
                key={key}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setStatusFilter(key === statusFilter ? "all" : key)}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats[key as keyof typeof stats]}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex gap-4 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="atrasada">Atrasada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Demands List */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma demanda encontrada.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => {
              const config = statusConfig[d.status] || statusConfig.pendente;
              const scorePercent = d.max_score > 0 ? Math.round((d.total_score / d.max_score) * 100) : 0;
              return (
                <Link key={d.id} to={`${basePath}/demandas/${d.id}`}>
                  <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">{d.title}</h3>
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </div>
                        {d.template_name && (
                          <p className="text-xs text-muted-foreground mb-1">
                            Modelo: {d.template_name}
                          </p>
                        )}
                        {d.analysts && d.analysts.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Analistas: {d.analysts.join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        {d.deadline && (
                          <div className="text-xs text-muted-foreground">
                            Prazo: {new Date(d.deadline).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                        {d.max_score > 0 && (
                          <Badge variant="outline">
                            {d.total_score}/{d.max_score} pts ({scorePercent}%)
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
