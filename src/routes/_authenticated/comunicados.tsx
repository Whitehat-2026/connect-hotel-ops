import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Lock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/hotel/PageHeader";
import { EmptyState } from "@/components/hotel/EmptyState";
import { AreaBadge, PriorityBadge } from "@/components/hotel/Badges";
import { useSesion } from "@/hooks/use-sesion";
import { fechaHora } from "@/lib/fecha";
import { crearComunicado, listarComunicados, listarLecturas, marcarLeido } from "@/lib/hotel.functions";
import { comunicadoCrearSchema } from "@/lib/hotel.schemas";

export const Route = createFileRoute("/_authenticated/comunicados")({
  head: () => ({
    meta: [
      { title: "Comunicados internos · Swissôtel Quito" },
      { name: "description", content: "Comunicados oficiales con confirmación de lectura y niveles de confidencialidad." },
      { property: "og:title", content: "Comunicados internos · Swissôtel Quito" },
      { property: "og:description", content: "Canal oficial de avisos del hotel con acuse de lectura." },
    ],
  }),
  component: Comunicados,
});

function Comunicados() {
  const { sesion, esGerencia } = useSesion();
  const qc = useQueryClient();
  const listar = useServerFn(listarComunicados);
  const crear = useServerFn(crearComunicado);
  const leer = useServerFn(marcarLeido);
  const [form, setForm] = useState({ titulo: "", cuerpo: "", area_id: "", confidencialidad: "interno", prioridad: "media" });

  const { data = [] } = useQuery({ queryKey: ["comunicados"], queryFn: () => listar() });

  const [lecturasDe, setLecturasDe] = useState<string | null>(null);
  const lecturasFn = useServerFn(listarLecturas);
  const { data: lecturas = [] } = useQuery({
    queryKey: ["comunicado-lecturas", lecturasDe],
    queryFn: () => lecturasFn({ data: { id: lecturasDe! } }),
    enabled: Boolean(lecturasDe) && esGerencia,
  });

  const mCrear = useMutation({
    mutationFn: (input: unknown) => crear({ data: input as never }),
    onSuccess: () => {
      toast.success("Comunicado publicado");
      setForm({ titulo: "", cuerpo: "", area_id: "", confidencialidad: "interno", prioridad: "media" });
      qc.invalidateQueries({ queryKey: ["comunicados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mLeer = useMutation({
    mutationFn: (id: string) => leer({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comunicados"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = comunicadoCrearSchema.safeParse({ ...form, area_id: form.area_id || null });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    mCrear.mutate(parsed.data);
  }

  return (
    <div>
      <PageHeader titulo="Comunicados" descripcion="Avisos oficiales con acuse de lectura por colaborador." />

      {esGerencia ? (
        <form onSubmit={enviar} className="surface mb-8 grid gap-3 p-5 md:grid-cols-3">
          <input className="field md:col-span-3" placeholder="Título del comunicado" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={140} required />
          <textarea className="field md:col-span-3" rows={4} placeholder="Cuerpo del mensaje" value={form.cuerpo} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} maxLength={4000} required />
          <select className="field" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Todas las áreas</option>
            {(sesion?.areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          <select className="field" value={form.confidencialidad} onChange={(e) => setForm({ ...form, confidencialidad: e.target.value })}>
            <option value="interno">Interno</option>
            <option value="restringido">Restringido (gerencia)</option>
          </select>
          <select className="field" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
            {["baja", "media", "alta", "critica"].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm md:col-span-3" disabled={mCrear.isPending}>
            Publicar comunicado
          </button>
        </form>
      ) : null}

      {data.length === 0 ? (
        <EmptyState titulo="Sin comunicados" descripcion="Los avisos publicados por gerencia aparecerán aquí." />
      ) : (
        <div className="space-y-4">
          {data.map((c) => (
            <article key={c.id} className="surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">{c.titulo}</h2>
                <div className="flex items-center gap-2">
                  {c.confidencialidad === "restringido" ? (
                    <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-danger">
                      <Lock className="h-3 w-3" /> Restringido
                    </span>
                  ) : null}
                  <PriorityBadge prioridad={c.prioridad} />
                  <AreaBadge nombre={c.areas?.nombre ?? null} />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{c.cuerpo}</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">{fechaHora(c.created_at)}</span>
                <div className="flex items-center gap-3">
                  {esGerencia ? (
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.1em] text-primary"
                      onClick={() => setLecturasDe(lecturasDe === c.id ? null : c.id)}
                    >
                      {lecturasDe === c.id ? "Ocultar acuses" : "Ver acuses de lectura"}
                    </button>
                  ) : null}
                  {c.leido ? (
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" /> ✓ Leído
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn-gold hover:btn-gold-hover px-3 py-1.5 text-xs"
                      onClick={() => mLeer.mutate(c.id)}
                    >
                      Confirmar lectura
                    </button>
                  )}
                </div>
              </div>
              {esGerencia && lecturasDe === c.id ? (
                <ul className="mt-3 space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  {lecturas.length === 0 ? (
                    <li>Aún nadie ha confirmado la lectura.</li>
                  ) : (
                    lecturas.map((l) => (
                      <li key={l.user_id}>
                        ✓ {l.nombre} · {fechaHora(l.leido_at)}
                      </li>
                    ))
                  )}
                </ul>
              ) : null}

            </article>
          ))}
        </div>
      )}
    </div>
  );
}
