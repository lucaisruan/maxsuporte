import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NegotiatedTimeBadge } from "@/components/implementation/NegotiatedTimeCard";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Loader2, Pencil, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Implementation {
  id: string;
  status: string;
  start_date: string;
  total_time_minutes: number;
  negotiated_time_minutes: number | null;
  client: { name: string } | null;
  analysts: string[];
  commission_type: { name: string } | null;
  checklist_items: { is_completed: boolean }[];
}

export default function ImplantacoesAdmin() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchImplementations();
  }, []);

  const fetchImplementations = async () => {
    try {
      const { data, error } = await supabase
        .from("implementations")
        .select(`
          id,
          status,
          start_date,
          total_time_minutes,
          negotiated_time_minutes,
          implementer_id,
          client:clients(name),
          commission_type:commission_types(name),
          checklist_items(is_completed)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const implIds = data.map(impl => impl.id);

        // Fetch analysts from pivot table
        const { data: pivotData } = await supabase
          .from("implementation_analysts" as any)
          .select("implementation_id, analyst_id")
          .in("implementation_id", implIds);

        // Get all unique analyst IDs
        const allAnalystIds = new Set<string>();
        (pivotData as any[] || []).forEach((p: any) => allAnalystIds.add(p.analyst_id));
        // Also include legacy implementer_ids
        data.forEach(impl => {
          if (impl.implementer_id) allAnalystIds.add(impl.implementer_id);
        });

        // Fetch profiles
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", Array.from(allAnalystIds));

        const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.name]) || []);

        // Build pivot map
        const pivotMap = new Map<string, string[]>();
        (pivotData as any[] || []).forEach((p: any) => {
          const existing = pivotMap.get(p.implementation_id) || [];
          const name = profilesMap.get(p.analyst_id);
          if (name) existing.push(name);
          pivotMap.set(p.implementation_id, existing);
        });

        const implementationsWithNames = data.map(impl => {
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
    } catch (error) {
      console.error("Error fetching implementations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("implementations")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setImplementations((prev) => prev.filter((impl) => impl.id !== id));
      toast({
        title: "Implantação excluída",
        description: "A implantação foi removida com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
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
            <h1 className="text-2xl font-bold text-foreground">Implantações</h1>
            <p className="text-muted-foreground">Gerencie todas as implantações</p>
          </div>
          <Link to="/admin/implantacoes/nova">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Implantação
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Implantações</CardTitle>
          </CardHeader>
          <CardContent>
            {implementations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma implantação encontrada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Modo</TableHead>
                      <TableHead>Implantador(es)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progresso</TableHead>
                      <TableHead>Tempo</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {implementations.map((impl) => {
                      const progress = getProgress(impl.checklist_items);
                      return (
                        <TableRow key={impl.id}>
                          <TableCell className="font-medium">
                            {impl.client?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {impl.commission_type?.name || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {impl.analysts.map((name, idx) => (
                                <div key={idx} className="text-sm">{name}</div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(impl.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={progress} className="h-2 w-16" />
                              <span className="text-sm">{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatTime(impl.total_time_minutes)}
                            {impl.negotiated_time_minutes && impl.negotiated_time_minutes > 0 && (
                              <div className="mt-1">
                                <NegotiatedTimeBadge
                                  negotiatedMinutes={impl.negotiated_time_minutes}
                                  usedMinutes={impl.total_time_minutes}
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(impl.start_date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/implantacoes/${impl.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/admin/implantacoes/${impl.id}/editar`)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir implantação?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso excluirá permanentemente
                                      a implantação e todos os dados relacionados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(impl.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
