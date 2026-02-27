import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Props {
  recommendationId: string;
  currentText: string;
  currentVersion: number;
  onCorrected?: () => void;
}

export function AIRecommendationCorrection({ recommendationId, currentText, currentVersion, onCorrected }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(currentText);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!reason.trim()) {
      toast.error("Motivo da edição é obrigatório");
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const newVersion = currentVersion + 1;

      // Create new version entry
      const { error: vErr } = await supabase.from("ia_recommendation_versions").insert({
        recommendation_id: recommendationId,
        version_number: newVersion,
        content: text,
        edited_by: user.id,
        edit_reason: reason,
      });
      if (vErr) throw vErr;

      // Update recommendation
      const { error: rErr } = await supabase
        .from("ia_recommendations")
        .update({ generated_text: text, current_version: newVersion, status: "corrected" })
        .eq("id", recommendationId);
      if (rErr) throw rErr;

      // Save to training dataset
      await supabase.from("ia_training_dataset").insert({
        input_context: { recommendation_id: recommendationId },
        original_output: currentText,
        corrected_output: text,
        error_type: "manual_correction",
        validated_by: user.id,
      });

      toast.success("Recomendação corrigida com sucesso");
      setOpen(false);
      onCorrected?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao corrigir");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setText(currentText); setReason(""); setOpen(true); }}>
        <Pencil className="h-3.5 w-3.5" /> Corrigir Recomendação
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>✏️ Corrigir Recomendação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Texto da Recomendação</label>
              <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Motivo da Edição *</label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Informação incorreta sobre o módulo fiscal" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar Correção"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
