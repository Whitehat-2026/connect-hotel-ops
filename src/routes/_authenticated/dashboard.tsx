import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Timer,
  CheckSquare,
  Crown,
  Megaphone,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/hotel/PageHeader";
import { StatCard } from "@/components/hotel/StatCard";
import { PriorityBadge, StatusBadge } from "@/components/hotel/Badges";
import {
  listarIncidencias,
  listarComunicados,
  listarChecklists,
  listarVips,
} from "@/lib/hotel.functions";
import { resumenGobernanza } from "@/lib/gobernanza.functions";
import { fechaHora } from "@/lib/fecha";
import { useSesion } from "@/hooks/use-sesion";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Panel general · Swissôtel Quito" },
      { name: "description", content: "KPIs de incidencias, checklists, VIPs y comunicados del hotel en tiempo real." },
      { property: "og:title", content: "Panel general · Swissôtel Quito" },
      { property: "og:description", content: "Indicadores clave de la operación diaria del hotel." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { sesion, esGerencia, puedeVerVip, tieneRol } = useSesion();
  const esColaborador = !tieneRol("supervisor", "admin", "gerente");
  const miArea = sesion?.perfil?.area_id ?? null;
  const miId = sesion?.perfil?.id ?? null;
  const fnIncidencias = useServerFn(listarIncidencias);
  const fnComunicados = useServerFn(listarComunicados);
  const fnChecklists = useServerFn(listarChecklists);
  const fnVips = useServerFn(listarVips);
  const fnGobernanza = useServerFn(resumenGobernanza);

  const incidencias = useQuery({ queryKey: ["incidencias"], queryFn: () => fnIncidencias() });
  const comunicados = useQuery({ queryKey: ["comunicados"], queryFn: () => fnComunicados() });
  const checklists = useQuery({ queryKey: ["checklists"], queryFn: () => fnChecklists() });
  const vips = useQuery({ queryKey: ["vips"], queryFn: () => fnVips(), enabled: puedeVerVip });
  const gobernanza = useQuery({
    queryKey: ["gobernanza-resumen"],
    queryFn: () => fnGobernanza(),
    enabled: esGerencia,
  });

  const inc = incidencias.data ?? [];
  const abiertas = inc.filter((i) => ["abierta", "en_proceso", "escalada"].includes(i.estado));
  const conRespuesta = inc.filter((i) => i.primera_respuesta_at);
  const tiempoMedio =
    conRespuesta.length === 0
      ? 0
      : Math.round(
          conRespuesta.reduce(
            (acc, i) =>
              acc +
              (new Date(i.primera_respuesta_at as string).getTime() -
                new Date(i.created_at).getTime()) /
                60000,
            0,
          ) / conRespuesta.length,
        );

  const misIncidencias = inc.filter((i) => i.created_by === miId);
  const incidenciasMiArea = abiertas.filter(
    (i) => i.area_id === miArea || i.area_origen === miArea,
  );
  const checklistsMiArea = (checklists.data ?? []).filter(
    (c) => !miArea || c.area_id === miArea,
  );
  const itemsMiArea = checklistsMiArea.flatMap((c) => c.checklist_items ?? []);
  const completadosMiArea = itemsMiArea.filter((i) => i.completado).length;

  const items = (checklists.data ?? []).flatMap((c) => c.checklist_items ?? []);
  const completados = items.filter((i) => i.completado).length;
  const sinLeer = (comunicados.data ?? []).filter((c) => !c.leido).length;

  const porArea = Object.entries(
    inc.reduce<Record<string, number>>((acc, i) => {
      const nombre = i.areas?.codigo ?? "N/D";
      acc[nombre] = (acc[nombre] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([area, total]) => ({ area, total }));

  return (
    <div>
      <PageHeader
        titulo="Panel general"
        descripcion={
          esColaborador
            ? "Sus pendientes y los de su área para el turno en curso."
            : "Estado consolidado del hotel para el turno en curso."
        }
      />

      {esColaborador ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Incidencias abiertas de mi área" value={incidenciasMiArea.length} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" hint="Incluye escaladas y en proceso" />
          <StatCard label="Incidencias que reporté" value={misIncidencias.length} icon={<AlertTriangle className="h-4 w-4" />} hint="Registros creados por usted" />
          <StatCard label="Checklists de mi área" value={`${completadosMiArea}/${itemsMiArea.length}`} icon={<CheckSquare className="h-4 w-4" />} tone="success" hint="Tareas SOP del día" />
          <StatCard label="Comunicados sin leer" value={sinLeer} icon={<Megaphone className="h-4 w-4" />} tone="danger" hint="Pendientes de confirmación" />
        </div>
      ) : (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Incidencias abiertas" value={abiertas.length} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" hint="Incluye escaladas y en proceso" />
          <StatCard label="Tiempo medio respuesta" value={`${tiempoMedio} min`} icon={<Timer className="h-4 w-4" />} hint="Desde alta hasta primera acción" />
          <StatCard label="Checklists completados" value={`${completados}/${items.length}`} icon={<CheckSquare className="h-4 w-4" />} tone="success" hint="Tareas SOP del día" />
          <StatCard label="VIPs del día" value={puedeVerVip ? (vips.data ?? []).length : "Restringido"} icon={<Crown className="h-4 w-4" />} hint={puedeVerVip ? "Visible solo para gerencia" : "🔒 Información restringida"} />
          <StatCard label="Comunicados sin leer" value={sinLeer} icon={<Megaphone className="h-4 w-4" />} tone="danger" hint="Pendientes de confirmación" />
        </div>
  
        )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {esColaborador ? null : (
        <section className="surface p-5 lg:col-span-3">
          <h2 className="font-display text-xl">Incidencias por área</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="area" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
                <Bar dataKey="total" fill="var(--accent-gold)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        )}

        <section className="surface p-5 lg:col-span-2">
          <h2 className="font-display text-xl">Pendientes prioritarios</h2>
          <ul className="mt-4 space-y-3">
            {abiertas.slice(0, 6).map((i) => (
              <li key={i.id} className="border-b border-border/60 pb-3 last:border-0">
                <p className="text-sm">{i.titulo}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <PriorityBadge prioridad={i.prioridad} />
                  <StatusBadge estado={i.estado} />
                  <span className="text-xs text-muted-foreground">{i.areas?.nombre ?? "Sin área"}</span>
                </div>
              </li>
            ))}
            {abiertas.length === 0 ? (
              <li className="text-sm text-muted-foreground">Sin pendientes abiertos. Operación en verde.</li>
            ) : null}
          </ul>
        </section>
      </div>

      {esGerencia && gobernanza.data ? (
        <section className="surface mt-6 p-5">
          <h2 className="font-display text-xl">Gobernanza y seguridad</h2>
          <div className="gold-rule mt-2 w-16" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-2xl text-primary">{gobernanza.data.usuariosActivos}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Usuarios activos</p>
            </div>
            <div>
              <p className="text-2xl text-primary">{gobernanza.data.usuariosInactivos}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Dados de baja</p>
            </div>
            <div>
              <p className="text-2xl text-primary">{gobernanza.data.solicitudesPendientes}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Privilegios pendientes</p>
            </div>
            <div>
              <p className="text-2xl text-primary">{gobernanza.data.altasPendientes}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Altas pendientes</p>
            </div>
            <div>
              <p className="text-2xl text-primary">{gobernanza.data.incidenciasRelevantes}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Incidencias relevantes</p>
            </div>
            <div>
              <p className="text-2xl text-primary">{gobernanza.data.pedidosPendientes}</p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Pedidos en curso</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {gobernanza.data.areas.map((a) => (
              <span key={a.id} className="rounded-full border border-border px-3 py-1 text-[11px]">
                {a.codigo} · {a.nombre}
                <span className="ml-2 uppercase tracking-[0.15em] text-primary/80">{a.nivel}</span>
              </span>
            ))}
          </div>

          <ul className="mt-4 space-y-2">
            {gobernanza.data.eventosRecientes.map((e) => (
              <li key={e.id} className="border-b border-border/60 pb-2 text-sm last:border-0">
                <span className="text-foreground">{e.accion.replace(/_/g, " ")}</span>
                <span className="text-xs text-muted-foreground">
                  {" "}
                  · {e.actor_nombre ?? "—"} · {fechaHora(e.created_at)}
                </span>
              </li>
            ))}
            {gobernanza.data.eventosRecientes.length === 0 ? (
              <li className="text-sm text-muted-foreground">Sin eventos sensibles recientes.</li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
