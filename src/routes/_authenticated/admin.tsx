import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { RoleBadge } from "@/components/hotel/Badges";
import { ProtectedRoute } from "@/components/hotel/ProtectedRoute";
import { asignarRol, crearArea, listarUsuarios } from "@/lib/hotel.functions";
import {
  actualizarNivelArea,
  cambiarEstadoUsuario,
  listarAltas,
  listarSolicitudes,
  registrarAccesoSensible,
  resolverAlta,
  resolverPrivilegio,
  solicitarAlta,
  solicitarPrivilegio,
} from "@/lib/gobernanza.functions";
import { areaCrearSchema } from "@/lib/hotel.schemas";
import { usuarioAltaSchema } from "@/lib/gobernanza.schemas";
import { fechaHora } from "@/lib/fecha";
import { useSesion } from "@/hooks/use-sesion";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administración · Swissôtel Quito" },
      { name: "description", content: "Gestión de usuarios, roles y áreas operativas del hotel." },
      { property: "og:title", content: "Administración · Swissôtel Quito" },
      { property: "og:description", content: "Panel de administración de accesos y estructura del hotel." },
    ],
  }),
  component: () => (
    <ProtectedRoute roles={["admin", "gerente"]}>
      <Admin />
    </ProtectedRoute>
  ),
});

type Usuario = Awaited<ReturnType<typeof listarUsuarios>>[number];

