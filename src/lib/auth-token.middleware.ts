import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Adjunta el bearer token a cada server function desde el cliente.
 * Si la sesión aún no está hidratada intenta refrescarla; si no hay sesión
 * redirige a /auth en lugar de dejar que el servidor lance
 * "Unauthorized: No authorization header provided" (pantalla en blanco).
 */
export const asegurarTokenSupabase = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined") return next();

    let token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) {
      token = (await supabase.auth.refreshSession()).data.session?.access_token;
    }

    if (!token) {
      // Sin sesión: las funciones públicas (acceso demo) siguen funcionando.
      if (window.location.pathname !== "/auth") {
        window.location.replace("/auth");
        return new Promise(() => {}) as never;
      }
      return next();
    }


    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
