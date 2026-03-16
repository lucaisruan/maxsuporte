import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, GripVertical, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Step {
  id?: string;
  order_index: number;
  title: string;
  instructions: string;
  response_type: "ok_falha" | "sim_nao" | "texto_livre";
  score: number;
}

export default function DemandTemplateForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseScore, setBaseScore] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  useEffect(() => {
    if (isEditing) fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    const { data: template } = await supabase
      .from("demand_templates")
      .select("*")
      .eq("id", id!)
      .single();

    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setBaseScore(template.base_score);
    }

    const { data: stepsData } = await supabase
      .from("demand_template_steps")
      .select("*")
      .eq("template_id", id!)
      .order("order_index");

    if (stepsData) {
      setSteps(stepsData.map((s: any) => ({
        id: s.id,
        order_index: s.order_index,
        title: s.title,
        instructions: s.instructions || "",
        response_type: s.response_type,
        score: s.score,
      })));
    }
    setFetching(false);
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        order_index: prev.length + 1,
        title: "",
        instructions: "",
        response_type: "ok_falha",
        score: 0,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeStep = (index: number) => {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order_index: i + 1 }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      let templateId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("demand_templates")
          .update({ name, description, base_score: baseScore })
          .eq("id", id!);
        if (error) throw error;

        // Delete old steps and re-insert
        await supabase.from("demand_template_steps").delete().eq("template_id", id!);
      } else {
        const { data, error } = await supabase
          .from("demand_templates")
          .insert({ name, description, base_score: baseScore, created_by: user.id })
          .select("id")
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      if (steps.length > 0) {
        const { error } = await supabase.from("demand_template_steps").insert(
          steps.map((s, i) => ({
            template_id: templateId!,
            order_index: i + 1,
            title: s.title,
            instructions: s.instructions || null,
            response_type: s.response_type,
            score: s.score,
          }))
        );
        if (error) throw error;
      }

      toast({ title: isEditing ? "Modelo atualizado!" : "Modelo criado!" });
      navigate("/admin/demandas/modelos");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? "Editar Modelo" : "Novo Modelo de Demanda"}
            </h1>
            <p className="text-muted-foreground">Defina o procedimento e seus passos</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Modelo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Pontuação Base</Label>
                <Input
                  type="number"
                  value={baseScore}
                  onChange={(e) => setBaseScore(Number(e.target.value))}
                  min={0}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Passos do Procedimento</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar Passo
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhum passo adicionado. Clique em "Adicionar Passo".
                </p>
              )}
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Passo {index + 1}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeStep(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Título</Label>
                      <Input
                        value={step.title}
                        onChange={(e) => updateStep(index, "title", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tipo de Resposta</Label>
                        <Select
                          value={step.response_type}
                          onValueChange={(v) => updateStep(index, "response_type", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ok_falha">OK / FALHA</SelectItem>
                            <SelectItem value="sim_nao">SIM / NÃO</SelectItem>
                            <SelectItem value="texto_livre">Texto Livre</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pontuação</Label>
                        <Input
                          type="number"
                          value={step.score}
                          onChange={(e) => updateStep(index, "score", Number(e.target.value))}
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Instruções</Label>
                    <Textarea
                      value={step.instructions}
                      onChange={(e) => updateStep(index, "instructions", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Modelo"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
