import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Plus, Clock, FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import logo from "@/assets/logo.jpeg";

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
  start_date: string;
  end_date: string | null;
  total_time_minutes: number;
  observations: string | null;
  client: { name: string; cnpj: string | null } | null;
}

export default function ImplantacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role } = useAuth();

  const [implementation, setImplementation] = useState<Implementation | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState<string | null>(null);

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
          start_date,
          end_date,
          total_time_minutes,
          observations,
          client:clients(name, cnpj)
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

  const handleChecklistUpdate = async (
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

      // Recalculate total time
      if (field === "time_spent_minutes") {
        await updateTotalTime();
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
  };

  const updateTotalTime = async () => {
    const checklistTime = checklistItems.reduce((acc, item) => acc + item.time_spent_minutes, 0);
    const episodesTime = episodes.reduce((acc, ep) => acc + ep.time_spent_minutes, 0);
    const totalTime = checklistTime + episodesTime;

    await supabase
      .from("implementations")
      .update({ total_time_minutes: totalTime })
      .eq("id", id);

    setImplementation((prev) =>
      prev ? { ...prev, total_time_minutes: totalTime } : null
    );
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
      await updateTotalTime();

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
  };

  const generatePDF = async () => {
    if (!implementation) return;

    const completedItems = checklistItems.filter((i) => i.is_completed);
    const pendingItems = checklistItems.filter((i) => !i.is_completed);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Load logo as base64
    const loadImage = (src: string): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg"));
        };
        img.src = src;
      });
    };

    try {
      const logoBase64 = await loadImage(logo);

      // Header with logo
      doc.setFillColor(220, 38, 38); // Red color
      doc.rect(0, 0, pageWidth, 35, "F");
      
      // Add logo
      doc.addImage(logoBase64, "JPEG", 15, 5, 25, 25);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE IMPLANTAÇÃO", pageWidth / 2 + 10, 15, { align: "center" });
      doc.setFontSize(12);
      doc.text("MAX IMPLANTAÇÕES", pageWidth / 2 + 10, 25, { align: "center" });

      y = 50;
      doc.setTextColor(0, 0, 0);

    // Client Data Section
    doc.setFillColor(245, 245, 245);
    doc.rect(10, y - 5, pageWidth - 20, 25, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO CLIENTE", 15, y + 3);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${implementation.client?.name || "N/A"}`, 15, y + 12);
    doc.text(`CNPJ: ${implementation.client?.cnpj || "N/A"}`, 15, y + 18);
    y += 35;

    // Period Section
    doc.setFillColor(245, 245, 245);
    doc.rect(10, y - 5, pageWidth - 20, 25, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PERÍODO", 15, y + 3);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Início: ${new Date(implementation.start_date).toLocaleDateString("pt-BR")}`, 15, y + 12);
    doc.text(`Término: ${implementation.end_date ? new Date(implementation.end_date).toLocaleDateString("pt-BR") : "Em andamento"}`, 80, y + 12);
    doc.text(`Status: ${implementation.status.replace("_", " ").toUpperCase()}`, 15, y + 18);
    y += 35;

    // Total Time Section
    doc.setFillColor(220, 38, 38);
    doc.rect(10, y - 5, pageWidth - 20, 15, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TEMPO TOTAL: ${Math.floor(implementation.total_time_minutes / 60)}h ${implementation.total_time_minutes % 60}min`, pageWidth / 2, y + 5, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 25;

    // Completed Steps
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`ETAPAS CONCLUÍDAS (${completedItems.length}/${checklistItems.length})`, 15, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    
    completedItems.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(220, 252, 231);
      doc.rect(10, y - 3, pageWidth - 20, 8, "F");
      doc.text(`✓ ${item.title} - ${Math.floor(item.time_spent_minutes / 60)}h ${item.time_spent_minutes % 60}min`, 15, y + 2);
      y += 10;
      if (item.observations) {
        doc.setTextColor(100, 100, 100);
        doc.text(`   Obs: ${item.observations}`, 15, y);
        doc.setTextColor(0, 0, 0);
        y += 6;
      }
    });

    y += 5;

    // Pending Steps
    if (pendingItems.length > 0) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`ETAPAS PENDENTES (${pendingItems.length})`, 15, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      pendingItems.forEach((item) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(254, 226, 226);
        doc.rect(10, y - 3, pageWidth - 20, 8, "F");
        doc.text(`○ ${item.title}`, 15, y + 2);
        y += 10;
      });
    }

    y += 5;

    // Episodes
    if (episodes.length > 0) {
      if (y > 230) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`EPISÓDIOS REGISTRADOS (${episodes.length})`, 15, y);
      y += 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      
      episodes.forEach((ep) => {
        if (y > 255) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(240, 240, 240);
        doc.rect(10, y - 3, pageWidth - 20, 18, "F");
        doc.setFont("helvetica", "bold");
        doc.text(`${getEpisodeTypeLabel(ep.episode_type)} - ${getModuleLabel(ep.module)}`, 15, y + 2);
        doc.setFont("helvetica", "normal");
        doc.text(`Data: ${new Date(ep.episode_date).toLocaleDateString("pt-BR")} | ${ep.start_time} às ${ep.end_time} (${Math.floor(ep.time_spent_minutes / 60)}h ${ep.time_spent_minutes % 60}min)`, 15, y + 8);
        if (ep.trained_clients) {
          doc.text(`Treinados: ${ep.trained_clients}`, 15, y + 14);
        }
        y += 22;
        if (ep.observations) {
          doc.setTextColor(100, 100, 100);
          doc.text(`Obs: ${ep.observations.substring(0, 80)}${ep.observations.length > 80 ? "..." : ""}`, 15, y - 2);
          doc.setTextColor(0, 0, 0);
          y += 6;
        }
      });
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Relatório gerado em: ${new Date().toLocaleString("pt-BR")}`, 15, 285);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 30, 285);
    }

    // Save PDF
    const clientName = implementation.client?.name?.replace(/[^a-zA-Z0-9]/g, "_") || "implantacao";
    doc.save(`relatorio_${clientName}_${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "PDF gerado!",
      description: "O relatório foi baixado com sucesso.",
    });
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast({
        variant: "destructive",
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório.",
      });
    }
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
              <h1 className="text-2xl font-bold text-foreground">
                {implementation.client?.name}
              </h1>
              <p className="text-muted-foreground">
                {implementation.client?.cnpj || "CNPJ não informado"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={generatePDF}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
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
                <div
                  key={item.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={item.is_completed}
                      disabled={!isImplantador || savingItem === item.id}
                      onCheckedChange={(checked) =>
                        handleChecklistUpdate(item.id, "is_completed", !!checked)
                      }
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {savingItem === item.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                      {isImplantador && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Tempo gasto (minutos)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.time_spent_minutes}
                              onChange={(e) =>
                                handleChecklistUpdate(
                                  item.id,
                                  "time_spent_minutes",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Observações</Label>
                            <Input
                              value={item.observations || ""}
                              onChange={(e) =>
                                handleChecklistUpdate(item.id, "observations", e.target.value)
                              }
                              placeholder="Adicionar observação..."
                              className="h-8"
                            />
                          </div>
                        </div>
                      )}
                      {!isImplantador && item.time_spent_minutes > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Tempo: {formatTime(item.time_spent_minutes)}
                          {item.observations && ` • ${item.observations}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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
              <Dialog open={episodeDialogOpen} onOpenChange={setEpisodeDialogOpen}>
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
      </div>
    </DashboardLayout>
  );
}
