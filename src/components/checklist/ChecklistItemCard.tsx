import { useState, useEffect, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  time_spent_minutes: number;
  observations: string | null;
  order_index: number;
}

interface ChecklistItemCardProps {
  item: ChecklistItem;
  isImplantador: boolean;
  isSaving: boolean;
  onUpdate: (
    itemId: string,
    field: "is_completed" | "time_spent_minutes" | "observations",
    value: boolean | number | string
  ) => Promise<void>;
  formatTime: (minutes: number) => string;
}

export function ChecklistItemCard({
  item,
  isImplantador,
  isSaving,
  onUpdate,
  formatTime,
}: ChecklistItemCardProps) {
  // Local state for controlled inputs - prevents rerender on each keystroke
  const [localObservations, setLocalObservations] = useState(item.observations || "");
  const [localTimeSpent, setLocalTimeSpent] = useState(item.time_spent_minutes.toString());

  // Sync local state when item changes from external source
  useEffect(() => {
    setLocalObservations(item.observations || "");
    setLocalTimeSpent(item.time_spent_minutes.toString());
  }, [item.observations, item.time_spent_minutes]);

  const handleObservationsBlur = useCallback(() => {
    if (localObservations !== (item.observations || "")) {
      onUpdate(item.id, "observations", localObservations);
    }
  }, [item.id, item.observations, localObservations, onUpdate]);

  const handleTimeSpentBlur = useCallback(() => {
    const newValue = parseInt(localTimeSpent) || 0;
    if (newValue !== item.time_spent_minutes) {
      onUpdate(item.id, "time_spent_minutes", newValue);
    }
  }, [item.id, item.time_spent_minutes, localTimeSpent, onUpdate]);

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start gap-4">
        <Checkbox
          checked={item.is_completed}
          disabled={!isImplantador || isSaving}
          onCheckedChange={(checked) =>
            onUpdate(item.id, "is_completed", !!checked)
          }
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              )}
            </div>
            {isSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>
          {isImplantador && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Tempo gasto (minutos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={localTimeSpent}
                  onChange={(e) => setLocalTimeSpent(e.target.value)}
                  onBlur={handleTimeSpentBlur}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Input
                  value={localObservations}
                  onChange={(e) => setLocalObservations(e.target.value)}
                  onBlur={handleObservationsBlur}
                  placeholder="Adicionar observação..."
                  className="h-8"
                />
              </div>
            </div>
          )}
          {!isImplantador && item.time_spent_minutes > 0 && (
            <p className="text-sm text-muted-foreground">
              Tempo: {formatTime(item.time_spent_minutes)}
              {item.observations && ` • ${item.observations}`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
