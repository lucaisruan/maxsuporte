import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NegotiatedTimeCardProps {
  negotiatedMinutes: number;
  usedMinutes: number;
  migrationMinutes?: number;
  showAlerts?: boolean;
  compact?: boolean;
}

const formatTime = (minutes: number) => {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}min`;
};

type TimeStatus = "ok" | "warning" | "exceeded";

function getTimeStatus(usedMinutes: number, negotiatedMinutes: number): TimeStatus {
  if (negotiatedMinutes <= 0) return "ok";
  const percentage = (usedMinutes / negotiatedMinutes) * 100;
  if (percentage >= 100) return "exceeded";
  if (percentage >= 80) return "warning";
  return "ok";
}

const statusColors: Record<TimeStatus, string> = {
  ok: "text-green-600",
  warning: "text-yellow-600",
  exceeded: "text-destructive",
};

const statusBgColors: Record<TimeStatus, string> = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  exceeded: "bg-destructive",
};

export function NegotiatedTimeCard({
  negotiatedMinutes,
  usedMinutes,
  migrationMinutes = 0,
  showAlerts = false,
  compact = false,
}: NegotiatedTimeCardProps) {
  // Time used excluding migration
  const effectiveUsed = usedMinutes - migrationMinutes;
  const remaining = negotiatedMinutes - effectiveUsed;
  const percentage = negotiatedMinutes > 0 ? Math.min((effectiveUsed / negotiatedMinutes) * 100, 100) : 0;
  const status = getTimeStatus(effectiveUsed, negotiatedMinutes);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className={`h-4 w-4 ${statusColors[status]}`} />
        <span className="text-muted-foreground">
          {formatTime(effectiveUsed)} / {formatTime(negotiatedMinutes)}
        </span>
        {status === "exceeded" && (
          <span className="text-destructive font-medium">+{formatTime(effectiveUsed - negotiatedMinutes)}</span>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Tempo Negociado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilizado</span>
            <span className={`font-bold ${statusColors[status]}`}>
              {Math.round(percentage)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={percentage} className={`h-3 [&>div]:${statusBgColors[status]}`} />
          </div>
        </div>

        {/* Time details */}
        <div className="grid gap-3 grid-cols-3">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Negociado</p>
            <p className="text-sm font-bold mt-1">{formatTime(negotiatedMinutes)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">Utilizado</p>
            <p className={`text-sm font-bold mt-1 ${statusColors[status]}`}>
              {formatTime(effectiveUsed)}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-xs text-muted-foreground">
              {remaining >= 0 ? "Restante" : "Excedente"}
            </p>
            <p className={`text-sm font-bold mt-1 ${remaining < 0 ? "text-destructive" : statusColors[status]}`}>
              {remaining < 0 ? "+" : ""}{formatTime(Math.abs(remaining))}
            </p>
          </div>
        </div>

        {migrationMinutes > 0 && (
          <p className="text-xs text-muted-foreground">
            * Migração de dados ({formatTime(migrationMinutes)}) não contabilizada no tempo negociado.
          </p>
        )}

        {/* Alerts */}
        {showAlerts && status === "warning" && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700">
              Atenção: o tempo limite de implantação está se aproximando.
            </AlertDescription>
          </Alert>
        )}

        {showAlerts && status === "exceeded" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O tempo negociado de implantação foi atingido.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export function NegotiatedTimeBadge({
  negotiatedMinutes,
  usedMinutes,
  migrationMinutes = 0,
}: {
  negotiatedMinutes: number;
  usedMinutes: number;
  migrationMinutes?: number;
}) {
  const effectiveUsed = usedMinutes - migrationMinutes;
  const status = getTimeStatus(effectiveUsed, negotiatedMinutes);

  const dotColors: Record<TimeStatus, string> = {
    ok: "bg-green-500",
    warning: "bg-yellow-500",
    exceeded: "bg-destructive",
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${dotColors[status]}`} />
      <span className="text-xs text-muted-foreground">
        {formatTime(effectiveUsed)}/{formatTime(negotiatedMinutes)}
      </span>
    </div>
  );
}
