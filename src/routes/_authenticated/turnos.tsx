import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/hotel/PageHeader";
import { EmptyState } from "@/components/hotel/EmptyState";
import { AreaBadge } from "@/components/hotel/Badges";
import { useSesion } from "@/hooks/use-sesion";
import { crearTurno, firmarTurno, listarTurnos } from "@/lib/hotel.functions";
import { turnoCrearSchema } from "@/lib/hotel.schemas";
import { fechaHora } from "@/lib/fecha";

export const Route = createFileRoute("/_authenticated/turnos")({
  head: () => ({
    meta: [
      { title: "Entrega de turno · Swissôtel Quito" },
      { name: "description", content: "Entrega digital de turno con pendientes, VIPs, incidencias abiertas y firma de recepción." },
      { property: "og:title", content: "Entrega de turno · Swissôtel Quito" },
      { property: "og:description", content: "Handover digital firmado entre turnos del hotel." },
    ],
  }),
  component: Turnos,
});

function Turnos() {
  const { sesion, puedeVerVip, tieneRol } = useSesion();
  const qc = useQueryClient();
  const listar = useServerFn(listarTurnos);
  const crear = useServerFn(crearTurno);
  const firmar = useServerFn(firmarTurno);
  const [form, setForm] = useState({
    turno: "Matutino",
    pendientes: "",
    vips: "",
    incidencias_abiertas: "",
    notas: "",
  });

  const pendientesValidos = form.pendientes.trim().length > 0;
  const esOperativo = tieneRol("colaborador", "supervisor") && !tieneRol("gerente", "admin");
  const miArea = sesion?.perfil?.area_id ?? null;
  const miNombre = sesion?.perfil?.nombre ?? "—";
  const nombreMiArea =
    (sesion?.areas ?? []).find((a) => a.id === miArea)?.nombre ?? "Sin área asignada";

  const { data = [] } = useQuery({ queryKey: ["turnos"], queryFn: () => listar() });

  const mCrear = useMutation({
    mutationFn: (input: unknown) => crear({ data: input as never }),
    onSuccess: () => {
      toast.success("Turno entregado");
      setForm({ turno: "Matutino", pendientes: "", vips: "", incidencias_abiertas: "", notas: "" });
      qc.invalidateQueries({ queryKey: ["turnos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mFirmar = useMutation({
    mutationFn: (input: { id: string }) => firmar({ data: input as never }),
    onSuccess: () => {
      toast.success("Recepción confirmada");
      qc.invalidateQueries({ queryKey: ["turnos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = turnoCrearSchema.safeParse({
      ...form,
      pendientes: form.pendientes,
      vips: form.vips || undefined,
      incidencias_abiertas: form.incidencias_abiertas || undefined,
      notas: form.notas || undefined,
    });
    if (!pendientesValidos) {
      toast.error("Indique los pendientes del turno antes de realizar la entrega.");
      return;
    }
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    mCrear.mutate(parsed.data);
  }

  return (
    <div>
      <PageHeader titulo="Entrega de turno" descripcion="Bitácora digital con firma de entrega y recepción." />

      {!esOperativo ? (
        <p className="surface mb-8 p-5 text-sm text-muted-foreground">
          Vista de supervisión: puede consultar todas las entregas de turno, pero la entrega y la
          recepción corresponden al personal operativo del área.
        </p>
      ) : (
      <form onSubmit={enviar} className="surface mb-8 grid gap-3 p-5 md:grid-cols-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground md:col-span-2">
          Entrega: <span className="text-foreground">{miNombre}</span> · {nombreMiArea}
        </p>
        <select className="field" value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value })}>
          {["Matutino", "Vespertino", "Nocturno"].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div>
          <textarea
            className="field w-full"
            rows={3}
            required
            aria-invalid={!pendientesValidos}
            placeholder="Pendientes del turno *"
            value={form.pendientes}
            onChange={(e) => setForm({ ...form, pendientes: e.target.value })}
            maxLength={2000}
          />
          {!pendientesValidos ? (
            <p className="mt-1 text-xs text-warning">
              Indique los pendientes del turno antes de realizar la entrega.
            </p>
          ) : null}
        </div>
        <textarea className="field" rows={3} placeholder={puedeVerVip ? "VIPs y atenciones especiales" : "Atenciones especiales del turno (sin datos identificativos de huéspedes)"} value={form.vips} onChange={(e) => setForm({ ...form, vips: e.target.value })} maxLength={2000} />
        <textarea className="field" rows={3} placeholder="Incidencias abiertas" value={form.incidencias_abiertas} onChange={(e) => setForm({ ...form, incidencias_abiertas: e.target.value })} maxLength={2000} />
        <textarea className="field" rows={3} placeholder="Notas adicionales" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} maxLength={2000} />
        <input className="field" placeholder="Firma de quien entrega (nombre completo)" value={form.firma_entrega} onChange={(e) => setForm({ ...form, firma_entrega: e.target.value })} maxLength={120} />
        <button
          className="btn-gold hover:btn-gold-hover px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          disabled={mCrear.isPending || !pendientesValidos}
        >
          {mCrear.isPending ? "Guardando…" : "Entregar turno"}
        </button>
      </form>

      {data.length === 0 ? (
        <EmptyState titulo="Sin entregas registradas" descripcion="Las entregas de turno aparecerán aquí en orden cronológico." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((t) => (
            <article key={t.id} className="surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-xl">{t.turno}</h2>
                <AreaBadge nombre={t.areas?.nombre ?? null} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {fechaHora(t.created_at)}
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                {[
                  ["Pendientes", t.pendientes],
                  ["Atenciones especiales", puedeVerVip ? t.vips : null],
                  ["Incidencias abiertas", t.incidencias_abiertas],
                  ["Notas", t.notas],
                ].map(([k, v]) =>
                  v ? (
                    <div key={k as string}>
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{k}</dt>
                      <dd className="whitespace-pre-line">{v}</dd>
                    </div>
                  ) : null,
                )}
                {t.vip_restringido ? (
                  <div>
                    <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Atenciones especiales
                    </dt>
                    <dd className="text-muted-foreground">
                      🔒 Información reservada a Gerencia
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 border-t border-border pt-4 text-sm">
                <p className="text-xs text-muted-foreground">Entrega: {t.firma_entrega ?? "—"}</p>
                {t.firma_recepcion ? (
                  <p className="mt-1 text-xs text-success">
                    Recibido por {t.firma_recepcion} ·{" "}
                    {fechaHora(t.updated_at)}
                  </p>
                ) : (
                  <div className="mt-2 flex gap-2">
                    <input
                      className="field flex-1 py-1 text-xs"
                      placeholder="Tu nombre para firmar recepción"
                      value={firmas[t.id] ?? ""}
                      onChange={(e) => setFirmas({ ...firmas, [t.id]: e.target.value })}
                      maxLength={120}
                    />
                    <button
                      type="button"
                      className="btn-gold hover:btn-gold-hover px-3 py-1 text-xs"
                      onClick={() => {
                        const firma = (firmas[t.id] ?? "").trim();
                        if (firma.length < 2) {
                          toast.error("Escribe tu nombre para firmar");
                          return;
                        }
                        mFirmar.mutate({ id: t.id, firma_recepcion: firma });
                      }}
                    >
                      Firmar
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
