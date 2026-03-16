import { useEffect, useState, useRef } from "react";
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
import { Loader2, Plus, Trash2, GripVertical, ArrowLeft, Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Step {
  id?: string;
  order_index: number;
  title: string;
  instructions: string;
  response_type: "ok_falha" | "sim_nao" | "texto_livre";
  score: number;
  image_path: string | null;
  image_file?: File | null;      // local file pending upload
  image_preview?: string | null;  // local preview URL
}

export default function DemandTemplateForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

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
        image_path: s.image_path || null,
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
        image_path: null,
      },
    ]);
  };

  const updateStep = (index: number, field: keyof Step, value: any) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const removeStep = (index: number) => {
    // Revoke preview URL if exists
    const step = steps[index];
    if (step.image_preview) URL.revokeObjectURL(step.image_preview);
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order_index: i + 1 }))
    );
  };

  const handleImageSelect = (index: number) => {
    setActiveStepIndex(index);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeStepIndex === null) return;

    // Validate file type
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({ variant: "destructive", title: "Formato inválido", description: "Apenas PNG e JPEG são permitidos." });
      e.target.value = "";
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: "destructive", title: "Arquivo muito grande", description: "Máximo de 5MB." });
      e.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setSteps((prev) =>
      prev.map((s, i) =>
        i === activeStepIndex
          ? { ...s, image_file: file, image_preview: preview, image_path: null }
          : s
      )
    );
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const step = steps[index];
    if (step.image_preview) URL.revokeObjectURL(step.image_preview);
    setSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, image_file: null, image_preview: null, image_path: null } : s
      )
    );
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from("demand-evidences").getPublicUrl(path);
    return data.publicUrl;
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

      // Upload images for steps that have new files
      const stepsToInsert = await Promise.all(
        steps.map(async (s, i) => {
          let imagePath = s.image_path;

          if (s.image_file) {
            const ext = s.image_file.name.split(".").pop();
            const path = `templates/${templateId}/${i + 1}_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("demand-evidences")
              .upload(path, s.image_file);
            if (uploadErr) throw uploadErr;
            imagePath = path;
          }

          return {
            template_id: templateId!,
            order_index: i + 1,
            title: s.title,
            instructions: s.instructions || null,
            response_type: s.response_type,
            score: s.score,
            image_path: imagePath,
          };
        })
      );

      if (stepsToInsert.length > 0) {
        const { error } = await supabase.from("demand_template_steps").insert(stepsToInsert);
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
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        Passo {index + 1}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(index)}>
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

                  {/* Image upload */}
                  <div className="space-y-2">
                    <Label>Imagem de Referência</Label>
                    {step.image_preview || step.image_path ? (
                      <div className="relative inline-block">
                        <img
                          src={step.image_preview || getPublicUrl(step.image_path!)}
                          alt={`Imagem passo ${index + 1}`}
                          className="h-32 w-auto rounded-lg border object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageSelect(index)}
                      >
                        <Upload className="mr-1 h-4 w-4" />
                        Anexar Imagem (PNG/JPEG)
                      </Button>
                    )}
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

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </DashboardLayout>
  );
}
