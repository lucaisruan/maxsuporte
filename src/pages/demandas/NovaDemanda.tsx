import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  base_score: number;
  steps: { id: string; order_index: number; title: string; instructions: string | null; response_type: string; score: number }[];
}

interface Analyst {
  user_id: string;
  name: string;
}

export default function NovaDemanda() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedAnalysts, setSelectedAnalysts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchAnalysts()]).then(() => setFetching(false));
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("demand_templates")
      .select("id, name, base_score, demand_template_steps(id, order_index, title, instructions, response_type, score)")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setTemplates(
        data.map((t: any) => ({
          ...t,
          steps: t.demand_template_steps || [],
        }))
      );
    }
  };

  const fetchAnalysts = async () => {
    const { data: profiles } = await supabase.from("profiles").select("user_id, name").eq("is_active", true);
    if (profiles) setAnalysts(profiles);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template && !title) {
      setTitle(template.name);
    }
  };

  const toggleAnalyst = (userId: string) => {
    setSelectedAnalysts((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTemplate || selectedAnalysts.length === 0) {
      toast({ variant: "destructive", title: "Preencha todos os campos obrigatórios" });
      return;
    }
    setLoading(true);

    try {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) throw new Error("Modelo não encontrado");

      const maxScore = template.steps.reduce((sum, s) => sum + s.score, 0);

      const { data: demand, error } = await supabase
        .from("demands")
        .insert({
          template_id: selectedTemplate,
          title,
          description: description || null,
          deadline: deadline || null,
          max_score: maxScore,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Insert analysts
      await supabase.from("demand_analysts").insert(
        selectedAnalysts.map((aid) => ({ demand_id: demand.id, analyst_id: aid }))
      );

      // Insert steps from template
      await supabase.from("demand_steps").insert(
        template.steps.map((s) => ({
          demand_id: demand.id,
          template_step_id: s.id,
          order_index: s.order_index,
          title: s.title,
          instructions: s.instructions,
          response_type: s.response_type as any,
          score: s.score,
        }))
      );

      toast({ title: "Demanda criada com sucesso!" });
      navigate("/admin/demandas");
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
            <h1 className="text-2xl font-bold text-foreground">Nova Demanda</h1>
            <p className="text-muted-foreground">Crie uma demanda a partir de um modelo</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Demanda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Modelo (POP) *</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.steps.length} passos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vincular Analistas *</CardTitle>
            </CardHeader>
            <CardContent>
              {analysts.length === 0 ? (
                <p className="text-muted-foreground">Nenhum analista disponível.</p>
              ) : (
                <div className="space-y-2">
                  {analysts.map((a) => (
                    <div key={a.user_id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Checkbox
                        checked={selectedAnalysts.includes(a.user_id)}
                        onCheckedChange={() => toggleAnalyst(a.user_id)}
                      />
                      <span className="text-sm font-medium">{a.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle>Passos do Procedimento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {templates
                    .find((t) => t.id === selectedTemplate)
                    ?.steps.sort((a, b) => a.order_index - b.order_index)
                    .map((s, i) => (
                      <div key={s.id} className="flex items-center gap-3 rounded border p-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.title}</p>
                          {s.instructions && (
                            <p className="text-xs text-muted-foreground">{s.instructions}</p>
                          )}
                        </div>
                        <Badge variant="outline">{s.score} pts</Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Demanda
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
