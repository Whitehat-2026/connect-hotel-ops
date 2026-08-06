import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/hotel/PageHeader";
import { DataTable, type Columna } from "@/components/hotel/DataTable";
import { RoleBadge } from "@/components/hotel/Badges";
import { ProtectedRoute } from "@/components/hotel/ProtectedRoute";
import { asignarRol, cambiarActivo, crearArea, listarUsuarios } from "@/lib/hotel.functions";
import { areaCrearSchema } from "@/lib/hotel.schemas";
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
    <ProtectedRoute roles={["admin"]}>
      <Admin />
    </ProtectedRoute>
  ),
});

type Usuario = Awaited<ReturnType<typeof listarUsuarios>>[number];

function Admin() {
  const qc = useQueryClient();
  const { sesion } = useSesion();
  const listar = useServerFn(listarUsuarios);
  const rol = useServerFn(asignarRol);
  const activo = useServerFn(cambiarActivo);
  const area = useServerFn(crearArea);
  const [form, setForm] = useState({ nombre: "", codigo: "", descripcion: "" });

  const { data = [] } = useQuery({ queryKey: ["usuarios"], queryFn: () => listar() });

  const mRol = useMutation({
    mutationFn: (input: { user_id: string; role: string }) => rol({ data: input as never }),
    onSuccess: () => {
      toast.success("Rol actualizado");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mActivo = useMutation({
    mutationFn: (input: { user_id: string; activo: boolean }) => activo({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
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
            onChange={(e) => mRol.mutate({ user_id: u.id, role: e.target.value })}
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
          onClick={() => mActivo.mutate({ user_id: u.id, activo: !u.activo })}
        >
          {u.activo ? "Desactivar" : "Activar"}
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

  return (
    <div>
      <PageHeader titulo="Administración" descripcion="Control de accesos, roles y estructura de áreas del hotel." />

      <DataTable columnas={columnas} filas={data} vacio="Sin usuarios registrados" />

      <section className="mt-8">
        <h2 className="font-display text-2xl">Áreas operativas</h2>
        <div className="gold-rule mt-2 w-16" />
        <div className="mt-4 flex flex-wrap gap-2">
          {(sesion?.areas ?? []).map((a) => (
            <span key={a.id} className="rounded-full border border-border px-3 py-1 text-xs">
              {a.codigo} · {a.nombre}
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
