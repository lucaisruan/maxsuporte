import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, TrendingUp, AlertTriangle, CheckCircle, Pencil, Clock } from "lucide-react";

export default function MetricasIA() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["ai-quality-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calculate_ai_quality_score");
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const { data: recentFeedback } = useQuery({
    queryKey: ["recent-ai-feedback"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ia_feedback")
        .select("*, ia_recommendations(visita_id, generated_text)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      // Fetch user names
      const userIds = [...new Set((data || []).map((f: any) => f.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
        const map = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name]));
        return (data || []).map((f: any) => ({ ...f, user_name: map[f.user_id] || "Desconhecido" }));
      }
      return data;
    },
  });

  const ratingLabels: Record<string, string> = {
    useful: "👍 Útil",
    partially_useful: "🤔 Parcial",
    irrelevant: "⚠️ Irrelevante",
    incorrect: "❌ Incorreta",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> Métricas de Qualidade da IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe a performance das recomendações geradas pela IA
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : !metrics ? (
          <p className="text-muted-foreground">Nenhuma métrica disponível ainda.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Total Recomendações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{metrics.total_recommendations}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> % Úteis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{metrics.useful_pct}%</p>
                  <p className="text-xs text-muted-foreground">Parcialmente: {metrics.partially_useful_pct}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" /> % Incorretas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{metrics.incorrect_pct}%</p>
                  <p className="text-xs text-muted-foreground">Irrelevantes: {metrics.irrelevant_pct}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Taxa de Correção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">{metrics.correction_rate}%</p>
                  <p className="text-xs text-muted-foreground">Score médio: {metrics.avg_score}</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Avaliações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!recentFeedback?.length ? (
                  <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada.</p>
                ) : (
                  <div className="space-y-3">
                    {recentFeedback.map((f: any) => (
                      <div key={f.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{f.user_name}</span>
                            <span className="text-muted-foreground">•</span>
                            <span>{ratingLabels[f.rating] || f.rating}</span>
                          </div>
                          {f.feedback_comment && (
                            <p className="text-xs text-muted-foreground mt-1">{f.feedback_comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
