import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, DollarSign, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CommissionRule {
  id: string;
  implementation_type: "web" | "manager" | "basic";
  commission_value: number;
  is_active: boolean;
  updated_at: string;
}

const typeLabels: Record<string, string> = {
  web: "Web",
  manager: "Manager",
  basic: "Basic",
};

const typeDescriptions: Record<string, string> = {
  web: "Implantação completa do sistema Web",
  manager: "Implantação do sistema Manager",
  basic: "Implantação básica do sistema",
};

export default function ConfiguracaoComissoes() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .order("implementation_type");

      if (error) throw error;

      // Cast the data to ensure proper typing
      const typedData = (data || []).map(rule => ({
        ...rule,
        implementation_type: rule.implementation_type as "web" | "manager" | "basic",
        commission_value: Number(rule.commission_value)
      }));

      setRules(typedData);
    } catch (error) {
      console.error("Error fetching commission rules:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as regras de comissão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (id: string, value: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === id ? { ...rule, commission_value: parseFloat(value) || 0 } : rule
      )
    );
  };

  const handleActiveChange = async (id: string, isActive: boolean) => {
    setSaving(id);
    try {
      const { error } = await supabase
        .from("commission_rules")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      setRules((prev) =>
        prev.map((rule) =>
          rule.id === id ? { ...rule, is_active: isActive } : rule
        )
      );

      toast({
        title: "Sucesso",
        description: `Regra ${isActive ? "ativada" : "desativada"} com sucesso.`,
      });
    } catch (error) {
      console.error("Error updating rule status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da regra.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleSave = async (rule: CommissionRule) => {
    setSaving(rule.id);
    try {
      const { error } = await supabase
        .from("commission_rules")
        .update({ commission_value: rule.commission_value })
        .eq("id", rule.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Valor da comissão atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Error saving commission value:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o valor da comissão.",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
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
          <h1 className="text-2xl font-bold text-foreground">Configuração de Comissões</h1>
          <p className="text-muted-foreground">
            Configure os valores de comissão para cada tipo de implantação
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            As alterações de valores <strong>não afetam</strong> implantações já concluídas. 
            O valor da comissão é registrado no momento em que a implantação é concluída.
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-3">
          {rules.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    {typeLabels[rule.implementation_type]}
                  </CardTitle>
                  <Badge variant={rule.is_active ? "default" : "secondary"}>
                    {rule.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                <CardDescription>{typeDescriptions[rule.implementation_type]}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`value-${rule.id}`}>Valor da Comissão (R$)</Label>
                  <Input
                    id={`value-${rule.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={rule.commission_value}
                    onChange={(e) => handleValueChange(rule.id, e.target.value)}
                    disabled={!rule.is_active}
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-muted-foreground">
                    Valor atual: {formatCurrency(rule.commission_value)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`active-${rule.id}`}
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleActiveChange(rule.id, checked)}
                      disabled={saving === rule.id}
                    />
                    <Label htmlFor={`active-${rule.id}`}>
                      {rule.is_active ? "Ativo" : "Inativo"}
                    </Label>
                  </div>
                </div>

                <Button
                  onClick={() => handleSave(rule)}
                  disabled={saving === rule.id || !rule.is_active}
                  className="w-full"
                >
                  {saving === rule.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Valor
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {rules.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhuma regra de comissão configurada.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
