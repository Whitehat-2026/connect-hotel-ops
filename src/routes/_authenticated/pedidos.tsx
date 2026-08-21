import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { PriorityBadge, StatusBadge } from "@/components/hotel/Badges";
import { Timeline } from "@/components/hotel/Timeline";
import { useSesion } from "@/hooks/use-sesion";
import { fechaHora } from "@/lib/fecha";
import {
  cambiarEstadoPedido,
  crearPedido,
  listarEventosPedido,
  listarPedidos,
} from "@/lib/hotel.functions";
import { pedidoCrearSchema } from "@/lib/hotel.schemas";


export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos internos · Swissôtel Quito" },
      { name: "description", content: "Solicitudes entre áreas con flujo de aprobación, seguimiento y entrega." },
      { property: "og:title", content: "Pedidos internos · Swissôtel Quito" },
      { property: "og:description", content: "Flujo de aprobación de requisiciones internas del hotel." },
    ],
  }),
  component: Pedidos,
});

type Fila = Awaited<ReturnType<typeof listarPedidos>>[number];

function Pedidos() {
  const { sesion, esGerencia, tieneRol } = useSesion();
  const puedeGestionar = tieneRol("supervisor", "admin", "gerente");
  const qc = useQueryClient();
  const listar = useServerFn(listarPedidos);
  const crear = useServerFn(crearPedido);
  const cambiar = useServerFn(cambiarEstadoPedido);
  const [form, setForm] = useState({ titulo: "", detalle: "", area_solicitante: "", area_destino: "", prioridad: "media" });
  const [detalle, setDetalle] = useState<Fila | null>(null);

  const { data = [] } = useQuery({ queryKey: ["pedidos"], queryFn: () => listar() });

  const eventosFn = useServerFn(listarEventosPedido);
  const { data: eventos = [], isLoading: cargandoEventos } = useQuery({
    queryKey: ["pedido-eventos", detalle?.id],
    queryFn: () => eventosFn({ data: { id: detalle!.id } }),
    enabled: Boolean(detalle),
  });

  const mCrear = useMutation({
    mutationFn: (input: unknown) => crear({ data: input as never }),
    onSuccess: () => {
      toast.success("Pedido enviado");
      setForm({ titulo: "", detalle: "", area_solicitante: "", area_destino: "", prioridad: "media" });
      qc.invalidateQueries({ queryKey: ["pedidos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mEstado = useMutation({
    mutationFn: (input: { id: string; estado: string }) => cambiar({ data: input as never }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pedidos"] });
      qc.invalidateQueries({ queryKey: ["pedido-eventos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Solo los pedidos de prioridad alta o crítica requieren visto bueno de gerencia. */
  const requiereAprobacion = (r: Fila) => r.prioridad === "alta" || r.prioridad === "critica";

  function etiquetaAprobacion(r: Fila) {
    if (!requiereAprobacion(r)) return { texto: "No requiere aprobación", clase: "text-muted-foreground" };
    if (r.estado === "rechazado") return { texto: "Rechazado por Gerencia", clase: "text-danger" };
    if (r.aprobado_por) return { texto: "Aprobado por Gerencia", clase: "text-success" };
    return { texto: "Pendiente de aprobación", clase: "text-warning" };
  }

  /** Estados disponibles: los operativos circulan directo; los de alta prioridad pasan por gerencia. */
  function estadosDisponibles(r: Fila) {
    if (!puedeGestionar) return [] as string[];
    const operativos = ["solicitado", "en_proceso", "entregado", "cerrado"];
    if (esGerencia) return ["solicitado", "aprobado", "rechazado", "en_proceso", "entregado", "cerrado"];
    if (requiereAprobacion(r) && !r.aprobado_por) return [];
    return operativos;
  }

  const columnas: Columna<Fila>[] = [
    {
      key: "titulo",
      header: "Pedido",
      render: (r) => (
        <div>
          <p className="font-medium">{r.titulo}</p>
          <p className="text-xs text-muted-foreground">{r.detalle ?? "Sin detalle"}</p>
        </div>
      ),
    },
    {
      key: "ruta",
      header: "Ruta",
      render: (r) => (
        <span className="text-xs">
          {r.solicitante?.codigo ?? "—"} → {r.destino?.codigo ?? "—"}
        </span>
      ),
    },
    { key: "prioridad", header: "Prioridad", render: (r) => <PriorityBadge prioridad={r.prioridad} /> },
    { key: "estado", header: "Estado", render: (r) => <StatusBadge estado={r.estado} /> },
    {
      key: "aprobacion",
      header: "Aprobación",
      render: (r) => {
        const e = etiquetaAprobacion(r);
        return <span className={`text-xs ${e.clase}`}>{e.texto}</span>;
      },
    },
    {
      key: "fecha",
      header: "Fecha / hora",
      render: (r) => <span className="text-xs text-muted-foreground">{fechaHora(r.created_at)}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => {
        const estados = estadosDisponibles(r);
        return (
          <div className="flex flex-col gap-2">
            {estados.length > 0 ? (
              <select
                className="field w-36 py-1 text-xs"
                value={estados.includes(r.estado) ? r.estado : ""}
                onChange={(e) => mEstado.mutate({ id: r.id, estado: e.target.value })}
              >
                {!estados.includes(r.estado) ? <option value="">{r.estado.replace("_", " ")}</option> : null}
                {estados.map((e) => (
                  <option key={e} value={e}>{e.replace("_", " ")}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-muted-foreground">
                {puedeGestionar ? "Esperando gerencia" : "Gestión a cargo de Supervisión"}
              </span>
            )}
            <button
              type="button"
              className="rounded-md border border-primary/40 px-2 py-1 text-[11px] uppercase tracking-[0.1em] text-primary"
              onClick={() => setDetalle(r)}
            >
              Ver detalle
            </button>
          </div>
        );
      },
    },
  ];


  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = pedidoCrearSchema.safeParse({
      ...form,
      detalle: form.detalle || undefined,
      area_solicitante: form.area_solicitante || null,
      area_destino: form.area_destino || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    mCrear.mutate(parsed.data);
  }

  return (
    <div>
      <PageHeader titulo="Pedidos internos" descripcion="Solicite recursos a otras áreas y siga su avance. La aprobación y el cambio de estado corresponden a Supervisión y Gerencia." />

      <form onSubmit={enviar} className="surface mb-8 grid gap-3 p-5 md:grid-cols-4">
        <input className="field md:col-span-2" placeholder="Qué se solicita" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} maxLength={140} required />
        <select className="field" value={form.area_solicitante} onChange={(e) => setForm({ ...form, area_solicitante: e.target.value })}>
          <option value="">Área solicitante</option>
          {(sesion?.areas ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <select className="field" value={form.area_destino} onChange={(e) => setForm({ ...form, area_destino: e.target.value })}>
          <option value="">Área destino</option>
          {(sesion?.areas ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <textarea className="field md:col-span-3" rows={2} placeholder="Detalle, cantidades y urgencia" value={form.detalle} onChange={(e) => setForm({ ...form, detalle: e.target.value })} maxLength={2000} />
        <select className="field" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
          {["baja", "media", "alta", "critica"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm md:col-span-4" disabled={mCrear.isPending}>
          Enviar pedido
        </button>
      </form>

      <DataTable columnas={columnas} filas={data} vacio="Sin pedidos internos" />

      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true">
          <div className="surface max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl">{detalle.titulo}</h2>
                <p className="text-sm text-muted-foreground">{detalle.detalle ?? "Sin detalle"}</p>
              </div>
              <button type="button" className="text-sm text-muted-foreground hover:text-primary" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>

            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Área solicitante</dt>
                <dd>{detalle.solicitante?.nombre ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Área destino</dt>
                <dd>{detalle.destino?.nombre ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Solicitado</dt>
                <dd>{fechaHora(detalle.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">Aprobación</dt>
                <dd>{etiquetaAprobacion(detalle).texto}</dd>
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
