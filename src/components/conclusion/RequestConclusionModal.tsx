import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RequestConclusionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  implementationId: string;
  onSuccess: () => void;
}

export function RequestConclusionModal({
  open,
  onOpenChange,
  implementationId,
  onSuccess,
}: RequestConclusionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [observation, setObservation] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("conclusion_requests" as any)
        .insert({
          implementation_id: implementationId,
          requester_id: user.id,
          requester_observation: observation || null,
        } as any);

      if (error) {
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "Solicitação já existente",
            description: "Já existe uma solicitação de conclusão pendente para esta implantação.",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de conclusão foi enviada para análise do administrador.",
      });
      setObservation("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao solicitar conclusão",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Conclusão</DialogTitle>
          <DialogDescription>
            Envie uma solicitação para que um administrador analise e conclua esta implantação.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Descreva o motivo ou detalhes relevantes..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
