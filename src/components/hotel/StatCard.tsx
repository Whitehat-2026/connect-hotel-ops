import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "gold" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    gold: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {icon ? <span className={cn("opacity-80", toneClass)}>{icon}</span> : null}
      </div>
      <p className={cn("mt-3 font-display text-4xl leading-none", toneClass)}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
