import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, FileText, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string | null;
  base_score: number;
  is_active: boolean;
  created_at: string;
  steps_count?: number;
}

export default function DemandTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data } = await supabase
      .from("demand_templates")
      .select("*, demand_template_steps(id)")
      .order("created_at", { ascending: false });

    if (data) {
      setTemplates(
        data.map((t: any) => ({
          ...t,
          steps_count: t.demand_template_steps?.length || 0,
        }))
      );
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("demand_templates")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: !current } : t))
      );
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modelos de Demanda (POP)</h1>
            <p className="text-muted-foreground">Gerencie os procedimentos operacionais padrão</p>
          </div>
          <Button asChild>
            <Link to="/admin/demandas/modelos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Modelo
            </Link>
          </Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="mx-auto mb-4 h-12 w-12 opacity-40" />
              <p>Nenhum modelo cadastrado ainda.</p>
              <Button asChild className="mt-4">
                <Link to="/admin/demandas/modelos/novo">Criar primeiro modelo</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Card key={t.id} className={!t.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <Switch
                      checked={t.is_active}
                      onCheckedChange={() => toggleActive(t.id, t.is_active)}
                    />
                  </div>
                  {t.description && (
                    <CardDescription className="line-clamp-2">{t.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="secondary">{t.steps_count} passos</Badge>
                      <Badge variant="outline">{t.base_score} pts</Badge>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/admin/demandas/modelos/${t.id}`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Editar
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
