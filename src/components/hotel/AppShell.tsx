import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  ClipboardList,
  Megaphone,
  Crown,
  CheckSquare,
  PackageSearch,
  LineChart,
  Shield,
  ScrollText,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { iniciarCierreSesion } from "@/lib/sesion-estado";
import { useSesion } from "@/hooks/use-sesion";
import { useServerFn } from "@tanstack/react-start";
import { registrarCierreSesion } from "@/lib/gobernanza.functions";
import { useNotificaciones, type Modulo } from "@/hooks/use-notificaciones";
import { RoleBadge } from "./Badges";
import { Logo } from "./Logo";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/incidencias", label: "Incidencias", icon: AlertTriangle, modulo: "incidencias" },
  { to: "/turnos", label: "Turnos", icon: ClipboardList, modulo: "turnos" },
  { to: "/comunicados", label: "Comunicados", icon: Megaphone, modulo: "comunicados" },
  { to: "/vip", label: "VIP", icon: Crown, soloVip: true },
  { to: "/checklists", label: "Checklists", icon: CheckSquare },
  { to: "/pedidos", label: "Pedidos", icon: PackageSearch, modulo: "pedidos" },
  { to: "/estrategia", label: "Estrategia", icon: LineChart },
  { to: "/auditoria", label: "Auditoría", icon: ScrollText, soloAuditoria: true },
  { to: "/admin", label: "Administración", icon: Shield, soloAdmin: true },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { sesion, roles, puedeVerVip, tieneRol } = useSesion();
  const puedeVerAuditoria = tieneRol("gerente", "admin", "supervisor");
  const { contadores } = useNotificaciones();
  const queryClient = useQueryClient();
  const registrarCierre = useServerFn(registrarCierreSesion);

  async function cerrarSesion() {
    // 1) bloquear nuevas llamadas protegidas, 2) cancelar/limpiar caché,
    // 3) invalidar la sesión, 4) salir con recarga limpia (sin bfcache).
    try {
      await registrarCierre();
    } catch {
      /* la bitácora nunca impide cerrar sesión */
    }
    iniciarCierreSesion();
    await queryClient.cancelQueries();
    queryClient.removeQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada de forma segura.");
    window.location.replace("/auth");
  }


  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="hidden h-10 w-px shrink-0 bg-primary/40 sm:block" aria-hidden />

            <span className="min-w-0">
              <span className="block truncate font-display text-base leading-tight text-foreground sm:text-lg">
                Swissôtel Quito
              </span>
              <span className="block truncate text-[10px] uppercase tracking-[0.3em] text-primary/80">
                Comunicación interna
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs text-foreground">{sesion?.perfil?.nombre}</p>
              <p className="text-[10px] text-muted-foreground">{sesion?.perfil?.email}</p>
            </div>
            {roles[0] ? <RoleBadge role={roles[0]} /> : null}
            <button
              type="button"
              onClick={cerrarSesion}
              aria-label="Cerrar sesión"
              className="rounded-md border border-border p-2 text-muted-foreground hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 pb-2">
          {nav
            .filter((item) => !("soloVip" in item) || puedeVerVip)
            .filter((item) => !("soloAuditoria" in item) || puedeVerAuditoria).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-primary border-primary/50 bg-secondary" }}
              inactiveProps={{ className: "text-muted-foreground border-transparent" }}
              className="flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] hover:text-primary"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {"modulo" in item && contadores[item.modulo as Modulo] > 0 ? (
                <span
                  aria-label={`${contadores[item.modulo as Modulo]} novedades sin revisar`}
                  className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full border border-primary/60 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary"
                >
                  {contadores[item.modulo as Modulo]}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
