import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CommissionType {
  id: string;
  name: string;
  value: number;
}

interface CommissionSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  implementationId: string;
  onConfirm: (selectedCommissions: CommissionType[]) => Promise<void>;
  isConfirming: boolean;
}

export function CommissionSelectionModal({
  open,
  onOpenChange,
  implementationId,
  onConfirm,
  isConfirming,
}: CommissionSelectionModalProps) {
  const [commissionTypes, setCommissionTypes] = useState<CommissionType[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchCommissionTypes();
      setSelectedIds(new Set());
    }
  }, [open]);

  const fetchCommissionTypes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("commission_types")
        .select("id, name, value")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCommissionTypes(data || []);
    } catch (error) {
      console.error("Error fetching commission types:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const selectedCommissions = commissionTypes.filter((ct) =>
    selectedIds.has(ct.id)
  );
  const totalValue = selectedCommissions.reduce((acc, ct) => acc + ct.value, 0);

  const handleConfirm = async () => {
    await onConfirm(selectedCommissions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Vincular Comissões
          </DialogTitle>
          <DialogDescription>
            Selecione os tipos de comissão aplicáveis a esta implantação
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : commissionTypes.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum tipo de comissão ativo encontrado.
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {commissionTypes.map((ct) => (
              <div
                key={ct.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer ${
                  selectedIds.has(ct.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => toggleSelection(ct.id)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={ct.id}
                    checked={selectedIds.has(ct.id)}
                    onCheckedChange={() => toggleSelection(ct.id)}
                  />
                  <Label
                    htmlFor={ct.id}
                    className="cursor-pointer font-medium"
                  >
                    {ct.name}
                  </Label>
                </div>
                <span className="font-semibold text-primary">
                  {formatCurrency(ct.value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {selectedCommissions.length > 0 && (
          <div className="rounded-lg bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedCommissions.length} comissão(ões) selecionada(s)
              </span>
              <span className="text-lg font-bold text-primary">
                Total: {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || selectedCommissions.length === 0}
          >
            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
