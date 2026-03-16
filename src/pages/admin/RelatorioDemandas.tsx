import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, Target, TrendingUp, Users } from "lucide-react";

interface AnalystPerformance {
  analyst_id: string;
  analyst_name: string;
  total_demands: number;
  completed_demands: number;
  total_score: number;
  max_score: number;
  completion_rate: number;
}

export default function RelatorioDemandas() {
  const [performance, setPerformance] = useState<AnalystPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ demands: 0, completed: 0, avgScore: 0 });

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    // Fetch all demands with analysts
    const { data: demands } = await supabase
      .from("demands")
      .select("id, status, total_score, max_score, demand_analysts(analyst_id)");

    const { data: profiles } = await supabase.from("profiles").select("user_id, name");

    if (demands && profiles) {
      const profileMap = new Map(profiles.map((p) => [p.user_id, p.name]));
      const analystMap = new Map<string, AnalystPerformance>();

      demands.forEach((d: any) => {
        (d.demand_analysts || []).forEach((da: any) => {
          const aid = da.analyst_id;
          if (!analystMap.has(aid)) {
            analystMap.set(aid, {
              analyst_id: aid,
              analyst_name: profileMap.get(aid) || "Desconhecido",
              total_demands: 0,
              completed_demands: 0,
              total_score: 0,
              max_score: 0,
              completion_rate: 0,
            });
          }
          const perf = analystMap.get(aid)!;
          perf.total_demands++;
          if (d.status === "concluida") perf.completed_demands++;
          perf.total_score += d.total_score || 0;
          perf.max_score += d.max_score || 0;
        });
      });

      const performanceList = Array.from(analystMap.values()).map((p) => ({
        ...p,
        completion_rate: p.total_demands > 0 ? Math.round((p.completed_demands / p.total_demands) * 100) : 0,
      }));

      // Sort by score descending
      performanceList.sort((a, b) => b.total_score - a.total_score);
      setPerformance(performanceList);

      const totalDemands = demands.length;
      const completed = demands.filter((d: any) => d.status === "concluida").length;
      const totalScore = demands.reduce((s: number, d: any) => s + (d.total_score || 0), 0);
      const totalMax = demands.reduce((s: number, d: any) => s + (d.max_score || 0), 0);
      setTotals({
        demands: totalDemands,
        completed,
        avgScore: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
      });
    }
    setLoading(false);
  };

  if (loading) {
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance Operacional</h1>
          <p className="text-muted-foreground">Relatório de demandas por analista</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Demandas</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.demands}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totals.completed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.avgScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Analistas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performance.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Analistas</CardTitle>
            <CardDescription>Ordenado por pontuação total</CardDescription>
          </CardHeader>
          <CardContent>
            {performance.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhum dado disponível.</p>
            ) : (
              <div className="space-y-4">
                {performance.map((p, index) => {
                  const scorePercent = p.max_score > 0 ? Math.round((p.total_score / p.max_score) * 100) : 0;
                  return (
                    <div key={p.analyst_id} className="flex items-center gap-4 rounded-lg border p-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        index === 0 ? "bg-amber-100 text-amber-700" :
                        index === 1 ? "bg-slate-100 text-slate-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{p.analyst_name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {p.completed_demands}/{p.total_demands} demandas
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Taxa: {p.completion_rate}%
                          </span>
                        </div>
                        <Progress value={scorePercent} className="mt-2 h-2" />
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{p.total_score}</p>
                        <p className="text-xs text-muted-foreground">de {p.max_score} pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
