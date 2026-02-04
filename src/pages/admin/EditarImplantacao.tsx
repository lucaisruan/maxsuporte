import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

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

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  observations: string | null;
}

interface Implementation {
  id: string;
  client_id: string;
  implementer_id: string | null;
  commission_type_id: string | null;
  start_date: string;
  status: string;
  observations: string | null;
  client: Client;
}

export default function EditarImplantacao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [implementation, setImplementation] = useState<Implementation | null>(null);
  const [clientName, setClientName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [implementerId, setImplementerId] = useState("");
  const [commissionTypeId, setCommissionTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [observations, setObservations] = useState("");
  const [implementers, setImplementers] = useState<Implementer[]>([]);
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingImplementers, setLoadingImplementers] = useState(true);
  const [loadingCommissionTypes, setLoadingCommissionTypes] = useState(true);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      // Fetch implementation with client data
      const { data: implData, error: implError } = await supabase
        .from("implementations")
        .select(`
          id,
          client_id,
          implementer_id,
          commission_type_id,
          start_date,
          status,
          observations,
          client:clients(id, name, cnpj, observations)
        `)
        .eq("id", id)
        .single();

      if (implError) throw implError;

      if (implData) {
        const typedData = {
          ...implData,
          client: implData.client as Client
        };
        setImplementation(typedData);
        setClientName(typedData.client?.name || "");
        setCnpj(typedData.client?.cnpj || "");
        setImplementerId(typedData.implementer_id || "");
        setCommissionTypeId(typedData.commission_type_id || "");
        setStartDate(typedData.start_date.split("T")[0]);
        setObservations(typedData.observations || "");
      }

      // Fetch commission types (include inactive ones to show current selection)
      const { data: ctData } = await supabase
        .from("commission_types")
        .select("id, name, value, is_active")
        .order("name");

      if (ctData) {
        setCommissionTypes(ctData);
      }
      setLoadingCommissionTypes(false);

      // Fetch implementers
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "implantador");

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name, is_active")
          .in("user_id", userIds)
          .eq("is_active", true);

        if (profilesData) {
          setImplementers(profilesData);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da implantação.",
      });
    } finally {
      setLoading(false);
      setLoadingImplementers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!implementerId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um implantador responsável.",
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

    setSaving(true);

    try {
      // Update client
      const { error: clientError } = await supabase
        .from("clients")
        .update({
          name: clientName,
          cnpj: cnpj || null,
        })
        .eq("id", implementation?.client_id);

      if (clientError) throw clientError;

      // Determine status based on start date
      const today = new Date().toISOString().split("T")[0];
      const isScheduled = startDate > today;
      
      // Only update status to agendada if it's currently agendada or em_andamento
      let newStatus = implementation?.status;
      if (implementation?.status === "agendada" || implementation?.status === "em_andamento") {
        newStatus = isScheduled ? "agendada" : "em_andamento";
      }

      // Update implementation
      const { error: implError } = await supabase
        .from("implementations")
        .update({
          implementer_id: implementerId,
          commission_type_id: commissionTypeId,
          start_date: new Date(startDate).toISOString(),
          status: newStatus as "agendada" | "em_andamento" | "pausada" | "concluida" | "cancelada",
          observations: observations || null,
        })
        .eq("id", id);

      if (implError) throw implError;

      toast({
        title: "Implantação atualizada!",
        description: "As alterações foram salvas com sucesso.",
      });

      navigate("/admin/implantacoes");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar implantação",
        description: error.message,
      });
    } finally {
      setSaving(false);
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

  if (!implementation) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <p className="text-muted-foreground">Implantação não encontrada.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Editar Implantação</h1>
            <p className="text-muted-foreground">Atualize os dados da implantação</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Implantação</CardTitle>
            <CardDescription>
              Atualize os dados do cliente e do implantador responsável
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
                            Nenhum modo de implantação
                          </SelectItem>
                        ) : (
                          commissionTypes
                            .filter(ct => ct.is_active || ct.id === commissionTypeId)
                            .map((ct) => (
                              <SelectItem key={ct.id} value={ct.id}>
                                {ct.name} {!ct.is_active && "(Inativo)"}
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
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="implementer">Implantador Responsável *</Label>
                {loadingImplementers ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando implantadores...
                  </div>
                ) : (
                  <Select value={implementerId} onValueChange={setImplementerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o implantador" />
                    </SelectTrigger>
                    <SelectContent>
                      {implementers.length === 0 ? (
                        <SelectItem value="" disabled>
                          Nenhum implantador ativo
                        </SelectItem>
                      ) : (
                        implementers.map((impl) => (
                          <SelectItem key={impl.user_id} value={impl.user_id}>
                            {impl.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
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
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
