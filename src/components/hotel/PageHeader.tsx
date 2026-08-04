import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{titulo}</h1>
        {descripcion ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descripcion}</p>
        ) : null}
        <div className="gold-rule mt-3 w-24" />
      </div>
      {accion}
    </header>
  );
}
