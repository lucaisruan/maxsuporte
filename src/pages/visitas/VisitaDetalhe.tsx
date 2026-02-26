import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Send, Bot, User, CheckCircle, Lightbulb } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, string> = { aberta: "Aberta", analisada: "Analisada", resolvida: "Resolvida" };
const statusColors: Record<string, string> = { aberta: "bg-warning text-warning-foreground", analisada: "bg-primary/20 text-primary", resolvida: "bg-success text-success-foreground" };
const tipoLabels: Record<string, string> = { visita_tecnica: "Visita Técnica", duvida: "Dúvida", diagnostico: "Diagnóstico", oportunidade: "Oportunidade" };

export default function VisitaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const basePath = role === "admin" ? "/admin" : "/implantador";
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data: visita, isLoading } = useQuery({
    queryKey: ["visita", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitas")
        .select("*, clients(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      // Fetch analyst name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", data.analista_id)
        .single();
      return { ...data, analyst_name: profile?.name || "N/A" };
    },
    enabled: !!id,
  });

  const { data: interacoes, isLoading: loadingInteracoes } = useQuery({
    queryKey: ["visita-interacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visita_interacoes")
        .select("*")
        .eq("visita_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      // Fetch profile names for user interactions
      if (data && data.length > 0) {
        const userIds = [...new Set(data.filter((i: any) => i.usuario_id).map((i: any) => i.usuario_id))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
          const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name]));
          return data.map((i: any) => ({ ...i, user_name: i.usuario_id ? profileMap[i.usuario_id] : null }));
        }
      }
      return data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: recomendacoes } = useQuery({
    queryKey: ["visita-recomendacoes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recomendacoes_visita")
        .select("*")
        .eq("visita_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interacoes]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      // Insert user message
      await supabase.from("visita_interacoes").insert({
        visita_id: id!,
        usuario_id: user!.id,
        mensagem: message,
        origem: "usuario" as any,
      });

      const msg = message;
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["visita-interacoes", id] });

      // Trigger AI
      const { error } = await supabase.functions.invoke("analyze-visit", {
        body: { visita_id: id!, user_message: msg },
      });
      if (error) console.error("AI error:", error);

      queryClient.invalidateQueries({ queryKey: ["visita-interacoes", id] });
      queryClient.invalidateQueries({ queryKey: ["visita-recomendacoes", id] });
      queryClient.invalidateQueries({ queryKey: ["visita", id] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const markResolved = async () => {
    try {
      await supabase.from("visitas").update({ status: "resolvida" as any }).eq("id", id!);
      toast.success("Visita marcada como resolvida");
      queryClient.invalidateQueries({ queryKey: ["visita", id] });
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!visita) {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Visita não encontrada.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`${basePath}/visitas`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{visita.titulo}</h1>
              <p className="text-sm text-muted-foreground">
                {(visita as any).clients?.name} • {tipoLabels[visita.tipo] || visita.tipo} • Por: {(visita as any).analyst_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[visita.status]}>{statusLabels[visita.status]}</Badge>
            {role === "admin" && visita.status !== "resolvida" && (
              <Button variant="outline" size="sm" onClick={markResolved}>
                <CheckCircle className="mr-2 h-4 w-4" /> Marcar Resolvida
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Descrição da Situação</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{visita.descricao_situacao}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {format(new Date(visita.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        {/* Recommendations */}
        {recomendacoes && recomendacoes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="h-4 w-4 text-warning" /> Recomendações</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recomendacoes.map((r: any) => (
                <div key={r.id} className="rounded-lg bg-accent p-3 text-sm">
                  <Badge variant="outline" className="mb-1 text-xs">{r.tipo === "sugestao_servico" ? "Serviço Sugerido" : r.tipo === "resposta_ia" ? "Resposta IA" : "Decisão"}</Badge>
                  <p className="text-accent-foreground">{r.conteudo}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chat */}
        <Card className="flex flex-col">
          <CardHeader><CardTitle className="text-base">Conversa Colaborativa</CardTitle></CardHeader>
          <CardContent className="flex-1 space-y-4 max-h-[500px] overflow-y-auto">
            {loadingInteracoes ? (
              <p className="text-muted-foreground text-sm">Carregando...</p>
            ) : interacoes?.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aguardando análise da IA...</p>
            ) : (
              interacoes?.map((i: any) => (
                <div key={i.id} className={`flex gap-3 ${i.origem === "ia" ? "" : "flex-row-reverse"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${i.origem === "ia" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {i.origem === "ia" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[75%] rounded-lg p-3 text-sm ${i.origem === "ia" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                    {i.origem !== "ia" && i.user_name && (
                      <p className="text-xs font-medium mb-1 opacity-80">{i.user_name}</p>
                    )}
                    <p className="whitespace-pre-wrap">{i.mensagem}</p>
                    <p className={`mt-1 text-xs ${i.origem === "ia" ? "text-muted-foreground" : "opacity-70"}`}>
                      {format(new Date(i.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </CardContent>
          {visita.status !== "resolvida" && (
            <>
              <Separator />
              <div className="p-4 flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={2}
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button onClick={sendMessage} disabled={sending || !message.trim()} size="icon" className="self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
