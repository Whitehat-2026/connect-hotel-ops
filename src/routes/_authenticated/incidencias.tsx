import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { PriorityBadge, StatusBadge } from "@/components/hotel/Badges";
import { Timeline } from "@/components/hotel/Timeline";
import { useSesion } from "@/hooks/use-sesion";
import { fechaHora } from "@/lib/fecha";
import {
  actualizarIncidencia,
  crearIncidencia,
  listarEventosIncidencia,
  listarIncidencias,
} from "@/lib/hotel.functions";
import { incidenciaCrearSchema } from "@/lib/hotel.schemas";


export const Route = createFileRoute("/_authenticated/incidencias")({
  head: () => ({
    meta: [
      { title: "Incidencias operativas · Swissôtel Quito" },
      { name: "description", content: "Registro, seguimiento y escalación de incidencias por área con prioridad y estado." },
      { property: "og:title", content: "Incidencias operativas · Swissôtel Quito" },
      { property: "og:description", content: "Seguimiento trazable de incidencias del hotel." },
    ],
  }),
  component: Incidencias,
});

type Fila = Awaited<ReturnType<typeof listarIncidencias>>[number];

function Incidencias() {
  const { sesion, tieneRol } = useSesion();
  const qc = useQueryClient();
  const listar = useServerFn(listarIncidencias);
  const crear = useServerFn(crearIncidencia);
  const actualizar = useServerFn(actualizarIncidencia);

  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [detalle, setDetalle] = useState<Fila | null>(null);
  const [form, setForm] = useState({ titulo: "", descripcion: "", area_id: "", ubicacion: "", prioridad: "media" });

  const { data = [] } = useQuery({ queryKey: ["incidencias"], queryFn: () => listar() });

  const eventosFn = useServerFn(listarEventosIncidencia);
  const { data: eventos = [], isLoading: cargandoEventos } = useQuery({
    queryKey: ["incidencia-eventos", detalle?.id],
    queryFn: () => eventosFn({ data: { id: detalle!.id } }),
    enabled: Boolean(detalle),
  });

  const mCrear = useMutation({
    mutationFn: (input: unknown) => crear({ data: input as never }),
    onSuccess: () => {
      toast.success("Incidencia registrada");
      setForm({ titulo: "", descripcion: "", area_id: "", ubicacion: "", prioridad: "media" });
      qc.invalidateQueries({ queryKey: ["incidencias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mEstado = useMutation({
    mutationFn: (input: { id: string; estado: string }) => actualizar({ data: input as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidencias"] });
      qc.invalidateQueries({ queryKey: ["incidencia-eventos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filas = data.filter((i) => filtroEstado === "todas" || i.estado === filtroEstado);

  const columnas: Columna<Fila>[] = [
    {
      key: "titulo",
      header: "Incidencia",
      render: (r) => (
        <div>
          <p className="font-medium">{r.titulo}</p>
          <p className="text-xs text-muted-foreground">{r.ubicacion ?? "Sin ubicación"}</p>
        </div>
      ),
    },
    {
      key: "origen",
      header: "Área origen",
      render: (r) => <span className="text-xs">{r.origen?.nombre ?? "No registrada"}</span>,
    },
    {
      key: "responsable",
      header: "Área responsable",
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs">
          <ArrowRight className="h-3 w-3 text-primary" aria-hidden />
          {r.areas?.nombre ?? "Sin asignar"}
        </span>
      ),
    },
    { key: "prioridad", header: "Prioridad", render: (r) => <PriorityBadge prioridad={r.prioridad} /> },
    { key: "estado", header: "Estado", render: (r) => <StatusBadge estado={r.estado} /> },
    {
      key: "fecha",
      header: "Fecha / hora",
      render: (r) => <span className="text-xs text-muted-foreground">{fechaHora(r.created_at)}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <div className="flex flex-col gap-2">
          <select
            className="field w-40 py-1 text-xs"
            value={r.estado}
            onChange={(e) => mEstado.mutate({ id: r.id, estado: e.target.value })}
          >
            {["abierta", "en_proceso", "escalada", "resuelta", "cerrada"].map((e) => (
              <option key={e} value={e}>
                {e.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border border-primary/40 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-primary"
            onClick={() => setDetalle(r)}
          >
            Ver detalle
          </button>
        </div>
      ),
    },
  ];


  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = incidenciaCrearSchema.safeParse({
      ...form,
      descripcion: form.descripcion || undefined,
      ubicacion: form.ubicacion || undefined,
      area_id: form.area_id || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    mCrear.mutate(parsed.data);
  }

  return (
    <div>
      <PageHeader
        titulo="Incidencias"
        descripcion="Reporte inmediato con área responsable, prioridad y estado de resolución."
        accion={
          <select className="field w-48" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todas">Todas</option>
            {["abierta", "en_proceso", "escalada", "resuelta", "cerrada"].map((e) => (
              <option key={e} value={e}>
                {e.replace("_", " ")}
              </option>
            ))}
          </select>
        }
      />

      {tieneRol("admin", "gerente", "supervisor", "colaborador") ? (
        <form onSubmit={enviar} className="surface mb-8 grid gap-3 p-5 md:grid-cols-5">
          <input className="field md:col-span-2" placeholder="Título de la incidencia" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={140} required />
          <input className="field" placeholder="Ubicación (hab. 812, cocina…)" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} maxLength={120} />
          <select className="field" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Área responsable</option>
            {(sesion?.areas ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <select className="field" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
            {["baja", "media", "alta", "critica"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <textarea className="field md:col-span-4" rows={2} placeholder="Descripción y contexto" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maxLength={2000} />
          <button className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm" disabled={mCrear.isPending}>
            {mCrear.isPending ? "Registrando…" : "Registrar"}
          </button>
        </form>
      ) : null}

      <DataTable columnas={columnas} filas={filas} vacio="Sin incidencias registradas" />

      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true">
          <div className="surface max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">{detalle.titulo}</h2>
                <p className="text-sm text-muted-foreground">{detalle.descripcion ?? "Sin descripción"}</p>
              </div>
              <button type="button" className="text-sm text-muted-foreground hover:text-primary" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Área que reporta</dt>
                <dd>{detalle.origen?.nombre ?? "No registrada"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Área responsable</dt>
                <dd>{detalle.areas?.nombre ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Ubicación</dt>
                <dd>{detalle.ubicacion ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Alta</dt>
                <dd>{fechaHora(detalle.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Primera respuesta</dt>
                <dd>{fechaHora(detalle.primera_respuesta_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Resolución</dt>
                <dd>{fechaHora(detalle.resuelta_at)}</dd>
              </div>
            </dl>

            <h3 className="mt-6 font-display text-lg">Trazabilidad</h3>
            <div className="mt-3">
              <Timeline eventos={eventos} cargando={cargandoEventos} />
            </div>
          </div>
        </div>
      ) : null}
    </div>

  );
}
