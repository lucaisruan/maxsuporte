import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserCheck, UserX, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel, MODULE_LABELS, ALL_MODULES } from "@/lib/roleLabels";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface ModulePermission {
  module: string;
  has_access: boolean;
}

export default function UsuariosAdmin() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<UserWithRole | null>(null);
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
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
      toast({ variant: "destructive", title: "Erro ao atualizar usuário", description: error.message });
    } finally {
      setUpdatingUser(null);
    }
  };

  const openPermissions = async (user: UserWithRole) => {
    setPermissionsUser(user);

    const { data } = await supabase
      .from("user_module_permissions")
      .select("module, has_access")
      .eq("user_id", user.user_id);

    const existingMap = new Map(data?.map((p) => [p.module, p.has_access]) || []);

    setPermissions(
      ALL_MODULES.map((m) => ({
        module: m,
        has_access: existingMap.has(m) ? existingMap.get(m)! : true,
      }))
    );
  };

  const togglePermission = (module: string) => {
    setPermissions((prev) =>
      prev.map((p) => (p.module === module ? { ...p, has_access: !p.has_access } : p))
    );
  };

  const savePermissions = async () => {
    if (!permissionsUser) return;
    setSavingPermissions(true);

    try {
      // Delete existing and re-insert
      await supabase
        .from("user_module_permissions")
        .delete()
        .eq("user_id", permissionsUser.user_id);

      const { error } = await supabase.from("user_module_permissions").insert(
        permissions.map((p) => ({
          user_id: permissionsUser.user_id,
          module: p.module,
          has_access: p.has_access,
        }))
      );

      if (error) throw error;

      toast({ title: "Permissões salvas!" });
      setPermissionsUser(null);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setSavingPermissions(false);
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
                      user.is_active ? "border-border" : "border-destructive/30 bg-destructive/5"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          user.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {user.is_active ? <UserCheck className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {getRoleLabel(user.role)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openPermissions(user)}
                        title="Configurar permissões"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
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

      {/* Permissions Dialog */}
      <Dialog open={!!permissionsUser} onOpenChange={(open) => !open && setPermissionsUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões de Módulo</DialogTitle>
            <DialogDescription>
              Configure o acesso de {permissionsUser?.name} aos módulos do sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {permissions.map((p) => (
              <div key={p.module} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{MODULE_LABELS[p.module] || p.module}</span>
                <Checkbox
                  checked={p.has_access}
                  onCheckedChange={() => togglePermission(p.module)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPermissionsUser(null)}>
              Cancelar
            </Button>
            <Button onClick={savePermissions} disabled={savingPermissions}>
              {savingPermissions && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
