import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/hotel/PageHeader";
import { EmptyState } from "@/components/hotel/EmptyState";
import { AreaBadge } from "@/components/hotel/Badges";
import { alternarItem, listarChecklists } from "@/lib/hotel.functions";

export const Route = createFileRoute("/_authenticated/checklists")({
  head: () => ({
    meta: [
      { title: "Checklists y SOPs · Palacio Aurum" },
      { name: "description", content: "Listas de verificación por área y turno con seguimiento de cumplimiento de estándares." },
      { property: "og:title", content: "Checklists y SOPs · Palacio Aurum" },
      { property: "og:description", content: "Cumplimiento de procedimientos operativos estándar del hotel." },
    ],
  }),
  component: Checklists,
});

function Checklists() {
  const qc = useQueryClient();
  const listar = useServerFn(listarChecklists);
  const alternar = useServerFn(alternarItem);

  const { data = [] } = useQuery({ queryKey: ["checklists"], queryFn: () => listar() });

  const mToggle = useMutation({
    mutationFn: (input: { id: string; completado: boolean }) => alternar({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklists"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader titulo="Checklists operativos" descripcion="Procedimientos estándar por área y turno con evidencia de cumplimiento." />

      {data.length === 0 ? (
        <EmptyState titulo="Sin checklists asignados" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((c) => {
            const items = c.checklist_items ?? [];
            const hechos = items.filter((i) => i.completado).length;
            const pct = items.length ? Math.round((hechos / items.length) * 100) : 0;
            return (
              <article key={c.id} className="surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl">{c.nombre}</h2>
                  <AreaBadge nombre={c.areas?.nombre ?? null} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.turno} · {new Date(c.fecha).toLocaleDateString("es-MX")}
                </p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{hechos}/{items.length} tareas · {pct}%</p>
                <ul className="mt-4 space-y-2">
                  {items
                    .slice()
                    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                    .map((i) => (
                      <li key={i.id} className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-[var(--accent-gold)]"
                          checked={i.completado}
                          onChange={(e) => mToggle.mutate({ id: i.id, completado: e.target.checked })}
                        />
                        <span className={i.completado ? "text-sm text-muted-foreground line-through" : "text-sm"}>
                          {i.descripcion}
                        </span>
                      </li>
                    ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
