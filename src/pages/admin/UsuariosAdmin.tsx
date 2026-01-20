import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, name, email, is_active, created_at");

      if (profiles) {
        const userIds = profiles.map((p) => p.user_id);
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

        const usersWithRoles = profiles.map((p) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.name,
          email: p.email,
          role: rolesMap.get(p.user_id) || "implantador",
          is_active: p.is_active ?? true,
          created_at: p.created_at,
        }));

        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    setUpdatingUser(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !currentStatus })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, is_active: !currentStatus } : u
        )
      );

      toast({
        title: currentStatus ? "Usuário desativado" : "Usuário ativado",
        description: currentStatus
          ? "O usuário não poderá mais acessar o sistema."
          : "O usuário pode acessar o sistema novamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar usuário",
        description: error.message,
      });
    } finally {
      setUpdatingUser(null);
    }
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

  const activeUsers = users.filter((u) => u.is_active);
  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
          <p className="text-muted-foreground">Gerencie o acesso dos usuários ao sistema</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Inativos</CardTitle>
              <UserX className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{inactiveUsers.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {users.length} usuário(s) cadastrado(s) • Ative/desative o acesso usando o switch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum usuário encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      user.is_active
                        ? "border-border"
                        : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          user.is_active
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {user.is_active ? (
                          <UserCheck className="h-5 w-5" />
                        ) : (
                          <UserX className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? "Administrador" : "Implantador"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      {user.role !== "admin" && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {user.is_active ? "Ativo" : "Inativo"}
                          </span>
                          <Switch
                            checked={user.is_active}
                            disabled={updatingUser === user.user_id}
                            onCheckedChange={() => toggleUserStatus(user.user_id, user.is_active)}
                          />
                          {updatingUser === user.user_id && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )}
                        </div>
                      )}
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
