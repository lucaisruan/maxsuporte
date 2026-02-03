import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, DollarSign, CheckCircle2, Clock, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ImplementationCommission {
  id: string;
  commission_name: string;
  commission_value: number;
}

interface Implementation {
  id: string;
  client: { name: string };
  implementation_type: "web" | "manager" | "basic" | null;
  status: string;
  end_date: string | null;
  commission_value: number | null;
  commission_paid: boolean;
  commission_paid_at: string | null;
  implementer_id: string | null;
  commissions: ImplementationCommission[];
}

interface Implementer {
  user_id: string;
  name: string;
}

interface CommissionType {
  id: string;
  name: string;
}

const typeLabels: Record<string, string> = {
  web: "Web",
  manager: "Manager",
  basic: "Basic",
};

export default function RelatorioComissoes() {
  const [implementations, setImplementations] = useState<Implementation[]>([]);
  const [implementers, setImplementers] = useState<Implementer[]>([]);
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedImplementer, setSelectedImplementer] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedCommissionType, setSelectedCommissionType] = useState<string>("all");
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  useEffect(() => {
    fetchImplementers();
    fetchCommissionTypes();
  }, []);

  useEffect(() => {
    fetchImplementations();
  }, [startDate, endDate, selectedImplementer, selectedType, selectedCommissionType, showOnlyPending]);

  const fetchImplementers = async () => {
    try {
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
    }
  };

  const fetchCommissionTypes = async () => {
    try {
      const { data } = await supabase
        .from("commission_types")
        .select("id, name")
        .order("name");

      if (data) {
        setCommissionTypes(data);
      }
    } catch (error) {
      console.error("Error fetching commission types:", error);
    }
  };

  const fetchImplementations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("implementations")
        .select("id, implementation_type, status, end_date, commission_value, commission_paid, commission_paid_at, implementer_id, client:clients(name)")
        .eq("status", "concluida")
        .gte("end_date", startDate)
        .lte("end_date", endDate + "T23:59:59")
        .order("end_date", { ascending: false });

      if (selectedImplementer !== "all") {
        query = query.eq("implementer_id", selectedImplementer);
      }

      if (selectedType !== "all") {
        query = query.eq("implementation_type", selectedType as "web" | "manager" | "basic");
      }

      if (showOnlyPending) {
        query = query.eq("commission_paid", false);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch commissions for each implementation
      const implementationIds = (data || []).map((impl) => impl.id);
      
      let commissionsMap: Record<string, ImplementationCommission[]> = {};
      
      if (implementationIds.length > 0) {
        const { data: commissionsData } = await supabase
          .from("implementation_commissions")
          .select("id, implementation_id, commission_name, commission_value")
          .in("implementation_id", implementationIds);

        if (commissionsData) {
          commissionsData.forEach((comm: any) => {
            if (!commissionsMap[comm.implementation_id]) {
              commissionsMap[comm.implementation_id] = [];
            }
            commissionsMap[comm.implementation_id].push({
              id: comm.id,
              commission_name: comm.commission_name,
              commission_value: Number(comm.commission_value),
            });
          });
        }
      }

      // Type assertion and merge commissions
      let typedData = (data || []).map((impl) => ({
        ...impl,
        client: impl.client as { name: string },
        implementation_type: impl.implementation_type as "web" | "manager" | "basic" | null,
        commissions: commissionsMap[impl.id] || [],
      }));

      // Filter by commission type if selected
      if (selectedCommissionType !== "all") {
        typedData = typedData.filter((impl) =>
          impl.commissions.some((c) => c.commission_name === selectedCommissionType) ||
          // Fallback: for legacy data without commissions table entries
          (impl.commissions.length === 0 && impl.commission_value !== null)
        );
      }

      // Filter out implementations with no commission at all
      typedData = typedData.filter(
        (impl) => impl.commissions.length > 0 || impl.commission_value !== null
      );

      setImplementations(typedData);
    } catch (error) {
      console.error("Error fetching implementations:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as implantações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaid = async (id: string, currentPaid: boolean) => {
    setUpdating(id);
    try {
      const newPaidStatus = !currentPaid;
      const { error } = await supabase
        .from("implementations")
        .update({
          commission_paid: newPaidStatus,
          commission_paid_at: newPaidStatus ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;

      setImplementations((prev) =>
        prev.map((impl) =>
          impl.id === id
            ? {
                ...impl,
                commission_paid: newPaidStatus,
                commission_paid_at: newPaidStatus ? new Date().toISOString() : null,
              }
            : impl
        )
      );

      toast({
        title: "Sucesso",
        description: `Comissão marcada como ${newPaidStatus ? "paga" : "pendente"}.`,
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status de pagamento.",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getImplementerName = (implementerId: string | null) => {
    if (!implementerId) return "-";
    const impl = implementers.find((i) => i.user_id === implementerId);
    return impl?.name || "-";
  };

  // Calculate total for an implementation (new system or legacy)
  const getImplementationTotal = (impl: Implementation): number => {
    if (impl.commissions.length > 0) {
      return impl.commissions.reduce((acc, c) => acc + c.commission_value, 0);
    }
    return impl.commission_value || 0;
  };

  // Summary calculations
  const totalCommission = implementations.reduce(
    (acc, impl) => acc + getImplementationTotal(impl),
    0
  );
  const paidCommission = implementations
    .filter((impl) => impl.commission_paid)
    .reduce((acc, impl) => acc + getImplementationTotal(impl), 0);
  const pendingCommission = totalCommission - paidCommission;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório de Comissionamento</h1>
          <p className="text-muted-foreground">
            Acompanhe as comissões de cada implantador
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Implantador</Label>
                <Select value={selectedImplementer} onValueChange={setSelectedImplementer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {implementers.map((impl) => (
                      <SelectItem key={impl.user_id} value={impl.user_id}>
                        {impl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Implantação</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
                <Select value={selectedCommissionType} onValueChange={setSelectedCommissionType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {commissionTypes.map((ct) => (
                      <SelectItem key={ct.id} value={ct.name}>
                        {ct.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pending"
                    checked={showOnlyPending}
                    onCheckedChange={(checked) => setShowOnlyPending(checked as boolean)}
                  />
                  <Label htmlFor="pending" className="cursor-pointer">
                    Apenas pendentes
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Implantações Concluídas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{implementations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Comissões</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCommission)}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Total Pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(paidCommission)}</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-600" />
                Total Pendente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(pendingCommission)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento</CardTitle>
            <CardDescription>
              {selectedImplementer !== "all"
                ? `Implantações de ${getImplementerName(selectedImplementer)}`
                : "Todas as implantações concluídas no período"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : implementations.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nenhuma implantação concluída encontrada no período selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Implantador</TableHead>
                      <TableHead>Comissões</TableHead>
                      <TableHead>Data Conclusão</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {implementations.map((impl) => (
                      <TableRow key={impl.id}>
                        <TableCell className="font-medium">
                          {impl.client?.name || "-"}
                        </TableCell>
                        <TableCell>{getImplementerName(impl.implementer_id)}</TableCell>
                        <TableCell>
                          {impl.commissions.length > 0 ? (
                            <div className="space-y-1">
                              {impl.commissions.map((c) => (
                                <div key={c.id} className="flex items-center gap-2 text-sm">
                                  <Badge variant="outline" className="text-xs">
                                    {c.commission_name}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {formatCurrency(c.commission_value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Badge variant="outline">
                              {impl.implementation_type
                                ? typeLabels[impl.implementation_type]
                                : "Legado"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {impl.end_date
                            ? format(new Date(impl.end_date), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(getImplementationTotal(impl))}
                        </TableCell>
                        <TableCell className="text-center">
                          {impl.commission_paid ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              Pago
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant={impl.commission_paid ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleTogglePaid(impl.id, impl.commission_paid)}
                            disabled={updating === impl.id}
                          >
                            {updating === impl.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : impl.commission_paid ? (
                              "Desfazer"
                            ) : (
                              "Marcar Pago"
                            )}
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
      </div>
    </DashboardLayout>
  );
}
