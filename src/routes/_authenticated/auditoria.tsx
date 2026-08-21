import { createFileRoute } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { ProtectedRoute } from "@/components/hotel/ProtectedRoute";
import { listarAuditoria, registrarAccesoSensible } from "@/lib/gobernanza.functions";
import { fechaHora } from "@/lib/fecha";
import {
  accionAuditoria,
  categoriaAuditoria,
  nombreActor,
  recursoAuditoria,
} from "@/lib/etiquetas";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Bitácora de auditoría · Swissôtel Quito" },
      { name: "description", content: "Registro de accesos, cambios de rol y acciones administrativas del hotel." },
      { property: "og:title", content: "Bitácora de auditoría · Swissôtel Quito" },
      { property: "og:description", content: "Trazabilidad de seguridad y operaciones sensibles." },
    ],
  }),
  component: () => (
    <ProtectedRoute roles={["gerente", "admin", "supervisor"]}>
      <Auditoria />
    </ProtectedRoute>
  ),
});

type Evento = Awaited<ReturnType<typeof listarAuditoria>>[number];

const PAGINA = 50;

/** Normaliza sólo la presentación: los valores históricos no se modifican. */
function etiquetaResultado(valor: string | null): string {
  const v = (valor ?? "").trim().toLowerCase();
  if (["ok", "true", "vale", "exitoso", "éxito", "success"].includes(v)) return "Exitoso";
  if (["rechazado", "false", "error", "denegado"].includes(v)) return "Rechazado";
  if (v === "pendiente") return "Pendiente";
  return valor ?? "—";
}

function Auditoria() {
  const fn = useServerFn(listarAuditoria);
  const registrar = useServerFn(registrarAccesoSensible);
  const yaRegistrado = useRef(false);

  const [categoria, setCategoria] = useState("todas");
  const [usuario, setUsuario] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [limite, setLimite] = useState(PAGINA);

  useEffect(() => {
    if (yaRegistrado.current) return;
    yaRegistrado.current = true;
    registrar({ data: { modulo: "auditoria" } }).catch(() => undefined);
  }, [registrar]);

  // Cualquier cambio de filtro reinicia la carga incremental.
  useEffect(() => {
    setLimite(PAGINA);
  }, [categoria, usuario, desde, hasta]);

  const { data = [], isFetching } = useQuery({
    queryKey: ["auditoria", categoria, usuario, desde, hasta, limite],
    queryFn: () =>
      fn({
        data: {
          categoria: categoria as never,
          limite: Math.min(limite, 300),
          desplazamiento: 0,
          usuario: usuario.trim() || undefined,
          desde: desde || undefined,
          hasta: hasta || undefined,
        } as never,
      }),
    placeholderData: keepPreviousData,
  });

  const columnas: Columna<Evento>[] = [
    { key: "fecha", header: "Fecha", render: (e) => <span className="text-xs">{fechaHora(e.created_at)}</span> },
    {
      key: "actor",
      header: "Usuario",
      render: (e) => (
        <div>
          <p className="text-sm">{nombreActor(e.actor_nombre)}</p>
          <p className="text-xs text-muted-foreground">
            {e.actor_rol ?? "—"}
            {e.areas?.codigo ? ` · ${e.areas.codigo}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "accion",
      header: "Acción",
      render: (e) => (
        <div>
          <p className="text-sm">{accionAuditoria(e.accion)}</p>
          <p className="text-xs text-muted-foreground">{e.detalle ?? recursoAuditoria(e.recurso)}</p>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      render: (e) => (
        <span className="text-[11px] uppercase tracking-[0.15em] text-primary/80">
          {categoriaAuditoria(e.categoria)}
        </span>
      ),
    },
    {
      key: "resultado",
      header: "Resultado",
      render: (e) => <span className="text-xs">{etiquetaResultado(e.resultado)}</span>,
    },
  ];

  const hayMas = data.length >= limite && limite < 300;

  return (
    <div>
      <PageHeader
        titulo="Bitácora de auditoría"
        descripcion="Registro append-only de accesos y acciones sensibles. Cada rol visualiza únicamente los eventos que le corresponden."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["todas", "acceso", "administracion", "seguridad", "operacion", "vip"].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategoria(c)}
            className={`rounded-md border px-3 py-1 text-xs uppercase tracking-[0.12em] ${
              categoria === c ? "border-primary/60 text-primary" : "border-border text-muted-foreground"
            }`}
          >
            {categoriaAuditoria(c)}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <input
          className="field"
          placeholder="Filtrar por usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          maxLength={120}
        />
        <label className="text-xs text-muted-foreground">
          Desde
          <input className="field mt-1" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          Hasta
          <input className="field mt-1" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
      </div>

      <DataTable columnas={columnas} filas={data} vacio="Sin eventos registrados para su nivel de acceso" />

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{data.length} eventos mostrados</span>
        {hayMas ? (
          <button
            type="button"
            className="rounded-md border border-primary/40 px-3 py-1 uppercase tracking-[0.12em] text-primary"
            onClick={() => setLimite((n) => Math.min(n + PAGINA, 300))}
            disabled={isFetching}
          >
            {isFetching ? "Cargando…" : "Ver más"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
