import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Ticket, Clock, Users, Radio, TrendingUp } from "lucide-react";
import { ONCENTER_INTEGRATION_STATUS, oncenterTicketStatusLabels, oncenterChatStatusLabels } from "@/lib/oncenterTypes";

interface UserLink {
  oncenter_user_id: number;
  oncenter_user_name: string;
  oncenter_role: string | null;
  chat_status: string;
  user_id: string;
}

interface TicketCacheItem {
  oncenter_ticket_id: number;
  protocol: string;
  status: string;
  oncenter_user_id: number;
  department_name: string;
  created_at_oncenter: string;
  finished_at_oncenter: string | null;
}

export default function OncenterRelatorios() {
  const [userLinks, setUserLinks] = useState<UserLink[]>([]);
  const [tickets, setTickets] = useState<TicketCacheItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isPending = ONCENTER_INTEGRATION_STATUS === "pending_validation";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [linksRes, ticketsRes] = await Promise.all([
      supabase.from("oncenter_user_links" as any).select("*"),
      supabase.from("oncenter_ticket_cache" as any).select("*").order("created_at_oncenter" as any, { ascending: false }).limit(100),
    ]);
    setUserLinks((linksRes.data as any) || []);
    setTickets((ticketsRes.data as any) || []);
    setLoading(false);
  };

  const onlineCount = userLinks.filter((u) => u.chat_status === "online").length;
  const closedTickets = tickets.filter((t) => t.status === "closed").length;

  // Tickets por operador
  const ticketsByOperator = new Map<number, { name: string; count: number }>();
  tickets.forEach((t) => {
    if (t.oncenter_user_id) {
      const user = userLinks.find((u) => u.oncenter_user_id === t.oncenter_user_id);
      const current = ticketsByOperator.get(t.oncenter_user_id) || { name: user?.oncenter_user_name || `#${t.oncenter_user_id}`, count: 0 };
      current.count++;
      ticketsByOperator.set(t.oncenter_user_id, current);
    }
  });

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
          <h1 className="text-2xl font-bold text-foreground">Relatórios Oncenter</h1>
          <p className="text-muted-foreground">Produtividade e atendimentos Oncenter</p>
        </div>

        {isPending && (
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">Dados Pendentes</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/70">
                  Os relatórios serão preenchidos automaticamente quando a integração Oncenter estiver ativa. Atualmente os dados vêm apenas do cache local.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Operadores Vinculados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userLinks.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Online Agora</CardTitle>
              <Radio className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{onlineCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tickets em Cache</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Encerrados</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{closedTickets}</div>
            </CardContent>
          </Card>
        </div>

        {/* Status dos operadores */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Operadores</CardTitle>
            <CardDescription>Status em tempo real dos analistas vinculados</CardDescription>
          </CardHeader>
          <CardContent>
            {userLinks.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {isPending ? "Dados disponíveis após validação da API." : "Nenhum operador vinculado."}
              </p>
            ) : (
              <div className="space-y-3">
                {userLinks.map((user) => {
                  const statusInfo = oncenterChatStatusLabels[user.chat_status] || oncenterChatStatusLabels.offline;
                  const userTickets = ticketsByOperator.get(user.oncenter_user_id);
                  return (
                    <div key={user.oncenter_user_id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Radio className={`h-3 w-3 ${user.chat_status === "online" ? "text-green-500" : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium">{user.oncenter_user_name}</p>
                          {user.oncenter_role && (
                            <Badge variant="outline" className="text-xs mt-1">{user.oncenter_role}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {userTickets && (
                          <span className="text-sm text-muted-foreground">{userTickets.count} tickets</span>
                        )}
                        <Badge variant={user.chat_status === "online" ? "default" : "secondary"}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos tickets */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Tickets</CardTitle>
            <CardDescription>Cache dos últimos atendimentos sincronizados</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {isPending ? "Dados disponíveis após validação da API." : "Nenhum ticket em cache."}
              </p>
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, 20).map((ticket) => (
                  <div key={ticket.oncenter_ticket_id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{ticket.protocol || `#${ticket.oncenter_ticket_id}`}</span>
                        <Badge variant="outline" className="text-xs">
                          {oncenterTicketStatusLabels[ticket.status] || ticket.status}
                        </Badge>
                      </div>
                      {ticket.department_name && (
                        <span className="text-xs text-muted-foreground">{ticket.department_name}</span>
                      )}
                    </div>
                    {ticket.created_at_oncenter && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ticket.created_at_oncenter).toLocaleDateString("pt-BR")}
                      </span>
                    )}
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
