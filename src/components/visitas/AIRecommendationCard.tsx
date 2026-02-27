import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot } from "lucide-react";
import { AIRecommendationFeedback } from "./AIRecommendationFeedback";
import { AIRecommendationCorrection } from "./AIRecommendationCorrection";
import { AIRecommendationVersions } from "./AIRecommendationVersions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  visitaId: string;
}

const statusLabels: Record<string, string> = {
  generated: "Gerada",
  validated: "Validada",
  corrected: "Corrigida",
  rolled_back: "Restaurada",
};

const statusColors: Record<string, string> = {
  generated: "bg-secondary text-secondary-foreground",
  validated: "bg-primary/20 text-primary",
  corrected: "bg-warning/20 text-warning-foreground",
  rolled_back: "bg-accent text-accent-foreground",
};

export function AIRecommendationCard({ visitaId }: Props) {
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["ia-recommendations", visitaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_recommendations")
        .select("*")
        .eq("visita_id", visitaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const { data: feedbackMap } = useQuery({
    queryKey: ["ia-feedback-map", visitaId],
    queryFn: async () => {
      if (!recommendations?.length) return {};
      const ids = recommendations.map((r: any) => r.id);
      const { data, error } = await supabase
        .from("ia_feedback")
        .select("recommendation_id, rating")
        .in("recommendation_id", ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((f: any) => { map[f.recommendation_id] = f.rating; });
      return map;
    },
    enabled: !!recommendations?.length,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["ia-recommendations", visitaId] });
    queryClient.invalidateQueries({ queryKey: ["ia-feedback-map", visitaId] });
  };

  if (isLoading || !recommendations?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> Recomendações da IA
          <Badge variant="secondary" className="ml-auto text-xs">{recommendations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec: any) => (
          <div key={rec.id} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[rec.status] || ""}>{statusLabels[rec.status] || rec.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  v{rec.current_version} • {format(new Date(rec.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <AIRecommendationCorrection
                  recommendationId={rec.id}
                  currentText={rec.generated_text}
                  currentVersion={rec.current_version}
                  onCorrected={refresh}
                />
                <AIRecommendationVersions
                  recommendationId={rec.id}
                  currentVersion={rec.current_version}
                  onRollback={refresh}
                />
              </div>
            </div>

            <p className="text-sm whitespace-pre-wrap text-foreground">{rec.generated_text}</p>

            <Separator />

            <AIRecommendationFeedback
              recommendationId={rec.id}
              existingRating={(feedbackMap as any)?.[rec.id] || null}
              onFeedbackSaved={refresh}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
