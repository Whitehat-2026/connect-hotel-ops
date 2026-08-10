import { fechaHora } from "@/lib/fecha";

export type Evento = {
  id: string;
  tipo: string;
  descripcion: string;
  created_at: string;
  actor?: string | null;
};

/** Línea de tiempo de trazabilidad reutilizable (incidencias y pedidos). */
export function Timeline({ eventos, cargando }: { eventos: Evento[]; cargando?: boolean }) {
  if (cargando) return <p className="text-sm text-muted-foreground">Cargando historial…</p>;
  if (eventos.length === 0)
    return <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>;

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {eventos.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[27px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          <p className="text-sm text-foreground">{e.descripcion}</p>
          <p className="text-xs text-muted-foreground">
            {fechaHora(e.created_at)}
            {e.actor ? ` · ${e.actor}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
