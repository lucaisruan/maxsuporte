import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  recommendationId: string;
  currentVersion: number;
  onRollback?: () => void;
}

export function AIRecommendationVersions({ recommendationId, currentVersion, onRollback }: Props) {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const { data: versions, isLoading } = useQuery({
    queryKey: ["rec-versions", recommendationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_recommendation_versions")
        .select("*")
        .eq("recommendation_id", recommendationId)
        .order("version_number", { ascending: false });
      if (error) throw error;

      // Fetch editor names
      const editorIds = [...new Set(data.map((v: any) => v.edited_by))];
      if (editorIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", editorIds);
        const map = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name]));
        return data.map((v: any) => ({ ...v, editor_name: map[v.edited_by] || "Desconhecido" }));
      }
      return data;
    },
    enabled: open,
  });

  const handleRollback = async (version: any) => {
    if (!user) return;
    setRestoring(version.id);
    try {
      const newVersion = currentVersion + 1;

      await supabase.from("ia_recommendation_versions").insert({
        recommendation_id: recommendationId,
        version_number: newVersion,
        content: version.content,
        edited_by: user.id,
        edit_reason: `Rollback para versão ${version.version_number}`,
      });

      await supabase
        .from("ia_recommendations")
        .update({ generated_text: version.content, current_version: newVersion, status: "rolled_back" })
        .eq("id", recommendationId);

      toast.success(`Restaurado para versão ${version.version_number}`);
      setOpen(false);
      onRollback?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao restaurar");
    } finally {
      setRestoring(null);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOpen(true)}>
        <History className="h-3.5 w-3.5" /> Histórico ({currentVersion})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>⏪ Histórico de Versões</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : versions?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma versão encontrada.</p>
          ) : (
            <div className="space-y-4">
              {versions?.map((v: any) => (
                <div key={v.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">v{v.version_number}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {v.editor_name} • {format(new Date(v.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {role === "admin" && v.version_number !== currentVersion && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleRollback(v)}
                        disabled={restoring === v.id}
                      >
                        <RotateCcw className="h-3 w-3" />
                        {restoring === v.id ? "Restaurando..." : "Restaurar"}
                      </Button>
                    )}
                  </div>
                  {v.edit_reason && (
                    <p className="text-xs text-muted-foreground italic">Motivo: {v.edit_reason}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap text-foreground bg-muted/50 rounded p-2 max-h-40 overflow-y-auto">
                    {v.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
