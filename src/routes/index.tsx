import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Radio, Crown, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Swissôtel Quito · Comunicación interna hotelera" },
      {
        name: "description",
        content:
          "Plataforma de comunicación interna y coordinación operativa para hoteles de lujo: incidencias, turnos, comunicados, VIP, checklists y pedidos internos.",
      },
      { property: "og:title", content: "Swissôtel Quito · Comunicación interna hotelera" },
      {
        property: "og:description",
        content:
          "Sustituye WhatsApp y correos informales por un canal seguro, trazable y móvil para todas las áreas del hotel.",
      },
    ],
  }),
  component: Landing,
});

const pilares = [
  { icon: ShieldCheck, titulo: "Confidencialidad", texto: "Información segmentada por rol y área, con niveles interno y restringido." },
  { icon: Radio, titulo: "Comunicación horizontal", texto: "A&B, Cocina, Ama de Llaves, Recepción y Mantenimiento en un mismo canal." },
  { icon: ClipboardCheck, titulo: "Trazabilidad total", texto: "Cada incidencia, entrega de turno y lectura de comunicado queda registrada." },
  { icon: Crown, titulo: "Experiencia premium", texto: "Alertas VIP con preferencias, alergias y restricciones para servicio impecable." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-20">
        <Logo className="h-14" />
        <p className="mt-8 text-[11px] uppercase tracking-[0.4em] text-primary">Hotel 5 estrellas</p>
        <h1 className="mt-4 font-display text-5xl leading-tight md:text-6xl">
          Swissôtel Quito
          <span className="block text-primary">Comunicación interna y operación A&amp;B</span>
        </h1>
        <div className="gold-rule mt-6 w-32" />
        <p className="mt-6 max-w-2xl text-base text-muted-foreground">
          Una sola plataforma para coordinar 150–300 habitaciones: incidencias con tiempos de
          respuesta, entrega digital de turnos con firma, comunicados con confirmación de lectura,
          alertas VIP confidenciales, checklists de SOP y pedidos internos con flujo de aprobación.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/auth" className="btn-gold hover:btn-gold-hover px-6 py-3 text-sm">
            Acceder a la plataforma
          </Link>
          <Link
            to="/auth"
            className="rounded-md border border-border px-6 py-3 text-sm text-muted-foreground hover:text-primary"
          >
            Solicitar cuenta
          </Link>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {pilares.map((p) => (
            <div key={p.titulo} className="surface p-6">
              <p.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-display text-xl">{p.titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
