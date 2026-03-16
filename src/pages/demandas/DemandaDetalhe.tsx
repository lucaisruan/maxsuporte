import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Upload, Copy, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DemandStep {
  id: string;
  order_index: number;
  title: string;
  instructions: string | null;
  response_type: string;
  score: number;
  is_completed: boolean;
  result: string | null;
  observation: string | null;
  corrective_action: string | null;
  earned_score: number;
  evidences: { id: string; file_path: string; file_name: string }[];
  template_image_path: string | null;
}

interface DemandDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  deadline: string | null;
  total_score: number;
  max_score: number;
  created_at: string;
  completed_at: string | null;
  template_name: string;
  analysts: { name: string }[];
  steps: DemandStep[];
}

export default function DemandaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [demand, setDemand] = useState<DemandDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);

  useEffect(() => {
    fetchDemand();
  }, [id]);

  const fetchDemand = async () => {
    const { data } = await supabase
      .from("demands")
      .select(`
        *,
        demand_templates(name),
        demand_analysts(profiles:analyst_id(name)),
        demand_steps(*, demand_template_steps(image_path), demand_step_evidences(*))
      `)
      .eq("id", id!)
      .single();

    if (data) {
      setDemand({
        id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        deadline: data.deadline,
        total_score: data.total_score,
        max_score: data.max_score,
        created_at: data.created_at,
        completed_at: data.completed_at,
        template_name: (data as any).demand_templates?.name || "",
        analysts: (data as any).demand_analysts?.map((a: any) => a.profiles).filter(Boolean) || [],
        steps: ((data as any).demand_steps || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((s: any) => ({
            ...s,
            evidences: s.demand_step_evidences || [],
            template_image_path: s.demand_template_steps?.image_path || null,
          })),
      });
    }
    setLoading(false);
  };

  const handleStepResult = async (stepId: string, result: string) => {
    if (!user) return;
    setUpdating(stepId);

    const step = demand?.steps.find((s) => s.id === stepId);
    if (!step) return;

    const isFail = result === "falha" || result === "nao";
    const earnedScore = isFail ? 0 : step.score;

    try {
      const { error } = await supabase
        .from("demand_steps")
        .update({
          result,
          is_completed: true,
          earned_score: earnedScore,
          completed_by: user.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", stepId);

      if (error) throw error;

      // Update demand status and score
      const updatedSteps = demand!.steps.map((s) =>
        s.id === stepId ? { ...s, result, is_completed: true, earned_score: earnedScore } : s
      );
      const allCompleted = updatedSteps.every((s) => s.is_completed);
      const totalScore = updatedSteps.reduce((sum, s) => sum + s.earned_score, 0);

      const updateData: any = { total_score: totalScore };
      if (demand!.status === "pendente") {
        updateData.status = "em_andamento";
      }
      if (allCompleted) {
        updateData.status = "concluida";
        updateData.completed_at = new Date().toISOString();
      }

      await supabase.from("demands").update(updateData).eq("id", demand!.id);
      await fetchDemand();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setUpdating(null);
    }
  };

  const handleObservation = async (stepId: string, observation: string) => {
    await supabase.from("demand_steps").update({ observation }).eq("id", stepId);
  };

  const handleCorrectiveAction = async (stepId: string, action: string) => {
    await supabase.from("demand_steps").update({ corrective_action: action }).eq("id", stepId);
  };

  const handleUploadEvidence = async (stepId: string, file: File) => {
    if (!user) return;
    setUploadingStep(stepId);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${stepId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("demand-evidences")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      await supabase.from("demand_step_evidences").insert({
        demand_step_id: stepId,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user.id,
      });

      await fetchDemand();
      toast({ title: "Evidência anexada!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro no upload", description: error.message });
    } finally {
      setUploadingStep(null);
    }
  };

  const generateOSReport = () => {
    if (!demand) return;
    const lines: string[] = [];
    lines.push("========================================");
    lines.push("ORDEM DE SERVICO - DEMANDA OPERACIONAL");
    lines.push("========================================");
    lines.push("");
    lines.push(`Procedimento: ${demand.title}`);
    lines.push(`Modelo: ${demand.template_name}`);
    lines.push(`Status: ${demand.status}`);
    lines.push(`Data de Criacao: ${new Date(demand.created_at).toLocaleDateString("pt-BR")}`);
    if (demand.completed_at) {
      lines.push(`Data de Conclusao: ${new Date(demand.completed_at).toLocaleDateString("pt-BR")}`);
    }
    lines.push(`Analistas: ${demand.analysts.map((a) => a.name).join(", ")}`);
    lines.push(`Pontuacao: ${demand.total_score}/${demand.max_score}`);
    lines.push("");
    lines.push("----------------------------------------");
    lines.push("PASSOS EXECUTADOS");
    lines.push("----------------------------------------");
    demand.steps.forEach((s) => {
      lines.push("");
      lines.push(`${s.order_index}. ${s.title}`);
      lines.push(`   Resultado: ${s.result || "Nao executado"}`);
      lines.push(`   Pontuacao: ${s.earned_score}/${s.score}`);
      if (s.observation) lines.push(`   Observacao: ${s.observation}`);
      if (s.corrective_action) lines.push(`   Acao Corretiva: ${s.corrective_action}`);
    });
    lines.push("");
    lines.push("========================================");
    lines.push(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}, ${new Date().toLocaleTimeString("pt-BR")}`);

    const text = lines.join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Relatório copiado para a área de transferência!" });
  };

  if (loading || !demand) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const completedSteps = demand.steps.filter((s) => s.is_completed).length;
  const progressPercent = demand.steps.length > 0 ? (completedSteps / demand.steps.length) * 100 : 0;

  const statusLabel: Record<string, string> = {
    pendente: "Pendente",
    em_andamento: "Em Andamento",
    concluida: "Concluída",
    atrasada: "Atrasada",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{demand.title}</h1>
              <p className="text-muted-foreground">Modelo: {demand.template_name}</p>
            </div>
          </div>
          {demand.status === "concluida" && (
            <Button variant="outline" onClick={generateOSReport}>
              <Copy className="mr-2 h-4 w-4" />
              Copiar Relatório O.S.
            </Button>
          )}
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge className="mt-1">{statusLabel[demand.status] || demand.status}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Progresso</p>
              <p className="text-lg font-bold">{completedSteps}/{demand.steps.length}</p>
              <Progress value={progressPercent} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Pontuação</p>
              <p className="text-lg font-bold">{demand.total_score}/{demand.max_score}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Prazo</p>
              <p className="text-lg font-bold">
                {demand.deadline
                  ? new Date(demand.deadline).toLocaleDateString("pt-BR")
                  : "Sem prazo"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analysts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analistas Vinculados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {demand.analysts.map((a, i) => (
                <Badge key={i} variant="secondary">{a.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Passos do Procedimento</CardTitle>
            <CardDescription>{completedSteps} de {demand.steps.length} passos concluídos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demand.steps.map((step) => {
              const isFail = step.result === "falha" || step.result === "nao";
              return (
                <div
                  key={step.id}
                  className={`rounded-lg border p-4 space-y-3 ${
                    step.is_completed
                      ? isFail
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {step.order_index}
                      </span>
                      <div>
                        <h4 className="font-medium">{step.title}</h4>
                        {step.instructions && (
                          <p className="text-sm text-muted-foreground">{step.instructions}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{step.score} pts</Badge>
                      {step.is_completed && (
                        isFail ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!step.is_completed && demand.status !== "concluida" && (
                    <div className="flex gap-2 pt-2">
                      {(step.response_type === "ok_falha") && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStepResult(step.id, "ok")}
                            disabled={updating === step.id}
                          >
                            {updating === step.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStepResult(step.id, "falha")}
                            disabled={updating === step.id}
                          >
                            FALHA
                          </Button>
                        </>
                      )}
                      {(step.response_type === "sim_nao") && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStepResult(step.id, "sim")}
                            disabled={updating === step.id}
                          >
                            {updating === step.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "SIM"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStepResult(step.id, "nao")}
                            disabled={updating === step.id}
                          >
                            NÃO
                          </Button>
                        </>
                      )}
                      {(step.response_type === "texto_livre") && (
                        <div className="flex-1 space-y-2">
                          <Textarea
                            placeholder="Digite sua resposta..."
                            id={`text-${step.id}`}
                          />
                          <Button
                            size="sm"
                            disabled={updating === step.id}
                            onClick={() => {
                              const el = document.getElementById(`text-${step.id}`) as HTMLTextAreaElement;
                              if (el?.value) handleStepResult(step.id, el.value);
                            }}
                          >
                            {updating === step.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Corrective action for failures */}
                  {step.is_completed && isFail && (
                    <div className="space-y-2 pt-2">
                      <Label className="text-destructive">Ação Corretiva (obrigatória)</Label>
                      <Textarea
                        defaultValue={step.corrective_action || ""}
                        placeholder="Descreva a ação corretiva necessária..."
                        onBlur={(e) => handleCorrectiveAction(step.id, e.target.value)}
                      />
                    </div>
                  )}

                  {/* Observation */}
                  {step.is_completed && (
                    <div className="space-y-2 pt-1">
                      <Label>Observação</Label>
                      <Textarea
                        defaultValue={step.observation || ""}
                        placeholder="Observações adicionais..."
                        onBlur={(e) => handleObservation(step.id, e.target.value)}
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Evidence upload */}
                  {step.is_completed && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center gap-2">
                        <Label>Evidências</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingStep === step.id}
                          onClick={() => {
                            fileInputRef.current?.setAttribute("data-step", step.id);
                            fileInputRef.current?.click();
                          }}
                        >
                          {uploadingStep === step.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Upload className="mr-1 h-3 w-3" />
                          )}
                          Anexar Imagem
                        </Button>
                      </div>
                      {step.evidences.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {step.evidences.map((ev) => (
                            <div key={ev.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                              <ImageIcon className="h-3 w-3" />
                              {ev.file_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Result display */}
                  {step.is_completed && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Resultado:</span>
                      <Badge variant={isFail ? "destructive" : "default"}>
                        {step.result?.toUpperCase()}
                      </Badge>
                      <span className="text-muted-foreground">
                        — {step.earned_score}/{step.score} pts
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const stepId = fileInputRef.current?.getAttribute("data-step");
            if (file && stepId) handleUploadEvidence(stepId, file);
            e.target.value = "";
          }}
        />
      </div>
    </DashboardLayout>
  );
}
