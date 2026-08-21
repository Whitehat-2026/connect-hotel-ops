import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/hotel/PageHeader";
import { StatCard } from "@/components/hotel/StatCard";
import { ProtectedRoute } from "@/components/hotel/ProtectedRoute";
import { listarIncidencias, listarPedidos, listarComunicados } from "@/lib/hotel.functions";

export const Route = createFileRoute("/_authenticated/estrategia")({
  head: () => ({
    meta: [
      { title: "Estrategia y análisis · Swissôtel Quito" },
      { name: "description", content: "Análisis de tendencias operativas, cuellos de botella y adopción de comunicados para dirección." },
      { property: "og:title", content: "Estrategia y análisis · Swissôtel Quito" },
      { property: "og:description", content: "Panel analítico para dirección y gerencia del hotel." },
    ],
  }),
  component: () => (
    <ProtectedRoute roles={["admin", "gerente"]}>
      <Estrategia />
    </ProtectedRoute>
  ),
});

const COLORS = ["var(--accent-gold)", "oklch(0.62 0.13 150)", "oklch(0.72 0.15 70)", "oklch(0.62 0.2 25)"];

function Estrategia() {
  const fnInc = useServerFn(listarIncidencias);
  const fnPed = useServerFn(listarPedidos);
  const fnCom = useServerFn(listarComunicados);

  const inc = useQuery({ queryKey: ["incidencias"], queryFn: () => fnInc() });
  const ped = useQuery({ queryKey: ["pedidos"], queryFn: () => fnPed() });
  const com = useQuery({ queryKey: ["comunicados"], queryFn: () => fnCom() });

  const incidencias = inc.data ?? [];
  const pedidos = ped.data ?? [];
  const comunicados = com.data ?? [];

  /**
   * Serie diaria de los últimos 14 días en orden cronológico ascendente.
   * Etiqueta fija DD/MM para evitar formatos locales o traducciones del navegador.
   */
  const porDia = (() => {
    const dias: { dia: string; total: number }[] = [];
    const hoy = new Date();
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const clave = d.toISOString().slice(0, 10);
      const etiqueta = `${clave.slice(8, 10)}/${clave.slice(5, 7)}`;
      dias.push({
        dia: etiqueta,
        total: incidencias.filter((x) => (x.created_at ?? "").slice(0, 10) === clave).length,
      });
    }
    return dias;
  })();

  const porPrioridad = ["baja", "media", "alta", "critica"].map((p) => ({
    name: p,
    value: incidencias.filter((i) => i.prioridad === p).length,
  }));

  const resueltas = incidencias.filter((i) => ["resuelta", "cerrada"].includes(i.estado)).length;
  const tasa = incidencias.length ? Math.round((resueltas / incidencias.length) * 100) : 0;
  const adopcion = comunicados.length
    ? Math.round((comunicados.filter((c) => c.leido).length / comunicados.length) * 100)
    : 0;
  const pendientesAprobacion = pedidos.filter((p) => p.estado === "solicitado").length;

  return (
    <div>
      <PageHeader titulo="Estrategia operativa" descripcion="Lectura ejecutiva de la operación para decisiones de dirección." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Tasa de resolución" value={`${tasa}%`} tone="success" hint="Incidencias resueltas o cerradas" />
        <StatCard label="Adopción de comunicados" value={`${adopcion}%`} hint="Lecturas confirmadas por ti" />
        <StatCard label="Pedidos por aprobar" value={pendientesAprobacion} tone="warning" hint="Requieren decisión de gerencia" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="font-display text-xl">Tendencia de incidencias</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="dia" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }} />
                <Line type="monotone" dataKey="total" stroke="var(--accent-gold)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="font-display text-xl">Distribución por prioridad</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porPrioridad} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {porPrioridad.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="surface mt-6 p-5">
        <h2 className="font-display text-xl">Lecturas recomendadas</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>• Concentra recursos en las áreas con mayor volumen de incidencias críticas del periodo.</li>
          <li>• Revisa los pedidos en estado «solicitado» para evitar bloqueos de servicio en A&amp;B.</li>
          <li>• Refuerza la confirmación de lectura de comunicados por debajo del 80% de adopción.</li>
        </ul>
      </section>
    </div>
  );
}
