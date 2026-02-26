import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Clock, User, Building2 } from "lucide-react";
import { CommissionSelectionModal } from "@/components/commission/CommissionSelectionModal";

interface ConclusionRequest {
  id: string;
  implementation_id: string;
  requester_id: string;
  status: string;
  requester_observation: string | null;
  admin_observation: string | null;
  approved_by: string | null;
  created_at: string;
  // joined
  client_name: string;
  requester_name: string;
  implementation_type: string | null;
}

export default function SolicitacoesConclusao() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ConclusionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectObservation, setRejectObservation] = useState("");

  // Approve (commission) modal
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<ConclusionRequest | null>(null);
  const [approveObservation, setApproveObservation] = useState("");
  const [approveObsModalOpen, setApproveObsModalOpen] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Fetch pending conclusion requests
      const { data: reqData, error } = await supabase
        .from("conclusion_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!reqData || reqData.length === 0) {
        setRequests([]);
        setLoading(false);
        return;
      }

      const typedReqs = reqData as any[];

      // Get implementation details
      const implIds = [...new Set(typedReqs.map((r) => r.implementation_id))];
      const requesterIds = [...new Set(typedReqs.map((r) => r.requester_id))];

      const [implRes, profileRes] = await Promise.all([
        supabase
          .from("implementations")
          .select("id, implementation_type, client:clients(name)")
          .in("id", implIds),
        supabase.from("profiles").select("user_id, name").in("user_id", requesterIds),
      ]);

      const implMap = new Map(
        (implRes.data || []).map((i: any) => [i.id, { client_name: i.client?.name || "N/A", implementation_type: i.implementation_type }])
      );
      const profileMap = new Map((profileRes.data || []).map((p) => [p.user_id, p.name]));

      const enriched: ConclusionRequest[] = typedReqs.map((r) => ({
        ...r,
        client_name: implMap.get(r.implementation_id)?.client_name || "N/A",
        implementation_type: implMap.get(r.implementation_id)?.implementation_type || null,
        requester_name: profileMap.get(r.requester_id) || "Desconhecido",
      }));

      setRequests(enriched);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClick = (request: ConclusionRequest) => {
    setApprovingRequest(request);
    setApproveObservation("");
    setApproveObsModalOpen(true);
  };

  const handleApproveConfirmObs = () => {
    setApproveObsModalOpen(false);
    setCommissionModalOpen(true);
  };

  const handleCommissionConfirm = async (selectedCommissions: { id: string; name: string; value: number }[]) => {
    if (!approvingRequest || !user) return;
    setActionLoading(approvingRequest.id);
    try {
      // Insert commissions
      if (selectedCommissions.length > 0) {
        const commissionsToInsert = selectedCommissions.map((ct) => ({
          implementation_id: approvingRequest.implementation_id,
          commission_type_id: ct.id,
          commission_name: ct.name,
          commission_value: ct.value,
          created_by: user.id,
        }));
        const { error: commErr } = await supabase
          .from("implementation_commissions")
          .insert(commissionsToInsert);
        if (commErr) throw commErr;

        const totalCommission = selectedCommissions.reduce((acc, ct) => acc + ct.value, 0);
        // Update implementation status
        const { error: implErr } = await supabase
          .from("implementations")
          .update({ status: "concluida" as any, commission_value: totalCommission })
          .eq("id", approvingRequest.implementation_id);
        if (implErr) throw implErr;
      } else {
        const { error: implErr } = await supabase
          .from("implementations")
          .update({ status: "concluida" as any })
          .eq("id", approvingRequest.implementation_id);
        if (implErr) throw implErr;
      }

      // Update request status
      const { error: reqErr } = await supabase
        .from("conclusion_requests" as any)
        .update({
          status: "approved",
          approved_by: user.id,
          admin_observation: approveObservation || null,
        } as any)
        .eq("id", approvingRequest.id);
      if (reqErr) throw reqErr;

      setCommissionModalOpen(false);
      setApprovingRequest(null);
      toast({ title: "Solicitação aprovada!", description: "Implantação concluída com sucesso." });
      fetchRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao aprovar", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRejectingId(requestId);
    setRejectObservation("");
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectingId || !user || !rejectObservation.trim()) {
      toast({ variant: "destructive", title: "Erro", description: "A observação é obrigatória para rejeitar." });
      return;
    }
    setActionLoading(rejectingId);
    try {
      const { error } = await supabase
        .from("conclusion_requests" as any)
        .update({
          status: "rejected",
          approved_by: user.id,
          admin_observation: rejectObservation,
        } as any)
        .eq("id", rejectingId);
      if (error) throw error;

      setRejectModalOpen(false);
      setRejectingId(null);
      toast({ title: "Solicitação rejeitada", description: "O solicitante será notificado." });
      fetchRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao rejeitar", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="default"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case "approved":
        return <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3" />Aprovada</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejeitada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");

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
          <h1 className="text-2xl font-bold text-foreground">Solicitações de Conclusão</h1>
          <p className="text-muted-foreground">Analise e aprove ou rejeite solicitações de conclusão de implantações</p>
        </div>

        {/* Pending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pendentes ({pendingRequests.length})
            </CardTitle>
            <CardDescription>Solicitações aguardando análise</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{req.client_name}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>Solicitante: {req.requester_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveClick(req)}
                          disabled={actionLoading === req.id}
                        >
                          {actionLoading === req.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(req.id)}
                          disabled={actionLoading === req.id}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Rejeitar
                        </Button>
                      </div>
                    </div>
                    {req.requester_observation && (
                      <div className="rounded bg-muted p-3 text-sm">
                        <span className="font-medium">Observação do solicitante:</span>{" "}
                        {req.requester_observation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resolved */}
        {resolvedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Solicitações já analisadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resolvedRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{req.client_name}</span>
                        {getStatusBadge(req.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">Solicitante: {req.requester_name}</p>
                    {req.requester_observation && (
                      <p className="text-sm"><span className="font-medium">Obs. solicitante:</span> {req.requester_observation}</p>
                    )}
                    {req.admin_observation && (
                      <p className="text-sm"><span className="font-medium">Obs. admin:</span> {req.admin_observation}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>Informe o motivo da rejeição. O solicitante será notificado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Observação (obrigatória) *</Label>
              <Textarea
                value={rejectObservation}
                onChange={(e) => setRejectObservation(e.target.value)}
                placeholder="Motivo da rejeição..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!rejectObservation.trim() || actionLoading !== null}
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Observation Modal */}
      <Dialog open={approveObsModalOpen} onOpenChange={setApproveObsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar Solicitação</DialogTitle>
            <DialogDescription>Adicione uma observação opcional antes de selecionar as comissões.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea
                value={approveObservation}
                onChange={(e) => setApproveObservation(e.target.value)}
                placeholder="Observação do administrador..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveObsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleApproveConfirmObs}>Continuar para Comissões</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Commission Selection Modal */}
      {approvingRequest && (
        <CommissionSelectionModal
          open={commissionModalOpen}
          onOpenChange={(open) => {
            setCommissionModalOpen(open);
            if (!open) setApprovingRequest(null);
          }}
          implementationId={approvingRequest.implementation_id}
          onConfirm={handleCommissionConfirm}
          isConfirming={actionLoading !== null}
        />
      )}
    </DashboardLayout>
  );
}
