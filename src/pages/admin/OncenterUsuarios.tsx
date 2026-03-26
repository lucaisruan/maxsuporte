import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link2, Radio, AlertTriangle, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ONCENTER_INTEGRATION_STATUS, oncenterChatStatusLabels } from "@/lib/oncenterTypes";

interface Profile {
  user_id: string;
  name: string;
  email: string;
}

interface UserLink {
  id: string;
  user_id: string;
  oncenter_user_id: number;
  oncenter_user_name: string;
  oncenter_email: string | null;
  oncenter_role: string | null;
  chat_status: string;
}

export default function OncenterUsuarios() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [links, setLinks] = useState<UserLink[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isPending = ONCENTER_INTEGRATION_STATUS === "pending_validation";

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, linksRes] = await Promise.all([
      supabase.from("profiles").select("user_id, name, email").eq("is_active", true),
      supabase.from("oncenter_user_links" as any).select("*"),
    ]);
    setProfiles(profilesRes.data || []);
    setLinks((linksRes.data as any) || []);
    setLoading(false);
  };

  const linkedUserIds = new Set(links.map((l) => l.user_id));

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
          <h1 className="text-2xl font-bold text-foreground">Vínculos Oncenter - Usuários</h1>
          <p className="text-muted-foreground">Vincule analistas internos com operadores da Oncenter</p>
        </div>

        {isPending && (
          <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">API Pendente de Validação</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/70">
                  Os vínculos podem ser configurados manualmente agora. A sincronização automática será ativada quando a API Oncenter estiver validada.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Analistas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profiles.length}</div>
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
              <div className="text-2xl font-bold">{profiles.length - links.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Linked users */}
        {links.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Usuários Vinculados</CardTitle>
              <CardDescription>Analistas com vínculo ativo na Oncenter</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {links.map((link) => {
                const profile = profiles.find((p) => p.user_id === link.user_id);
                const statusInfo = oncenterChatStatusLabels[link.chat_status] || oncenterChatStatusLabels.offline;
                return (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{profile?.name || "Desconhecido"}</p>
                        <span className="text-muted-foreground">→</span>
                        <p className="font-medium">{link.oncenter_user_name}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{profile?.email}</span>
                        {link.oncenter_role && (
                          <Badge variant="outline" className="text-xs">{link.oncenter_role}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio className={`h-3 w-3 ${link.chat_status === "online" ? "text-green-500" : "text-muted-foreground"}`} />
                      <span className={`text-sm ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Unlinked users */}
        <Card>
          <CardHeader>
            <CardTitle>Analistas Sem Vínculo</CardTitle>
            <CardDescription>
              {isPending
                ? "Configure os vínculos manualmente. A sincronização com a Oncenter será feita quando a API estiver validada."
                : "Vincule analistas com operadores Oncenter para rastrear atendimentos."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profiles.filter((p) => !linkedUserIds.has(p.user_id)).length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">Todos os analistas estão vinculados.</p>
            ) : (
              <div className="space-y-3">
                {profiles
                  .filter((p) => !linkedUserIds.has(p.user_id))
                  .map((profile) => (
                    <div key={profile.user_id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{profile.name}</p>
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
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
