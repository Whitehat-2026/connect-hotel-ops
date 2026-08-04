import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]";

export function StatusBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    abierta: "border-warning/40 text-warning",
    en_proceso: "border-primary/40 text-primary",
    escalada: "border-danger/40 text-danger",
    resuelta: "border-success/40 text-success",
    cerrada: "border-border text-muted-foreground",
    solicitado: "border-warning/40 text-warning",
    aprobado: "border-primary/40 text-primary",
    rechazado: "border-danger/40 text-danger",
    entregado: "border-success/40 text-success",
  };
  return (
    <span className={cn(base, map[estado] ?? "border-border text-muted-foreground")}>
      {estado.replace("_", " ")}
    </span>
  );
}

export function PriorityBadge({ prioridad }: { prioridad: string }) {
  const map: Record<string, string> = {
    baja: "border-border text-muted-foreground",
    media: "border-primary/40 text-primary",
    alta: "border-warning/50 text-warning",
    critica: "border-danger/50 text-danger",
  };
  return <span className={cn(base, map[prioridad] ?? "border-border")}>{prioridad}</span>;
}

export function AreaBadge({ nombre }: { nombre?: string | null }) {
  return (
    <span className={cn(base, "border-primary/30 text-primary/90")}>{nombre ?? "Global"}</span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "border-danger/50 text-danger",
    gerente: "border-primary/50 text-primary",
    supervisor: "border-warning/50 text-warning",
    colaborador: "border-border text-muted-foreground",
  };
  return <span className={cn(base, map[role] ?? "border-border")}>{role}</span>;
}
