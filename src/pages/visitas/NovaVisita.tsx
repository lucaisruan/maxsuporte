import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

export default function NovaVisita() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const basePath = role === "admin" ? "/admin" : "/implantador";

  const [clienteId, setClienteId] = useState("");
  const [implantacaoId, setImplantacaoId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: clientes } = useQuery({
    queryKey: ["clientes-nova-visita"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: implantacoes } = useQuery({
    queryKey: ["implantacoes-nova-visita", clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from("implementations")
        .select("id, client_id, clients(name)")
        .eq("client_id", clienteId)
        .in("status", ["em_andamento", "agendada"]);
      if (error) throw error;
      return data;
    },
    enabled: !!clienteId,
  });

  const handleSubmit = async () => {
    if (!clienteId || !titulo || !descricao || !tipo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { data: visita, error } = await supabase
        .from("visitas")
        .insert({
          cliente_id: clienteId,
          implantacao_id: implantacaoId || null,
          analista_id: user!.id,
          titulo,
          descricao_situacao: descricao,
          tipo: tipo as any,
        })
        .select()
        .single();

      if (error) throw error;

      // Save user message as first interaction
      await supabase.from("visita_interacoes").insert({
        visita_id: visita.id,
        usuario_id: user!.id,
        mensagem: descricao,
        origem: "usuario" as any,
      });

      // Trigger AI analysis
      supabase.functions.invoke("analyze-visit", {
        body: { visita_id: visita.id },
      }).catch(console.error);

      toast.success("Visita criada! A IA está analisando...");
      navigate(`${basePath}/visitas/${visita.id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar visita");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/visitas`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Visita</h1>
            <p className="text-muted-foreground">Registre uma visita ou dúvida</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Dados da Visita</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setImplantacaoId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Implantação (opcional)</Label>
              <Select value={implantacaoId} onValueChange={setImplantacaoId}>
                <SelectTrigger><SelectValue placeholder="Vincular a implantação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {implantacoes?.map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>#{i.id.slice(0, 8)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo da Visita *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visita_tecnica">Visita Técnica</SelectItem>
                  <SelectItem value="duvida">Dúvida</SelectItem>
                  <SelectItem value="diagnostico">Diagnóstico</SelectItem>
                  <SelectItem value="oportunidade">Oportunidade</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título resumido da visita" />
            </div>

            <div className="space-y-2">
              <Label>Descrição da situação *</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva a situação, dúvida ou problema..." rows={5} />
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Criar Visita e Analisar com IA"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
