import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, AlertTriangle, Building, UserCheck } from "lucide-react";
import { ONCENTER_INTEGRATION_STATUS } from "@/lib/oncenterTypes";

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
}

interface ClientLink {
  id: string;
  client_id: string;
  oncenter_contact_id: number;
}

export default function OncenterClientes() {
  const [clients, setClients] = useState<Client[]>([]);
  const [links, setLinks] = useState<ClientLink[]>([]);
  const [loading, setLoading] = useState(true);
  const isPending = ONCENTER_INTEGRATION_STATUS === "pending_validation";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [clientsRes, linksRes] = await Promise.all([
      supabase.from("clients").select("id, name, cnpj"),
      supabase.from("oncenter_client_links" as any).select("*"),
    ]);
    setClients(clientsRes.data || []);
    setLinks((linksRes.data as any) || []);
    setLoading(false);
  };

  const linkedClientIds = new Set(links.map((l) => l.client_id));

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
          <h1 className="text-2xl font-bold text-foreground">Vínculos Oncenter - Clientes</h1>
          <p className="text-muted-foreground">Vincule clientes locais com contatos da Oncenter</p>
        </div>

        {isPending && (
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">API Pendente de Validação</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/70">
                  A lista de contatos Oncenter será carregada automaticamente quando a API estiver validada.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Vinculados</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{links.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sem Vínculo</CardTitle>
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length - links.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Linked */}
        {links.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Clientes Vinculados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {links.map((link) => {
                const client = clients.find((c) => c.id === link.client_id);
                return (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">{client?.name || "Desconhecido"}</p>
                      {client?.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                    </div>
                    <Badge variant="outline">Oncenter #{link.oncenter_contact_id}</Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Unlinked */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Sem Vínculo</CardTitle>
            <CardDescription>
              {isPending
                ? "Os contatos Oncenter estarão disponíveis para vinculação quando a API for validada."
                : "Vincule clientes com contatos Oncenter para rastrear atendimentos."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clients.filter((c) => !linkedClientIds.has(c.id)).length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Todos os clientes estão vinculados.</p>
            ) : (
              <div className="space-y-3">
                {clients
                  .filter((c) => !linkedClientIds.has(c.id))
                  .map((client) => (
                    <div key={client.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{client.name}</p>
                        {client.cnpj && <p className="text-xs text-muted-foreground">{client.cnpj}</p>}
                      </div>
                      <Button variant="outline" size="sm" disabled={isPending}>
                        <Link2 className="h-4 w-4 mr-2" />
                        Vincular
                      </Button>
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
