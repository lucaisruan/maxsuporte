import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, Radio, User, Building2, Ticket, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ONCENTER_INTEGRATION_STATUS, oncenterTicketStatusLabels, oncenterChatStatusLabels } from "@/lib/oncenterTypes";

interface Props {
  demandId: string;
  isAdmin: boolean;
}

interface DemandLink {
  id: string;
  oncenter_ticket_id: number;
}

interface TicketCacheItem {
  oncenter_ticket_id: number;
  protocol: string;
  status: string;
  last_message: string;
  department_name: string;
  oncenter_user_id: number;
  finish_motive: string | null;
  created_at_oncenter: string;
}

interface UserLinkItem {
  oncenter_user_id: number;
  oncenter_user_name: string;
  oncenter_role: string;
  chat_status: string;
}

export function OncenterDemandTab({ demandId, isAdmin }: Props) {
  const [loading, setLoading] = useState(true);
  const [demandLinks, setDemandLinks] = useState<DemandLink[]>([]);
  const [ticketCache, setTicketCache] = useState<TicketCacheItem[]>([]);
  const [analystLink, setAnalystLink] = useState<UserLinkItem | null>(null);
  const isPending = ONCENTER_INTEGRATION_STATUS === "pending_validation";

  useEffect(() => {
    fetchData();
  }, [demandId]);

  const fetchData = async () => {
    try {
      // Buscar vínculos da demanda com tickets
      const { data: links } = await supabase
        .from("demand_oncenter_links" as any)
        .select("*")
        .eq("demand_id", demandId);

      setDemandLinks((links as any) || []);

      // Buscar cache de tickets vinculados
      if (links && links.length > 0) {
        const ticketIds = links.map((l: any) => l.oncenter_ticket_id);
        const { data: tickets } = await supabase
          .from("oncenter_ticket_cache" as any)
          .select("*")
          .in("oncenter_ticket_id", ticketIds);
        setTicketCache((tickets as any) || []);
      }

      // Buscar analista vinculado (via demand_analysts → oncenter_user_links)
      const { data: analysts } = await supabase
        .from("demand_analysts")
        .select("analyst_id")
        .eq("demand_id", demandId)
        .limit(1);

      if (analysts && analysts.length > 0) {
        const { data: userLink } = await supabase
          .from("oncenter_user_links" as any)
          .select("*")
          .eq("user_id", analysts[0].analyst_id)
          .maybeSingle();
        setAnalystLink(userLink as any);
      }
    } catch (err) {
      console.error("Error loading Oncenter data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Integration status banner */}
      {isPending && (
        <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Integração Pendente</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-300/70">
                A API Oncenter está aguardando validação pelo fornecedor. Os dados abaixo serão preenchidos automaticamente quando a integração estiver ativa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analista Oncenter */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Operador Oncenter
          </CardTitle>
          <CardDescription>Analista vinculado no sistema de atendimento</CardDescription>
        </CardHeader>
        <CardContent>
          {analystLink ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{analystLink.oncenter_user_name}</p>
                <p className="text-sm text-muted-foreground">{analystLink.oncenter_role || "Operador"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Radio className={`h-3 w-3 ${analystLink.chat_status === "online" ? "text-green-500" : "text-muted-foreground"}`} />
                <span className={`text-sm ${oncenterChatStatusLabels[analystLink.chat_status]?.color || "text-muted-foreground"}`}>
                  {oncenterChatStatusLabels[analystLink.chat_status]?.label || analystLink.chat_status}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isPending ? "Será exibido após validação da API" : "Nenhum vínculo Oncenter configurado para este analista"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tickets vinculados */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Tickets Oncenter
          </CardTitle>
          <CardDescription>Atendimentos vinculados a esta demanda</CardDescription>
        </CardHeader>
        <CardContent>
          {ticketCache.length > 0 ? (
            <div className="space-y-3">
              {ticketCache.map((ticket) => (
                <div key={ticket.oncenter_ticket_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{ticket.protocol}</p>
                      <Badge variant="outline" className="text-xs">
                        {oncenterTicketStatusLabels[ticket.status] || ticket.status}
                      </Badge>
                    </div>
                    {ticket.department_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <Building2 className="inline h-3 w-3 mr-1" />
                        {ticket.department_name}
                      </p>
                    )}
                    {ticket.last_message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.last_message}</p>
                    )}
                  </div>
                  {ticket.created_at_oncenter && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(ticket.created_at_oncenter).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Ticket className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground italic">
                {isPending ? "Será preenchido após validação da API" : "Nenhum ticket vinculado a esta demanda"}
              </p>
              {isAdmin && !isPending && (
                <Button variant="outline" size="sm" className="mt-3" disabled={isPending}>
                  <Link2 className="h-4 w-4 mr-2" />
                  Vincular Ticket
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Departamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketCache.length > 0 && ticketCache[0].department_name ? (
            <p className="font-medium">{ticketCache[0].department_name}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {isPending ? "Será exibido após validação da API" : "Sem departamento vinculado"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
