import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ThumbsUp, HelpCircle, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Rating = "useful" | "partially_useful" | "irrelevant" | "incorrect";

interface Props {
  recommendationId: string;
  existingRating?: Rating | null;
  onFeedbackSaved?: () => void;
}

const ratingOptions: { value: Rating; label: string; icon: React.ElementType; color: string }[] = [
  { value: "useful", label: "Útil", icon: ThumbsUp, color: "text-green-600 dark:text-green-400" },
  { value: "partially_useful", label: "Parcial", icon: HelpCircle, color: "text-yellow-600 dark:text-yellow-400" },
  { value: "irrelevant", label: "Irrelevante", icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400" },
  { value: "incorrect", label: "Incorreta", icon: XCircle, color: "text-destructive" },
];

export function AIRecommendationFeedback({ recommendationId, existingRating, onFeedbackSaved }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Rating | null>(existingRating || null);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [correction, setCorrection] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSelect = (rating: Rating) => {
    setSelected(rating);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selected || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("ia_feedback").insert({
        recommendation_id: recommendationId,
        rating: selected,
        feedback_comment: comment || null,
        suggested_correction: correction || null,
        user_id: user.id,
      });
      if (error) throw error;

      // If correction was suggested, save to training dataset
      if (correction.trim()) {
        await supabase.from("ia_training_dataset").insert({
          input_context: { recommendation_id: recommendationId },
          original_output: "",
          corrected_output: correction,
          error_type: selected,
          validated_by: user.id,
        });
      }

      toast.success("Avaliação salva com sucesso");
      setShowForm(false);
      onFeedbackSaved?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar avaliação");
    } finally {
      setSaving(false);
    }
  };

  const isBlocked = selected === "incorrect" || selected === "irrelevant";

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">🔎 Avaliação da Recomendação</p>
      <div className="flex gap-1.5 flex-wrap">
        {ratingOptions.map((opt) => {
          const Icon = opt.icon;
          return (
            <Button
              key={opt.value}
              variant={selected === opt.value ? "default" : "outline"}
              size="sm"
              className={cn("gap-1.5 text-xs", selected === opt.value && "ring-2 ring-ring")}
              onClick={() => handleSelect(opt.value)}
            >
              <Icon className={cn("h-3.5 w-3.5", selected !== opt.value && opt.color)} />
              {opt.label}
            </Button>
          );
        })}
      </div>

      {isBlocked && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          ⚠️ Esta recomendação foi marcada como inadequada. Revise antes de executar qualquer ação.
        </div>
      )}

      {showForm && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Textarea
            placeholder="Comentário (opcional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <Textarea
            placeholder="Sugestão de correção (opcional)"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Avaliação"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
