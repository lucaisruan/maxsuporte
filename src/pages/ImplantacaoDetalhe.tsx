import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/useTimer";
import { Loader2, ArrowLeft, Plus, Clock, Copy, Play, Square, Timer } from "lucide-react";
import { ChecklistItemCard } from "@/components/checklist/ChecklistItemCard";
import { CommissionSelectionModal } from "@/components/commission/CommissionSelectionModal";

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  time_spent_minutes: number;
  observations: string | null;
  order_index: number;
}

interface Episode {
  id: string;
  episode_type: string;
  module: string;
  trained_clients: string | null;
  episode_date: string;
  start_time: string;
  end_time: string;
  time_spent_minutes: number;
  observations: string | null;
}

interface Implementation {
  id: string;
  status: string;
  commission_type_id: string | null;
  start_date: string;
  end_date: string | null;
  total_time_minutes: number;
  observations: string | null;
  client: { name: string; cnpj: string | null } | null;
  commission_type: { name: string } | null;
}

export default function ImplantacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();
  const timer = useTimer();

  const [implementation, setImplementation] = useState<Implementation | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Commission modal state
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [savingCommissions, setSavingCommissions] = useState(false);

  // Episode form state
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [episodeType, setEpisodeType] = useState<string>("");
  const [episodeModule, setEpisodeModule] = useState<string>("");
  const [trainedClients, setTrainedClients] = useState("");
  const [episodeDate, setEpisodeDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [episodeObservations, setEpisodeObservations] = useState("");
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [useTimerMode, setUseTimerMode] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch implementation
      const { data: implData } = await supabase
        .from("implementations")
        .select(`
          id,
          status,
          commission_type_id,
          start_date,
          end_date,
          total_time_minutes,
          observations,
          client:clients(name, cnpj),
          commission_type:commission_types(name)
        `)
        .eq("id", id)
        .single();

      if (implData) {
        setImplementation(implData as Implementation);
      }

      // Fetch checklist items
      const { data: checklistData } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("implementation_id", id)
        .order("order_index");

      if (checklistData) {
        setChecklistItems(checklistData);
      }

      // Fetch episodes
      const { data: episodesData } = await supabase
        .from("episodes")
        .select("*")
        .eq("implementation_id", id)
        .order("episode_date", { ascending: false });

      if (episodesData) {
        setEpisodes(episodesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistUpdate = useCallback(async (
    itemId: string,
    field: "is_completed" | "time_spent_minutes" | "observations",
    value: boolean | number | string
  ) => {
    if (role === "admin") return; // Admin can only view

    setSavingItem(itemId);

    try {
      const updateData: Record<string, unknown> = { [field]: value };

      const { error } = await supabase
        .from("checklist_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;

      setChecklistItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        )
      );

      // Recalculate total time from database (not from stale state)
      if (field === "time_spent_minutes") {
        await recalculateTotalTimeFromDB();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    } finally {
      setSavingItem(null);
    }
  }, [role, id, toast]);

  // Recalculates total time by fetching fresh data from database
  const recalculateTotalTimeFromDB = useCallback(async () => {
    if (!id) return;

    // Fetch fresh checklist times from DB
    const { data: checklistData } = await supabase
      .from("checklist_items")
      .select("time_spent_minutes")
      .eq("implementation_id", id);

    // Fetch fresh episode times from DB
    const { data: episodesData } = await supabase
      .from("episodes")
      .select("time_spent_minutes")
      .eq("implementation_id", id);

    const checklistTime = (checklistData || []).reduce(
      (acc, item) => acc + (item.time_spent_minutes || 0),
      0
    );
    const episodesTime = (episodesData || []).reduce(
      (acc, ep) => acc + (ep.time_spent_minutes || 0),
      0
    );
    const totalTime = checklistTime + episodesTime;

    await supabase
      .from("implementations")
      .update({ total_time_minutes: totalTime })
      .eq("id", id);

    setImplementation((prev) =>
      prev ? { ...prev, total_time_minutes: totalTime } : null
    );
  }, [id]);

  const handleStartTimer = () => {
    setUseTimerMode(true);
    timer.startTimer();
    setStartTime(timer.getStartTime() || new Date().toTimeString().slice(0, 5));
    setEpisodeDate(new Date().toISOString().split("T")[0]);
  };

  const handleStopTimer = () => {
    timer.stopTimer();
    setEndTime(new Date().toTimeString().slice(0, 5));
  };

  const handleAddEpisode = async () => {
    if (!episodeType || !episodeModule || !episodeDate || !startTime || !endTime) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
      });
      return;
    }

    // Calculate time spent
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end.getTime() - start.getTime();
    const timeSpentMinutes = Math.round(diffMs / 60000);

    if (timeSpentMinutes <= 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A hora de término deve ser maior que a hora de início.",
      });
      return;
    }

    setSavingEpisode(true);

    try {
      const { data, error } = await supabase
        .from("episodes")
        .insert({
          implementation_id: id!,
          episode_type: episodeType as "treinamento" | "parametrizacao" | "ajuste_fiscal" | "migracao",
          module: episodeModule as "vendas" | "financeiro" | "cadastros" | "relatorios" | "caixa" | "fiscal" | "geral",
          trained_clients: trainedClients || null,
          episode_date: episodeDate,
          start_time: startTime,
          end_time: endTime,
          time_spent_minutes: timeSpentMinutes,
          observations: episodeObservations || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setEpisodes((prev) => [data, ...prev]);
      setEpisodeDialogOpen(false);
      resetEpisodeForm();
      await recalculateTotalTimeFromDB();

      toast({
        title: "Episódio adicionado!",
        description: "O episódio foi registrado com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao adicionar episódio",
        description: error.message,
      });
    } finally {
      setSavingEpisode(false);
    }
  };

  const resetEpisodeForm = () => {
    setEpisodeType("");
    setEpisodeModule("");
    setTrainedClients("");
    setEpisodeDate(new Date().toISOString().split("T")[0]);
    setStartTime("");
    setEndTime("");
    setEpisodeObservations("");
    setUseTimerMode(false);
    timer.resetTimer();
  };

  const getImplementationTypeLabel = () => {
    return implementation?.commission_type?.name || null;
  };

  const generateReport = () => {
    if (!implementation) return;

    const completedItems = checklistItems.filter((i) => i.is_completed);
    const pendingItems = checklistItems.filter((i) => !i.is_completed);
    const implType = getImplementationTypeLabel();

    const report = `
═══════════════════════════════════════════════
           RELATÓRIO DE IMPLANTAÇÃO
           MAX IMPLANTAÇÕES
═══════════════════════════════════════════════

📋 DADOS DO CLIENTE
───────────────────────────────────────────────
Cliente: ${implementation.client?.name || "N/A"}
CNPJ: ${implementation.client?.cnpj || "N/A"}
${implType ? `Tipo: ${implType}` : ""}

📅 PERÍODO
───────────────────────────────────────────────
Início: ${new Date(implementation.start_date).toLocaleDateString("pt-BR")}
Término: ${implementation.end_date ? new Date(implementation.end_date).toLocaleDateString("pt-BR") : "Em andamento"}
Status: ${implementation.status.replace("_", " ").toUpperCase()}

⏱️ TEMPO TOTAL
───────────────────────────────────────────────
${Math.floor(implementation.total_time_minutes / 60)}h ${implementation.total_time_minutes % 60}min

✅ ETAPAS CONCLUÍDAS (${completedItems.length}/${checklistItems.length})
───────────────────────────────────────────────
${completedItems.map((item) => `• ${item.title} - ${Math.floor(item.time_spent_minutes / 60)}h ${item.time_spent_minutes % 60}min${item.observations ? `\n  Obs: ${item.observations}` : ""}`).join("\n")}

❌ ETAPAS PENDENTES (${pendingItems.length})
───────────────────────────────────────────────
${pendingItems.length > 0 ? pendingItems.map((item) => `• ${item.title}`).join("\n") : "Todas as etapas foram concluídas!"}

📝 EPISÓDIOS REGISTRADOS (${episodes.length})
───────────────────────────────────────────────
${episodes.map((ep) => `• [${ep.episode_date}] ${ep.episode_type.toUpperCase()} - ${ep.module}
  Horário: ${ep.start_time} às ${ep.end_time} (${Math.floor(ep.time_spent_minutes / 60)}h ${ep.time_spent_minutes % 60}min)
  ${ep.trained_clients ? `Treinados: ${ep.trained_clients}` : ""}
  ${ep.observations ? `Obs: ${ep.observations}` : ""}`).join("\n\n")}

═══════════════════════════════════════════════
Relatório gerado em: ${new Date().toLocaleString("pt-BR")}
═══════════════════════════════════════════════
    `.trim();

    navigator.clipboard.writeText(report);
    toast({
      title: "Relatório copiado!",
      description: "O relatório foi copiado para a área de transferência.",
    });
  };

  const getProgress = () => {
    if (checklistItems.length === 0) return 0;
    const completed = checklistItems.filter((item) => item.is_completed).length;
    return Math.round((completed / checklistItems.length) * 100);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getEpisodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      treinamento: "Treinamento",
      parametrizacao: "Parametrização",
      ajuste_fiscal: "Ajuste Fiscal",
      migracao: "Migração",
    };
    return labels[type] || type;
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      vendas: "Vendas",
      financeiro: "Financeiro",
      cadastros: "Cadastros",
      relatorios: "Relatórios",
      caixa: "Caixa",
      fiscal: "Fiscal",
      geral: "Geral",
    };
    return labels[module] || module;
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

  const handleStatusChange = async (newStatus: string) => {
    if (!implementation || role !== "admin") return;
    
    // If changing to "concluida", open commission modal first
    if (newStatus === "concluida" && implementation.status !== "concluida") {
      setPendingStatus(newStatus);
      setCommissionModalOpen(true);
      return;
    }

    // For other status changes, proceed directly
    await updateImplementationStatus(newStatus);
  };

  const updateImplementationStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("implementations")
        .update({ status: newStatus as "agendada" | "em_andamento" | "pausada" | "concluida" | "cancelada" })
        .eq("id", id);

      if (error) throw error;

      setImplementation((prev) =>
        prev ? { ...prev, status: newStatus } : null
      );

      toast({
        title: "Status atualizado!",
        description: `Status alterado para ${newStatus.replace("_", " ")}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCommissionConfirm = async (selectedCommissions: { id: string; name: string; value: number }[]) => {
    if (!id || !pendingStatus) return;

    setSavingCommissions(true);
    try {
      // Insert commission records
      const commissionsToInsert = selectedCommissions.map((ct) => ({
        implementation_id: id,
        commission_type_id: ct.id,
        commission_name: ct.name,
        commission_value: ct.value,
        created_by: user?.id,
      }));

      const { error: commissionError } = await supabase
        .from("implementation_commissions")
        .insert(commissionsToInsert);

      if (commissionError) throw commissionError;

      // Calculate total commission value
      const totalCommission = selectedCommissions.reduce((acc, ct) => acc + ct.value, 0);

      // Now update the implementation status to concluida with the total commission
      const { error: statusError } = await supabase
        .from("implementations")
        .update({ 
          status: pendingStatus as "concluida",
          commission_value: totalCommission 
        })
        .eq("id", id);

      if (statusError) throw statusError;

      setImplementation((prev) =>
        prev ? { ...prev, status: pendingStatus } : null
      );

      setCommissionModalOpen(false);
      setPendingStatus(null);

      toast({
        title: "Implantação concluída!",
        description: `${selectedCommissions.length} comissão(ões) vinculada(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao vincular comissões",
        description: error.message,
      });
    } finally {
      setSavingCommissions(false);
    }
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

  if (!implementation) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p className="text-muted-foreground">Implantação não encontrada.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isImplantador = role === "implantador";
  const implType = getImplementationTypeLabel();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {implementation.client?.name}
                </h1>
                {implType && (
                  <Badge variant="outline" className="text-xs">
                    {implType}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">
                {implementation.client?.cnpj || "CNPJ não informado"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {role === "admin" ? (
              <Select 
                value={implementation.status} 
                onValueChange={handleStatusChange}
                disabled={updatingStatus}
              >
                <SelectTrigger className="w-[180px]">
                  {updatingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              getStatusBadge(implementation.status)
            )}
            <Button variant="outline" onClick={generateReport}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Relatório
            </Button>
          </div>
        </div>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Progresso da Implantação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conclusão</span>
                <span className="text-lg font-bold">{getProgress()}%</span>
              </div>
              <Progress value={getProgress()} className="h-3" />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tempo Total</span>
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    {formatTime(implementation.total_time_minutes)}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Início</span>
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    {new Date(implementation.start_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Etapas</span>
                  </div>
                  <p className="mt-1 text-lg font-bold">
                    {checklistItems.filter((i) => i.is_completed).length}/{checklistItems.length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Implantação</CardTitle>
            <CardDescription>
              {isImplantador
                ? "Marque as etapas concluídas e informe o tempo gasto"
                : "Visualize o progresso das etapas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checklistItems.map((item) => (
                <ChecklistItemCard
                  key={item.id}
                  item={item}
                  isImplantador={isImplantador}
                  isSaving={savingItem === item.id}
                  onUpdate={handleChecklistUpdate}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Episodes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Episódios</CardTitle>
              <CardDescription>Treinamentos, parametrizações e ajustes</CardDescription>
            </div>
            {isImplantador && (
              <Dialog open={episodeDialogOpen} onOpenChange={(open) => {
                setEpisodeDialogOpen(open);
                if (!open) resetEpisodeForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Episódio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Novo Episódio</DialogTitle>
                    <DialogDescription>
                      Registre um novo episódio de implantação
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Timer Section */}
                    <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Timer className="h-5 w-5 text-primary" />
                          <span className="font-medium">Timer (Opcional)</span>
                        </div>
                        {timer.isRunning ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleStopTimer}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Parar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleStartTimer}
                            disabled={useTimerMode && !timer.isRunning}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar
                          </Button>
                        )}
                      </div>
                      {(timer.isRunning || useTimerMode) && (
                        <div className="mt-3 text-center">
                          <p className="text-3xl font-mono font-bold text-primary">
                            {timer.formattedTime}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {timer.isRunning ? "Cronômetro em execução..." : "Timer finalizado"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={episodeType} onValueChange={setEpisodeType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="treinamento">Treinamento</SelectItem>
                            <SelectItem value="parametrizacao">Parametrização</SelectItem>
                            <SelectItem value="ajuste_fiscal">Ajuste Fiscal</SelectItem>
                            <SelectItem value="migracao">Migração</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Módulo *</Label>
                        <Select value={episodeModule} onValueChange={setEpisodeModule}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendas">Vendas</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                            <SelectItem value="cadastros">Cadastros</SelectItem>
                            <SelectItem value="relatorios">Relatórios</SelectItem>
                            <SelectItem value="caixa">Caixa</SelectItem>
                            <SelectItem value="fiscal">Fiscal</SelectItem>
                            <SelectItem value="geral">Geral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Cliente(s) Treinado(s)</Label>
                      <Input
                        value={trainedClients}
                        onChange={(e) => setTrainedClients(e.target.value)}
                        placeholder="Nome dos participantes"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        value={episodeDate}
                        onChange={(e) => setEpisodeDate(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Hora Início *</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hora Fim *</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={episodeObservations}
                        onChange={(e) => setEpisodeObservations(e.target.value)}
                        placeholder="Detalhes do episódio..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEpisodeDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddEpisode} disabled={savingEpisode}>
                      {savingEpisode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {episodes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum episódio registrado.
              </div>
            ) : (
              <div className="space-y-4">
                {episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getEpisodeTypeLabel(episode.episode_type)}
                          </Badge>
                          <Badge variant="secondary">
                            {getModuleLabel(episode.module)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(episode.episode_date).toLocaleDateString("pt-BR")} •{" "}
                          {episode.start_time} às {episode.end_time}
                        </p>
                        {episode.trained_clients && (
                          <p className="text-sm">
                            <span className="text-muted-foreground">Treinados:</span>{" "}
                            {episode.trained_clients}
                          </p>
                        )}
                        {episode.observations && (
                          <p className="text-sm text-muted-foreground">
                            {episode.observations}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatTime(episode.time_spent_minutes)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Selection Modal */}
        <CommissionSelectionModal
          open={commissionModalOpen}
          onOpenChange={(open) => {
            setCommissionModalOpen(open);
            if (!open) setPendingStatus(null);
          }}
          implementationId={id || ""}
          onConfirm={handleCommissionConfirm}
          isConfirming={savingCommissions}
        />
      </div>
    </DashboardLayout>
  );
}