function Admin() {
  const qc = useQueryClient();
  const { sesion, tieneRol } = useSesion();
  const esGerente = tieneRol("gerente");
  const listar = useServerFn(listarUsuarios);
  const rol = useServerFn(asignarRol);
  const estadoUsuario = useServerFn(cambiarEstadoUsuario);
  const area = useServerFn(crearArea);
  const alta = useServerFn(solicitarAlta);
  const altasFn = useServerFn(listarAltas);
  const resolverAltaFn = useServerFn(resolverAlta);
  const solicitar = useServerFn(solicitarPrivilegio);
  const resolver = useServerFn(resolverPrivilegio);
  const solicitudesFn = useServerFn(listarSolicitudes);
  const nivelFn = useServerFn(actualizarNivelArea);
  const registrarAcceso = useServerFn(registrarAccesoSensible);

  const [form, setForm] = useState({ nombre: "", codigo: "", descripcion: "" });
  const [nuevo, setNuevo] = useState({
    email: "",
    nombre: "",
    area_codigo: "",
    role: "colaborador",
    motivo: "",
  });

  useEffect(() => {
    registrarAcceso({ data: { modulo: "admin" } }).catch(() => undefined);
  }, [registrarAcceso]);

  const { data = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => listar() });
  const { data: solicitudes = [] } = useQuery({
    queryKey: ["solicitudes-privilegio"],
    queryFn: () => solicitudesFn(),
  });
  const { data: altas = [] } = useQuery({
    queryKey: ["solicitudes-alta"],
    queryFn: () => altasFn(),
  });

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["usuarios"] });
    qc.invalidateQueries({ queryKey: ["solicitudes-privilegio"] });
    qc.invalidateQueries({ queryKey: ["solicitudes-alta"] });
    qc.invalidateQueries({ queryKey: ["auditoria"] });
  };

  const mRol = useMutation({
    mutationFn: (input: { user_id: string; role: string }) => rol({ data: input as never }),
    onSuccess: () => {
      toast.success("Rol actualizado");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mEstado = useMutation({
    mutationFn: (input: { user_id: string; activo: boolean; motivo?: string }) =>
      estadoUsuario({ data: input }),
    onSuccess: () => {
      toast.success("Acceso actualizado");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mAlta = useMutation({
    mutationFn: (input: unknown) => alta({ data: input as never }),
    onSuccess: () => {
      toast.success("Solicitud de alta enviada a Gerencia General");
      setNuevo({ email: "", nombre: "", area_codigo: "", role: "colaborador", motivo: "" });
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mResolverAlta = useMutation({
    mutationFn: (input: { id: string; aprobar: boolean }) => resolverAltaFn({ data: input }),
    onSuccess: () => {
      toast.success("Solicitud de alta resuelta");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mSolicitud = useMutation({
    mutationFn: (input: { target_user_id: string; rol_solicitado: string; motivo: string }) =>
      solicitar({ data: input as never }),
    onSuccess: () => {
      toast.success("Solicitud enviada a Gerencia General");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mResolver = useMutation({
    mutationFn: (input: { id: string; aprobar: boolean }) => resolver({ data: input }),
    onSuccess: () => {
      toast.success("Solicitud resuelta");
      refrescar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mNivel = useMutation({
    mutationFn: (input: { area_id: string; nivel: string }) => nivelFn({ data: input as never }),
    onSuccess: () => {
      toast.success("Nivel de área actualizado");
      qc.invalidateQueries({ queryKey: ["sesion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mArea = useMutation({
    mutationFn: (input: unknown) => area({ data: input as never }),
    onSuccess: () => {
      toast.success("Área creada");
      setForm({ nombre: "", codigo: "", descripcion: "" });
      qc.invalidateQueries({ queryKey: ["sesion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columnas: Columna<Usuario>[] = [
    {
      key: "nombre",
      header: "Colaborador",
      render: (u) => (
        <div>
          <p className="font-medium">{u.nombre}</p>
          <p className="text-xs text-muted-foreground">{u.email}</p>
          {!u.activo && u.motivo_baja ? (
            <p className="text-[11px] text-muted-foreground">
              Baja: {u.motivo_baja}
              {u.desactivado_at ? ` · ${fechaHora(u.desactivado_at)}` : ""}
            </p>
          ) : null}
        </div>
      ),
    },
    { key: "area", header: "Área", render: (u) => <span className="text-xs">{u.areas?.nombre ?? "—"}</span> },
    {
      key: "rol",
      header: "Rol",
      render: (u) => (
        <div className="flex items-center gap-2">
          {u.roles.map((r) => (
            <RoleBadge key={r} role={r} />
          ))}
          <select
            className="field w-32 py-1 text-xs"
            value={u.roles[0] ?? "colaborador"}
            onChange={(e) => {
              const valor = e.target.value;
              if (valor === "admin" || valor === "gerente") {
                const motivo = window.prompt(
                  `Rol crítico "${valor}": indique el motivo de la solicitud a Gerencia General (mín. 10 caracteres).`,
                );
                if (!motivo) return;
                mSolicitud.mutate({ target_user_id: u.id, rol_solicitado: valor, motivo });
                return;
              }
              mRol.mutate({ user_id: u.id, role: valor });
            }}
          >
            {["admin", "gerente", "supervisor", "colaborador"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      ),
    },
    {
      key: "activo",
      header: "Acceso",
      render: (u) => (
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-xs hover:border-primary/50"
          onClick={() => {
            if (u.activo) {
              const motivo = window.prompt("Motivo de la baja (queda registrado en la bitácora):");
              if (!motivo) return;
              mEstado.mutate({ user_id: u.id, activo: false, motivo });
            } else {
              mEstado.mutate({ user_id: u.id, activo: true });
            }
          }}
        >
          {u.activo ? "Dar de baja" : "Reactivar"}
        </button>
      ),
    },
  ];

  function enviarArea(e: React.FormEvent) {
    e.preventDefault();
    const parsed = areaCrearSchema.safeParse({
      ...form,
      descripcion: form.descripcion || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    mArea.mutate(parsed.data);
  }

  function enviarAlta(e: React.FormEvent) {
    e.preventDefault();
    const parsed = usuarioAltaSchema.safeParse({
      ...nuevo,
      motivo: nuevo.motivo || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    mAlta.mutate(parsed.data);
  }

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");

  return (
    <div>
      <PageHeader
        titulo="Administración"
        descripcion="Control de accesos, roles y estructura de áreas del hotel. Los privilegios críticos requieren aprobación de Gerencia General."
      />

      <DataTable columnas={columnas} filas={data} vacio="Sin usuarios registrados" />

      <section className="mt-8">
        <h2 className="font-display text-2xl">Alta de cuenta autorizada</h2>
        <div className="gold-rule mt-2 w-16" />
        <p className="mt-2 text-xs text-muted-foreground">
          Sólo roles operativos. Elevar a administrador o gerente exige el flujo de aprobación.
        </p>
        <form onSubmit={enviarAlta} className="surface mt-4 grid gap-3 p-5 md:grid-cols-5">
          <input className="field" placeholder="Correo corporativo" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} maxLength={255} required />
          <input className="field" placeholder="Nombre y apellido" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={120} required />
          <select className="field" value={nuevo.area_codigo} onChange={(e) => setNuevo({ ...nuevo, area_codigo: e.target.value })} required>
            <option value="">Área…</option>
            {(sesion?.areas ?? []).map((a) => (
              <option key={a.id} value={a.codigo}>{a.codigo} · {a.nombre}</option>
            ))}
          </select>
          <select className="field" value={nuevo.role} onChange={(e) => setNuevo({ ...nuevo, role: e.target.value })}>
            <option value="colaborador">colaborador</option>
            <option value="supervisor">supervisor</option>
          </select>
          <button className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm" disabled={mAlta.isPending}>
            Registrar acceso
          </button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Solicitudes de privilegios críticos</h2>
        <div className="gold-rule mt-2 w-16" />
        <div className="surface mt-4 divide-y divide-border/60 p-5">
          {solicitudes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
          ) : (
            solicitudes.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm">
                    {s.objetivo} → <span className="text-primary">{s.rol_solicitado}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fechaHora(s.created_at)} · solicitado por {s.solicitante ?? "—"} · {s.motivo}
                  </p>
                  {s.estado !== "pendiente" ? (
                    <p className="text-xs text-muted-foreground">
                      {s.estado} por {s.aprobador ?? "Gerencia"}
                    </p>
                  ) : null}
                </div>
                {s.estado === "pendiente" && esGerente ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn-gold hover:btn-gold-hover px-3 py-1 text-xs"
                      onClick={() => mResolver.mutate({ id: s.id, aprobar: true })}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-1 text-xs"
                      onClick={() => mResolver.mutate({ id: s.id, aprobar: false })}
                    >
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {s.estado}
                  </span>
                )}
              </div>
            ))
          )}
          {pendientes.length > 0 && !esGerente ? (
            <p className="pt-3 text-xs text-muted-foreground">
              Pendientes de resolución por Gerencia General.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl">Áreas operativas</h2>
        <div className="gold-rule mt-2 w-16" />
        <div className="mt-4 flex flex-wrap gap-2">
          {(sesion?.areas ?? []).map((a) => (
            <span key={a.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
              {a.codigo} · {a.nombre}
              {esGerente ? (
                <select
                  className="bg-transparent text-[11px] text-primary"
                  value={a.nivel ?? "operativo"}
                  onChange={(e) => mNivel.mutate({ area_id: a.id, nivel: e.target.value })}
                >
                  {["operativo", "restringido", "critico", "maximo"].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] uppercase tracking-[0.15em] text-primary/80">
                  {a.nivel ?? "operativo"}
                </span>
              )}
            </span>
          ))}
        </div>
        <form onSubmit={enviarArea} className="surface mt-4 grid gap-3 p-5 md:grid-cols-4">
          <input className="field" placeholder="Nombre del área" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} maxLength={80} required />
          <input className="field" placeholder="Código (AYB)" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} maxLength={10} required />
          <input className="field" placeholder="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maxLength={300} />
          <button className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm" disabled={mArea.isPending}>
            Crear área
          </button>
        </form>
      </section>
    </div>
  );
}
