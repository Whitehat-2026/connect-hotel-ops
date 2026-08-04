import type { ReactNode } from "react";

export function EmptyState({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="gold-rule w-16" />
      <p className="font-display text-lg">{titulo}</p>
      {descripcion ? (
        <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      ) : null}
      {accion}
    </div>
  );
}
