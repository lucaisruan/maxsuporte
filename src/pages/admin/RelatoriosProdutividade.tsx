import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingUp, Clock, Users, Filter, Trophy, BarChart3 } from "lucide-react";

interface ImplementerStats {
  userId: string;
  name: string;
  email: string;
  totalImplementations: number;
  inProgress: number;
  completed: number;
  totalHours: number;
  avgHoursPerImplementation: number;
  hoursToday: number;
  hoursThisWeek: number;
  hoursThisMonth: number;
}

export default function RelatoriosProdutividade() {
  const [stats, setStats] = useState<ImplementerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [implementerFilter, setImplementerFilter] = useState<string>("all");
  const [implementers, setImplementers] = useState<{ user_id: string; name: string }[]>([]);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, typeFilter, implementerFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all implementers
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "implantador");

      if (!roleData || roleData.length === 0) {
        setStats([]);
        setLoading(false);
        return;
      }

      const userIds = roleData.map((r) => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, email, is_active")
        .in("user_id", userIds);

      if (profilesData) {
        setImplementers(profilesData.filter(p => p.is_active !== false));
      }

      // Build query for implementations
      let implQuery = supabase
        .from("implementations")
        .select("id, status, implementer_id, implementation_type, total_time_minutes");

      if (implementerFilter && implementerFilter !== "all") {
        implQuery = implQuery.eq("implementer_id", implementerFilter);
      }

      if (typeFilter && typeFilter !== "all") {
        implQuery = implQuery.eq("implementation_type", typeFilter as "web" | "manager" | "basic");
      }

      const { data: implementations } = await implQuery;

      // Fetch episodes with date filters
      let episodesQuery = supabase
        .from("episodes")
        .select("implementation_id, time_spent_minutes, episode_date, created_by");

      if (dateFrom) {
        episodesQuery = episodesQuery.gte("episode_date", dateFrom);
      }
      if (dateTo) {
        episodesQuery = episodesQuery.lte("episode_date", dateTo);
      }

      const { data: episodes } = await episodesQuery;

      // Calculate stats per implementer
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const implementerStats: ImplementerStats[] = (profilesData || [])
        .filter(p => p.is_active !== false)
        .map((profile) => {
          const userImpls = (implementations || []).filter(
            (i) => i.implementer_id === profile.user_id
          );
          const userEpisodes = (episodes || []).filter(
            (e) => e.created_by === profile.user_id
          );

          const totalHoursMinutes = userEpisodes.reduce((acc, e) => acc + e.time_spent_minutes, 0);
          const hoursToday = userEpisodes
            .filter((e) => e.episode_date === today)
            .reduce((acc, e) => acc + e.time_spent_minutes, 0);
          const hoursThisWeek = userEpisodes
            .filter((e) => e.episode_date >= weekAgo)
            .reduce((acc, e) => acc + e.time_spent_minutes, 0);
          const hoursThisMonth = userEpisodes
            .filter((e) => e.episode_date >= monthAgo)
            .reduce((acc, e) => acc + e.time_spent_minutes, 0);

          return {
            userId: profile.user_id,
            name: profile.name,
            email: profile.email,
            totalImplementations: userImpls.length,
            inProgress: userImpls.filter((i) => i.status === "em_andamento").length,
            completed: userImpls.filter((i) => i.status === "concluida").length,
            totalHours: totalHoursMinutes,
            avgHoursPerImplementation:
              userImpls.length > 0 ? totalHoursMinutes / userImpls.length : 0,
            hoursToday,
            hoursThisWeek,
            hoursThisMonth,
          };
        });

      // Sort by total hours (ranking)
      implementerStats.sort((a, b) => b.totalHours - a.totalHours);

      setStats(implementerStats);
    } catch (error) {
      console.error("Error fetching productivity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const getMaxHours = () => {
    if (stats.length === 0) return 1;
    return Math.max(...stats.map((s) => s.totalHours)) || 1;
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setTypeFilter("all");
    setImplementerFilter("all");
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
          <h1 className="text-2xl font-bold text-foreground">Relatórios de Produtividade</h1>
          <p className="text-muted-foreground">Análise de desempenho dos implantadores</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Implantação</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Implantador</Label>
                <Select value={implementerFilter} onValueChange={setImplementerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {implementers.map((impl) => (
                      <SelectItem key={impl.user_id} value={impl.user_id}>
                        {impl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Implantadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Horas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(stats.reduce((acc, s) => acc + s.totalHours, 0))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Implantações Concluídas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.reduce((acc, s) => acc + s.completed, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {stats.reduce((acc, s) => acc + s.inProgress, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking de Produtividade
            </CardTitle>
            <CardDescription>Ordenado por total de horas trabalhadas</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum implantador encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {stats.map((implanter, index) => (
                  <div
                    key={implanter.userId}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                            index === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : index === 1
                              ? "bg-gray-100 text-gray-700"
                              : index === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{implanter.name}</h3>
                          <p className="text-sm text-muted-foreground">{implanter.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          {formatTime(implanter.totalHours)}
                        </p>
                        <p className="text-sm text-muted-foreground">total trabalhado</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress
                        value={(implanter.totalHours / getMaxHours()) * 100}
                        className="h-2"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Implantações</p>
                        <p className="font-medium">{implanter.totalImplementations}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Em Andamento</p>
                        <p className="font-medium text-primary">{implanter.inProgress}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Concluídas</p>
                        <p className="font-medium text-green-600">{implanter.completed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Média/Impl.</p>
                        <p className="font-medium">{formatTime(Math.round(implanter.avgHoursPerImplementation))}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Esta Semana</p>
                        <p className="font-medium">{formatTime(implanter.hoursThisWeek)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Este Mês</p>
                        <p className="font-medium">{formatTime(implanter.hoursThisMonth)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
