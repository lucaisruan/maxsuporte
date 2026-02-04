import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, DollarSign, Pencil, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CommissionTypeForm, CommissionType } from "@/components/commission/CommissionTypeForm";

export default function ConfiguracaoComissoes() {
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<CommissionType | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommissionTypes();
  }, []);

  const fetchCommissionTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("commission_types")
        .select("*")
        .order("name");

      if (error) throw error;

      const typedData = (data || []).map((ct) => ({
        ...ct,
        value: Number(ct.value),
      }));

      setCommissionTypes(typedData);
    } catch (error) {
      console.error("Error fetching commission types:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os modos de implantação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    value: number;
    is_active: boolean;
  }) => {
    setSaving(true);
    try {
      if (editingType) {
        // Update existing
        const { error } = await supabase
          .from("commission_types")
          .update({
            name: data.name,
            description: data.description || null,
            value: data.value,
            is_active: data.is_active,
          })
          .eq("id", editingType.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Modo de implantação atualizado.",
        });
      } else {
        // Create new
        const { error } = await supabase.from("commission_types").insert({
          name: data.name,
          description: data.description || null,
          value: data.value,
          is_active: data.is_active,
        });

        if (error) {
        if (error.code === "23505") {
            throw new Error("Já existe um modo de implantação com este nome.");
          }
          throw error;
        }

        toast({
          title: "Sucesso",
          description: "Modo de implantação criado.",
        });
      }

      setFormOpen(false);
      setEditingType(null);
      fetchCommissionTypes();
    } catch (error: any) {
      console.error("Error saving commission type:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o modo de implantação.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ct: CommissionType) => {
    setEditingType(ct);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingType(null);
    setFormOpen(true);
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Modos de Implantação
            </h1>
            <p className="text-muted-foreground">
              Gerencie os modos de implantação e suas comissões
            </p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Modo de Implantação
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cada modo de implantação tem uma comissão associada. Os valores são salvos
            no momento da conclusão da implantação. Alterações futuras{" "}
            <strong>não afetam</strong> implantações já concluídas.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Modos de Implantação
            </CardTitle>
            <CardDescription>
              Cada modo representa um tipo de implantação com sua comissão associada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {commissionTypes.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum modo de implantação cadastrado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modo de Implantação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionTypes.map((ct) => (
                      <TableRow
                        key={ct.id}
                        className={!ct.is_active ? "opacity-60" : ""}
                      >
                        <TableCell className="font-medium">{ct.name}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {ct.description || "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(ct.value)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={ct.is_active ? "default" : "secondary"}>
                            {ct.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(ct)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <CommissionTypeForm
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) setEditingType(null);
          }}
          commissionType={editingType}
          onSave={handleSave}
          isSaving={saving}
        />
      </div>
    </DashboardLayout>
  );
}
