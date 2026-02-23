import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { WebhookService } from "@/lib/webhookService";

interface Implementer {
  user_id: string;
  name: string;
}

interface CommissionType {
  id: string;
  name: string;
  value: number;
  is_active: boolean;
}

export default function NovaImplantacao() {
  const [clientName, setClientName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [selectedImplementerIds, setSelectedImplementerIds] = useState<string[]>([]);
  const [commissionTypeId, setCommissionTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [negotiatedHours, setNegotiatedHours] = useState("");
  const [negotiatedMinutesField, setNegotiatedMinutesField] = useState("");
  const [observations, setObservations] = useState("");
  const [implementers, setImplementers] = useState<Implementer[]>([]);
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingImplementers, setLoadingImplementers] = useState(true);
  const [loadingCommissionTypes, setLoadingCommissionTypes] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchImplementers();
    fetchCommissionTypes();
  }, []);

  const fetchImplementers = async () => {
    try {
      // Get all active users (both implantador and admin can be implementers)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, is_active")
        .eq("is_active", true)
        .order("name");

      if (profilesData) {
        setImplementers(profilesData);
      }
    } catch (error) {
      console.error("Error fetching implementers:", error);
    } finally {
      setLoadingImplementers(false);
    }
  };

  const fetchCommissionTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("commission_types")
        .select("id, name, value, is_active")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;

      setCommissionTypes(data || []);
    } catch (error) {
      console.error("Error fetching commission types:", error);
    } finally {
      setLoadingCommissionTypes(false);
    }
  };

  const toggleImplementer = (userId: string) => {
    setSelectedImplementerIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedImplementerIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione ao menos um implantador responsável.",
      });
      return;
    }

    if (!commissionTypeId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione o modo de implantação.",
      });
      return;
    }

    if (!startDate) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione a data de início.",
      });
      return;
    }

    const totalNegotiatedMinutes = (parseInt(negotiatedHours || "0") * 60) + parseInt(negotiatedMinutesField || "0");
    if (totalNegotiatedMinutes < 30) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "O tempo negociado deve ser de no mínimo 30 minutos.",
      });
      return;
    }

    setLoading(true);

    try {
      // Create client first
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: clientName,
          cnpj: cnpj || null,
          observations,
          created_by: user?.id,
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Determine status based on start date
      const today = new Date().toISOString().split("T")[0];
      const isScheduled = startDate > today;
      const status = isScheduled ? "agendada" : "em_andamento";

      // Create implementation with first implementer as primary (backward compat)
      const { data: implData, error: implError } = await supabase
        .from("implementations")
        .insert({
          client_id: clientData.id,
          implementer_id: selectedImplementerIds[0],
          commission_type_id: commissionTypeId,
          start_date: new Date(startDate).toISOString(),
          actual_start_date: isScheduled ? null : new Date().toISOString(),
          status: status as "agendada" | "em_andamento",
          negotiated_time_minutes: totalNegotiatedMinutes,
          observations,
          created_by: user?.id,
        })
        .select()
        .single();

      if (implError) throw implError;

      // Insert into pivot table for all selected implementers
      const pivotEntries = selectedImplementerIds.map((analystId) => ({
        implementation_id: implData.id,
        analyst_id: analystId,
      }));

      const { error: pivotError } = await supabase
        .from("implementation_analysts" as any)
        .insert(pivotEntries);

      if (pivotError) throw pivotError;

      // Create default checklist items
      const checklistItems = [
        { title: "Migração de Dados", description: "Migração de dados do sistema anterior (opcional)", order_index: 1 },
        { title: "Cadastro dos dados da empresa", description: "Cadastro dos dados da empresa do Cliente no Sistema", order_index: 2 },
        { title: "Configuração Tributária (CFOP)", description: "Qual o regime tributário do cliente e CFOPs utilizados", order_index: 3 },
        { title: "Alinhamento Fiscal e Contábil", description: "Último número de NF/NFC, Série, CSC e tipo de documento fiscal", order_index: 4 },
        { title: "Identidade Visual", description: "Logo e papel de parede do cliente no sistema", order_index: 5 },
        { title: "Parametrizações do Sistema", description: "Regras, bloqueios e fluxo de venda", order_index: 6 },
        { title: "Treinamentos", description: "Vendas, Cadastros, Financeiro, Caixa e Relatórios", order_index: 7 },
      ];

      const { error: checklistError } = await supabase
        .from("checklist_items")
        .insert(
          checklistItems.map((item) => ({
            ...item,
            implementation_id: implData.id,
          }))
        );

      if (checklistError) throw checklistError;

      // Webhook: implantacao_criada
      const selectedNames = selectedImplementerIds
        .map((uid) => implementers.find((i) => i.user_id === uid)?.name)
        .filter(Boolean)
        .join(", ");
      const selectedCommission = commissionTypes.find((ct) => ct.id === commissionTypeId);
      WebhookService.send("implantacao_criada", {
        implantacao_id: implData.id,
        cliente: clientName,
        tipo_implantacao: selectedCommission?.name || "",
        data_inicio: startDate,
        analistas: selectedNames,
        tempo_negociado: `${negotiatedHours || "0"}h ${negotiatedMinutesField || "0"}min`,
        created_by: user?.id,
      });

      toast({
        title: isScheduled ? "Implantação agendada!" : "Implantação criada!",
        description: isScheduled
          ? `A implantação foi agendada para ${new Date(startDate).toLocaleDateString("pt-BR")}.`
          : "A implantação foi criada com sucesso.",
      });

      navigate("/admin/implantacoes");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar implantação",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nova Implantação</h1>
            <p className="text-muted-foreground">Cadastre uma nova implantação</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Implantação</CardTitle>
            <CardDescription>
              Preencha os dados do cliente e selecione os implantadores responsáveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nome do Cliente *</Label>
                <Input
                  id="clientName"
                  placeholder="Nome da empresa"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="commissionType">Modo de Implantação *</Label>
                  {loadingCommissionTypes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando modos...
                    </div>
                  ) : (
                    <Select value={commissionTypeId} onValueChange={setCommissionTypeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        {commissionTypes.length === 0 ? (
                          <SelectItem value="" disabled>
                            Nenhum modo de implantação cadastrado
                          </SelectItem>
                        ) : (
                          commissionTypes.map((ct) => (
                            <SelectItem key={ct.id} value={ct.id}>
                              {ct.name} ({formatCurrency(ct.value)})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Datas futuras criam implantações agendadas. Datas passadas iniciam como "Em andamento".
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tempo de Implantação Negociado *</Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="999"
                      placeholder="0"
                      value={negotiatedHours}
                      onChange={(e) => setNegotiatedHours(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">h</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={negotiatedMinutesField}
                      onChange={(e) => setNegotiatedMinutesField(e.target.value)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">min</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo: 30 minutos. Tempo de migração de dados não é contabilizado.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Implantadores Responsáveis * ({selectedImplementerIds.length} selecionado{selectedImplementerIds.length !== 1 ? "s" : ""})</Label>
                {loadingImplementers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando implantadores...
                  </div>
                ) : implementers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum implantador ativo</p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                    {implementers.map((impl) => (
                      <div key={impl.user_id} className="flex items-center gap-2">
                        <Checkbox
                          id={`impl-${impl.user_id}`}
                          checked={selectedImplementerIds.includes(impl.user_id)}
                          onCheckedChange={() => toggleImplementer(impl.user_id)}
                        />
                        <Label htmlFor={`impl-${impl.user_id}`} className="cursor-pointer text-sm font-normal">
                          {impl.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  placeholder="Observações sobre a implantação"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Implantação
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
