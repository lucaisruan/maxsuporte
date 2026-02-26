import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Brain, Trash2 } from "lucide-react";

const categoriaLabels: Record<string, string> = {
  produto: "Produto",
  treinamento: "Treinamento",
  comportamento: "Comportamento",
  processo: "Processo",
  comercial: "Comercial",
};

export default function BaseConhecimentoIA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    titulo: "",
    contexto: "",
    diretriz_decisao: "",
    sugestao_servico: "",
    perfil_cliente: "",
    categoria: "produto",
    ativo: true,
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["base-conhecimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("base_conhecimento_ia")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setForm({ titulo: "", contexto: "", diretriz_decisao: "", sugestao_servico: "", perfil_cliente: "", categoria: "produto", ativo: true });
    setEditingId(null);
  };

  const openEdit = (entry: any) => {
    setForm({
      titulo: entry.titulo,
      contexto: entry.contexto,
      diretriz_decisao: entry.diretriz_decisao || "",
      sugestao_servico: entry.sugestao_servico || "",
      perfil_cliente: entry.perfil_cliente || "",
      categoria: entry.categoria,
      ativo: entry.ativo,
    });
    setEditingId(entry.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo || !form.contexto || !form.categoria) {
      toast.error("Preencha título, contexto e categoria");
      return;
    }
    try {
      if (editingId) {
        const { error } = await supabase
          .from("base_conhecimento_ia")
          .update({ ...form, categoria: form.categoria as any })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Diretriz atualizada");
      } else {
        const { error } = await supabase
          .from("base_conhecimento_ia")
          .insert({ ...form, categoria: form.categoria as any, created_by: user!.id });
        if (error) throw error;
        toast.success("Diretriz criada");
      }
      queryClient.invalidateQueries({ queryKey: ["base-conhecimento"] });
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta diretriz?")) return;
    try {
      await supabase.from("base_conhecimento_ia").delete().eq("id", id);
      toast.success("Diretriz excluída");
      queryClient.invalidateQueries({ queryKey: ["base-conhecimento"] });
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const toggleActive = async (id: string, currentValue: boolean) => {
    await supabase.from("base_conhecimento_ia").update({ ativo: !currentValue }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["base-conhecimento"] });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" /> Base de Conhecimento IA
            </h1>
            <p className="text-muted-foreground">Diretrizes, decisões e serviços para educar a IA</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Diretriz</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Diretriz</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoriaLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Contexto *</Label>
                  <Textarea value={form.contexto} onChange={(e) => setForm({ ...form, contexto: e.target.value })} rows={3} placeholder="Descreva o contexto..." />
                </div>
                <div className="space-y-2">
                  <Label>Diretriz de Decisão</Label>
                  <Textarea value={form.diretriz_decisao} onChange={(e) => setForm({ ...form, diretriz_decisao: e.target.value })} rows={2} placeholder="Como a IA deve decidir neste cenário..." />
                </div>
                <div className="space-y-2">
                  <Label>Sugestão de Serviço</Label>
                  <Input value={form.sugestao_servico} onChange={(e) => setForm({ ...form, sugestao_servico: e.target.value })} placeholder="Ex: MaxBip, AutoMax" />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Cliente</Label>
                  <Input value={form.perfil_cliente} onChange={(e) => setForm({ ...form, perfil_cliente: e.target.value })} placeholder="Ex: varejo, indústria" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
                  <Label>Ativo</Label>
                </div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : entries?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma diretriz cadastrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {entries?.map((entry: any) => (
              <Card key={entry.id} className={!entry.ativo ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{entry.titulo}</CardTitle>
                      <Badge variant="outline">{categoriaLabels[entry.categoria]}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={entry.ativo} onCheckedChange={() => toggleActive(entry.id, entry.ativo)} />
                      <Button variant="ghost" size="icon" onClick={() => openEdit(entry)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>{entry.contexto}</p>
                  {entry.diretriz_decisao && <p className="text-foreground"><strong>Diretriz:</strong> {entry.diretriz_decisao}</p>}
                  {entry.sugestao_servico && <p><strong>Serviço:</strong> {entry.sugestao_servico}</p>}
                  {entry.perfil_cliente && <p><strong>Perfil:</strong> {entry.perfil_cliente}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
