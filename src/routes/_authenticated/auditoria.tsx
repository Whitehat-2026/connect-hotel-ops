import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { ProtectedRoute } from "@/components/hotel/ProtectedRoute";
import { listarAuditoria, registrarAccesoSensible } from "@/lib/gobernanza.functions";
import { fechaHora } from "@/lib/fecha";

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

function Auditoria() {
  const fn = useServerFn(listarAuditoria);
  const registrar = useServerFn(registrarAccesoSensible);
  const [categoria, setCategoria] = useState("todas");

  useEffect(() => {
    registrar({ data: { modulo: "auditoria" } }).catch(() => undefined);
  }, [registrar]);

  const { data = [] } = useQuery({
    queryKey: ["auditoria", categoria],
    queryFn: () => fn({ data: { categoria: categoria as never, limite: 150 } }),
  });

  const columnas: Columna<Evento>[] = [
    { key: "fecha", header: "Fecha", render: (e) => <span className="text-xs">{fechaHora(e.created_at)}</span> },
    {
      key: "actor",
      header: "Usuario",
      render: (e) => (
        <div>
          <p className="text-sm">{e.actor_nombre ?? "—"}</p>
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
          <p className="text-sm">{e.accion.replace(/_/g, " ")}</p>
          <p className="text-xs text-muted-foreground">{e.detalle ?? e.recurso ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoría",
      render: (e) => (
        <span className="text-[11px] uppercase tracking-[0.15em] text-primary/80">{e.categoria}</span>
      ),
    },
    {
      key: "resultado",
      header: "Resultado",
      render: (e) => <span className="text-xs">{e.resultado}</span>,
    },
  ];

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
            {c}
          </button>
        ))}
      </div>
      <DataTable columnas={columnas} filas={data} vacio="Sin eventos registrados para su nivel de acceso" />
    </div>
  );
}
