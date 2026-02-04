import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CommissionType {
  id: string;
  name: string;
  description: string | null;
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CommissionTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commissionType: CommissionType | null;
  onSave: (data: { name: string; description: string; value: number; is_active: boolean }) => Promise<void>;
  isSaving: boolean;
}

export function CommissionTypeForm({
  open,
  onOpenChange,
  commissionType,
  onSave,
  isSaving,
}: CommissionTypeFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (commissionType) {
      setName(commissionType.name);
      setDescription(commissionType.description || "");
      setValue(commissionType.value.toString());
      setIsActive(commissionType.is_active);
    } else {
      setName("");
      setDescription("");
      setValue("");
      setIsActive(true);
    }
  }, [commissionType, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      description: description.trim(),
      value: parseFloat(value) || 0,
      is_active: isActive,
    });
  };

  const isEditing = !!commissionType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Modo de Implantação" : "Novo Modo de Implantação"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altere os dados do modo de implantação"
              : "Crie um novo modo de implantação com sua comissão"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Modo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Implantação Premium"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Comissão (R$) *</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              required
              className="text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do modo de implantação..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Status</Label>
              <p className="text-xs text-muted-foreground">
                Modos inativos não aparecem para novas implantações
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving || !name.trim() || !value}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
