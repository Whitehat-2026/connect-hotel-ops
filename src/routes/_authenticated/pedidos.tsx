import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { PriorityBadge, StatusBadge } from "@/components/hotel/Badges";
import { useSesion } from "@/hooks/use-sesion";
import { cambiarEstadoPedido, crearPedido, listarPedidos } from "@/lib/hotel.functions";
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
  const { sesion, esGerencia } = useSesion();
  const qc = useQueryClient();
  const listar = useServerFn(listarPedidos);
  const crear = useServerFn(crearPedido);
  const cambiar = useServerFn(cambiarEstadoPedido);
  const [form, setForm] = useState({ titulo: "", detalle: "", area_solicitante: "", area_destino: "", prioridad: "media" });

  const { data = [] } = useQuery({ queryKey: ["pedidos"], queryFn: () => listar() });

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pedidos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

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
      key: "acciones",
      header: "Aprobación",
      render: (r) =>
        esGerencia ? (
          <select
            className="field w-36 py-1 text-xs"
            value={r.estado}
            onChange={(e) => mEstado.mutate({ id: r.id, estado: e.target.value })}
          >
            {["solicitado", "aprobado", "rechazado", "en_proceso", "entregado", "cerrado"].map((e) => (
              <option key={e} value={e}>{e.replace("_", " ")}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-muted-foreground">Requiere gerencia</span>
        ),
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
      <PageHeader titulo="Pedidos internos" descripcion="Requisiciones entre áreas con aprobación de gerencia y trazabilidad de entrega." />

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
    </div>
  );
}
