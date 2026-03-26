import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Building2, User, Circle } from "lucide-react";

interface OncenterUser {
  id: number;
  name: string;
  email?: string;
  chat_status?: string;
  [key: string]: unknown;
}

interface OncenterDepartment {
  id: number;
  name: string;
  users?: OncenterUser[];
  [key: string]: unknown;
}

const statusColor = (status?: string) => {
  switch (status) {
    case "online": return "bg-green-500";
    case "offline": return "bg-muted-foreground/40";
    case "away": return "bg-yellow-500";
    case "busy": return "bg-destructive";
    default: return "bg-muted-foreground/40";
  }
};

export default function OncenterTest() {
  const [data, setData] = useState<OncenterDepartment[] | null>(null);
  const [rawJson, setRawJson] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setRawJson("");

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "oncenter-departments"
      );

      if (fnError) {
        // Show detailed error info
        const errorDetail = {
          message: fnError.message,
          context: (fnError as any).context ?? null,
          status: (fnError as any).status ?? null,
          data: result ?? null,
        };
        setError(`Erro na invocação: ${fnError.message}`);
        setRawJson(JSON.stringify(errorDetail, null, 2));
        return;
      }

      setRawJson(JSON.stringify(result, null, 2));

      // Try to extract departments array from common response shapes.
      let departments: OncenterDepartment[] = [];
      if (Array.isArray(result)) {
        departments = result;
      } else if (result?.data && Array.isArray(result.data)) {
        departments = result.data;
      } else if (result?.departments && Array.isArray(result.departments)) {
        departments = result.departments;
      }

      // Check if result is an error object from the edge function
      if (result?.error) {
        setError(`Oncenter API Error: ${result.error} (HTTP ${result.status ?? "?"})`);
        return;
      }

      setData(departments);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido");
      setRawJson(JSON.stringify({ caught: err.message, stack: err.stack }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Teste Oncenter
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Teste da edge function oncenter-departments
            </p>
          </div>
          <Button onClick={fetchDepartments} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {loading ? "Carregando..." : "Buscar Departamentos"}
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {data && data.length === 0 && !error && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              Nenhum departamento encontrado na resposta.
            </CardContent>
          </Card>
        )}

        {data && data.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((dept) => (
              <Card key={dept.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" />
                    {dept.name}
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {dept.users?.length ?? 0} usuários
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dept.users && dept.users.length > 0 ? (
                    <ul className="space-y-2">
                      {dept.users.map((user) => (
                        <li
                          key={user.id}
                          className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2 text-sm"
                        >
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1 font-medium text-foreground">
                            {user.name}
                          </span>
                          {user.chat_status !== undefined && (
                            <div className="flex items-center gap-1.5">
                              <Circle
                                className={`h-2.5 w-2.5 fill-current ${statusColor(user.chat_status)}`}
                              />
                              <span className="text-xs text-muted-foreground capitalize">
                                {user.chat_status || "—"}
                              </span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem usuários neste departamento
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {rawJson && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resposta bruta (JSON)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
                {rawJson}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
