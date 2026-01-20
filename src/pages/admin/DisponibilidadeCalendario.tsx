import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ChevronLeft, ChevronRight, User, Clock } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Episode {
  id: string;
  episode_date: string;
  start_time: string;
  end_time: string;
  implementation_id: string;
  created_by: string;
  module: string;
  episode_type: string;
}

interface Implementer {
  user_id: string;
  name: string;
  is_active: boolean;
}

interface DaySchedule {
  implementer: Implementer;
  episodes: Episode[];
  totalMinutes: number;
}

export default function DisponibilidadeCalendario() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [implementers, setImplementers] = useState<Implementer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch implementers
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "implantador");

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name, is_active")
          .in("user_id", userIds);

        if (profilesData) {
          setImplementers(profilesData.filter(p => p.is_active !== false));
        }
      }

      // Fetch episodes for the current month
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const { data: episodesData } = await supabase
        .from("episodes")
        .select("id, episode_date, start_time, end_time, implementation_id, created_by, module, episode_type")
        .gte("episode_date", start)
        .lte("episode_date", end);

      if (episodesData) {
        setEpisodes(episodesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaySchedules = (date: Date): DaySchedule[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayEpisodes = episodes.filter((e) => e.episode_date === dateStr);

    return implementers
      .map((impl) => {
        const implEpisodes = dayEpisodes.filter((e) => e.created_by === impl.user_id);
        const totalMinutes = implEpisodes.reduce((acc, e) => {
          const start = new Date(`2000-01-01T${e.start_time}`);
          const end = new Date(`2000-01-01T${e.end_time}`);
          return acc + Math.round((end.getTime() - start.getTime()) / 60000);
        }, 0);
        return {
          implementer: impl,
          episodes: implEpisodes,
          totalMinutes,
        };
      })
      .sort((a, b) => b.episodes.length - a.episodes.length);
  };

  const getEpisodeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      treinamento: "Treinamento",
      parametrizacao: "Parametrização",
      ajuste_fiscal: "Ajuste Fiscal",
      migracao: "Migração",
    };
    return labels[type] || type;
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      vendas: "Vendas",
      financeiro: "Financeiro",
      cadastros: "Cadastros",
      relatorios: "Relatórios",
      caixa: "Caixa",
      fiscal: "Fiscal",
      geral: "Geral",
    };
    return labels[module] || module;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const hasBusyImplementers = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return episodes.some((e) => e.episode_date === dateStr);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const selectedDaySchedules = selectedDate ? getDaySchedules(selectedDate) : [];
  const busyImplementers = selectedDaySchedules.filter((s) => s.episodes.length > 0);
  const freeImplementers = selectedDaySchedules.filter((s) => s.episodes.length === 0);

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
          <h1 className="text-2xl font-bold text-foreground">Disponibilidade dos Implantadores</h1>
          <p className="text-muted-foreground">
            Visualize a agenda dos implantadores baseada nos episódios registrados
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Calendário de Disponibilidade</CardTitle>
                <CardDescription>
                  Clique em um dia para ver detalhes de disponibilidade
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[140px] text-center font-medium">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
              {eachDayOfInterval({
                start: startOfMonth(currentMonth),
                end: endOfMonth(currentMonth),
              }).map((date, index) => {
                const dayOfWeek = date.getDay();
                const isFirstWeek = index < 7;
                const paddingDays = isFirstWeek ? dayOfWeek : 0;
                const hasBusy = hasBusyImplementers(date);
                const isToday = isSameDay(date, new Date());

                return (
                  <div
                    key={date.toISOString()}
                    style={{ gridColumnStart: isFirstWeek && index === 0 ? dayOfWeek + 1 : undefined }}
                  >
                    <button
                      onClick={() => handleDayClick(date)}
                      className={`w-full rounded-lg p-2 text-center transition-colors hover:bg-accent ${
                        isToday ? "bg-primary/10 font-bold" : ""
                      }`}
                    >
                      <span className="block text-sm">{format(date, "d")}</span>
                      {hasBusy && (
                        <span className="mt-1 block h-1.5 w-1.5 mx-auto rounded-full bg-primary" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" />
                <span>Dia com agendamentos</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Geral</CardTitle>
            <CardDescription>Status dos implantadores este mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Total de Implantadores</p>
                <p className="text-2xl font-bold">{implementers.length}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Episódios este Mês</p>
                <p className="text-2xl font-bold">{episodes.length}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm text-muted-foreground">Horas Trabalhadas</p>
                <p className="text-2xl font-bold">
                  {formatTime(
                    episodes.reduce((acc, e) => {
                      const start = new Date(`2000-01-01T${e.start_time}`);
                      const end = new Date(`2000-01-01T${e.end_time}`);
                      return acc + Math.round((end.getTime() - start.getTime()) / 60000);
                    }, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Day Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Disponibilidade -{" "}
                {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogTitle>
              <DialogDescription>
                Detalhes de ocupação dos implantadores neste dia
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Busy Implementers */}
              {busyImplementers.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-medium text-destructive">
                    <User className="h-4 w-4" />
                    Ocupados ({busyImplementers.length})
                  </h4>
                  <div className="space-y-3">
                    {busyImplementers.map((schedule) => (
                      <div
                        key={schedule.implementer.user_id}
                        className="rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{schedule.implementer.name}</h5>
                          <Badge variant="secondary">
                            {formatTime(schedule.totalMinutes)}
                          </Badge>
                        </div>
                        <div className="mt-2 space-y-1">
                          {schedule.episodes.map((ep) => (
                            <div
                              key={ep.id}
                              className="flex items-center gap-2 text-sm text-muted-foreground"
                            >
                              <Clock className="h-3 w-3" />
                              <span>
                                {ep.start_time} - {ep.end_time}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getEpisodeTypeLabel(ep.episode_type)}
                              </Badge>
                              <span className="text-xs">({getModuleLabel(ep.module)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Implementers */}
              {freeImplementers.length > 0 && (
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-medium text-green-600">
                    <User className="h-4 w-4" />
                    Disponíveis ({freeImplementers.length})
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {freeImplementers.map((schedule) => (
                      <div
                        key={schedule.implementer.user_id}
                        className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950"
                      >
                        <span className="font-medium text-green-700 dark:text-green-300">
                          {schedule.implementer.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {busyImplementers.length === 0 && freeImplementers.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum implantador cadastrado.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
