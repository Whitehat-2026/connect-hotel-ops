import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
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
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSesion } from "@/hooks/use-sesion";
import { RoleBadge } from "./Badges";
import { Logo } from "./Logo";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/incidencias", label: "Incidencias", icon: AlertTriangle },
  { to: "/turnos", label: "Turnos", icon: ClipboardList },
  { to: "/comunicados", label: "Comunicados", icon: Megaphone },
  { to: "/vip", label: "VIP", icon: Crown },
  { to: "/checklists", label: "Checklists", icon: CheckSquare },
  { to: "/pedidos", label: "Pedidos", icon: PackageSearch },
  { to: "/estrategia", label: "Estrategia", icon: LineChart },
  { to: "/admin", label: "Administración", icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { sesion, roles } = useSesion();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function cerrarSesion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Sesión cerrada de forma segura.");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <Logo className="h-8 sm:h-10" />
            <span className="hidden h-8 w-px shrink-0 bg-primary/40 sm:block" aria-hidden />
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
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "text-primary border-primary/50 bg-secondary" }}
              inactiveProps={{ className: "text-muted-foreground border-transparent" }}
              className="flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium uppercase tracking-[0.08em] hover:text-primary"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
