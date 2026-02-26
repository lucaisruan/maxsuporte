import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  analisada: "Analisada",
  resolvida: "Resolvida",
};

const statusColors: Record<string, string> = {
  aberta: "bg-warning text-warning-foreground",
  analisada: "bg-primary/20 text-primary",
  resolvida: "bg-success text-success-foreground",
};

const tipoLabels: Record<string, string> = {
  visita_tecnica: "Visita Técnica",
  duvida: "Dúvida",
  diagnostico: "Diagnóstico",
  oportunidade: "Oportunidade",
};

export default function VisitasList() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [clienteFilter, setClienteFilter] = useState<string>("all");
  const basePath = role === "admin" ? "/admin" : "/implantador";

  const { data: visitas, isLoading } = useQuery({
    queryKey: ["visitas", clienteFilter],
    queryFn: async () => {
      let query = supabase
        .from("visitas")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });

      if (clienteFilter && clienteFilter !== "all") {
        query = query.eq("cliente_id", clienteFilter);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Fetch profile names for analysts
      if (data && data.length > 0) {
        const analystIds = [...new Set(data.map((v: any) => v.analista_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", analystIds);
        const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name]));
        return data.map((v: any) => ({ ...v, analyst_name: profileMap[v.analista_id] || "N/A" }));
      }
      return data;
    },
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes-visitas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Visitas</h1>
            <p className="text-muted-foreground">Registro de visitas e suporte colaborativo com IA</p>
          </div>
          <Button onClick={() => navigate(`${basePath}/visitas/nova`)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Visita
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clientes?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : visitas?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma visita registrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {visitas?.map((visita: any) => (
              <Card key={visita.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`${basePath}/visitas/${visita.id}`)}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{visita.titulo}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {visita.clients?.name} • {tipoLabels[visita.tipo] || visita.tipo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[visita.status]}>{statusLabels[visita.status]}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{visita.descricao_situacao}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Por: {visita.analyst_name || "N/A"}</span>
                    <span>{format(new Date(visita.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
