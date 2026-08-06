import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/hotel/PageHeader";
import { EmptyState } from "@/components/hotel/EmptyState";
import { PriorityBadge } from "@/components/hotel/Badges";
import { ProtectedRoute } from "@/components/hotel/ProtectedRoute";
import { crearVip, listarVips } from "@/lib/hotel.functions";
import { vipCrearSchema } from "@/lib/hotel.schemas";

export const Route = createFileRoute("/_authenticated/vip")({
  head: () => ({
    meta: [
      { title: "Alertas VIP · Swissôtel Quito" },
      { name: "description", content: "Información confidencial de huéspedes VIP: preferencias, alergias y restricciones." },
      { property: "og:title", content: "Alertas VIP · Swissôtel Quito" },
      { property: "og:description", content: "Módulo restringido a dirección y gerencia del hotel." },
    ],
  }),
  component: () => (
    <ProtectedRoute roles={["admin", "gerente"]}>
      <Vip />
    </ProtectedRoute>
  ),
});

function Vip() {
  const qc = useQueryClient();
  const listar = useServerFn(listarVips);
  const crear = useServerFn(crearVip);
  const [form, setForm] = useState({
    huesped: "",
    habitacion: "",
    preferencias: "",
    alergias: "",
    restricciones: "",
    areas: "",
    prioridad: "alta",
  });

  const { data = [] } = useQuery({ queryKey: ["vips"], queryFn: () => listar() });

  const mCrear = useMutation({
    mutationFn: (input: unknown) => crear({ data: input as never }),
    onSuccess: () => {
      toast.success("Alerta VIP registrada");
      setForm({ huesped: "", habitacion: "", preferencias: "", alergias: "", restricciones: "", areas: "", prioridad: "alta" });
      qc.invalidateQueries({ queryKey: ["vips"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = vipCrearSchema.safeParse({
      huesped: form.huesped,
      habitacion: form.habitacion || undefined,
      preferencias: form.preferencias || undefined,
      alergias: form.alergias || undefined,
      restricciones: form.restricciones || undefined,
      prioridad: form.prioridad,
      areas_involucradas: form.areas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
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
        titulo="Alertas VIP"
        descripcion="Información sensible de huéspedes distinguidos. Uso exclusivo de dirección y gerencia."
        accion={
          <span className="inline-flex items-center gap-2 rounded-md border border-danger/40 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-danger">
            <ShieldAlert className="h-3.5 w-3.5" /> Confidencial
          </span>
        }
      />

      <form onSubmit={enviar} className="surface mb-8 grid gap-3 p-5 md:grid-cols-3">
        <input className="field" placeholder="Nombre del huésped" value={form.huesped} onChange={(e) => setForm({ ...form, huesped: e.target.value })} maxLength={120} required />
        <input className="field" placeholder="Habitación / suite" value={form.habitacion} onChange={(e) => setForm({ ...form, habitacion: e.target.value })} maxLength={40} />
        <select className="field" value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
          {["media", "alta", "critica"].map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <textarea className="field" rows={2} placeholder="Preferencias" value={form.preferencias} onChange={(e) => setForm({ ...form, preferencias: e.target.value })} maxLength={1000} />
        <textarea className="field" rows={2} placeholder="Alergias" value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} maxLength={500} />
        <textarea className="field" rows={2} placeholder="Restricciones" value={form.restricciones} onChange={(e) => setForm({ ...form, restricciones: e.target.value })} maxLength={500} />
        <input className="field md:col-span-2" placeholder="Áreas involucradas (AYB, HK, REC)" value={form.areas} onChange={(e) => setForm({ ...form, areas: e.target.value })} />
        <button className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm" disabled={mCrear.isPending}>
          Registrar VIP
        </button>
      </form>

      {data.length === 0 ? (
        <EmptyState titulo="Sin alertas VIP activas" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((v) => (
            <article key={v.id} className="surface p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl">{v.huesped}</h2>
                <PriorityBadge prioridad={v.prioridad} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Habitación {v.habitacion ?? "por asignar"}
                {v.llegada ? ` · llegada ${new Date(v.llegada).toLocaleDateString("es-MX")}` : ""}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ["Preferencias", v.preferencias],
                  ["Alergias", v.alergias],
                  ["Restricciones", v.restricciones],
                ].map(([k, val]) =>
                  val ? (
                    <div key={k as string}>
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
                      <dd>{val}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
              {(v.areas_involucradas ?? []).length > 0 ? (
                <p className="mt-4 flex flex-wrap gap-1">
                  {(v.areas_involucradas ?? []).map((a) => (
                    <span key={a} className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-primary">
                      {a}
                    </span>
                  ))}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
