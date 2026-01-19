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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

interface Implementer {
  user_id: string;
  name: string;
}

export default function NovaImplantacao() {
  const [clientName, setClientName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [implementerId, setImplementerId] = useState("");
  const [observations, setObservations] = useState("");
  const [implementers, setImplementers] = useState<Implementer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingImplementers, setLoadingImplementers] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchImplementers();
  }, []);

  const fetchImplementers = async () => {
    try {
      // Get all users with implantador role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "implantador");

      if (roleData && roleData.length > 0) {
        const userIds = roleData.map((r) => r.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", userIds);

        if (profilesData) {
          setImplementers(profilesData);
        }
      }
    } catch (error) {
      console.error("Error fetching implementers:", error);
    } finally {
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

      // Create implementation
      const { data: implData, error: implError } = await supabase
        .from("implementations")
        .insert({
          client_id: clientData.id,
          implementer_id: implementerId,
          observations,
          created_by: user?.id,
        })
        .select()
        .single();

      if (implError) throw implError;

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

      toast({
        title: "Implantação criada!",
        description: "A implantação foi criada com sucesso.",
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
              Preencha os dados do cliente e selecione o implantador responsável
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
                          Nenhum implantador cadastrado
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
