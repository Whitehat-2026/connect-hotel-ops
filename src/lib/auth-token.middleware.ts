import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

/**
 * Adjunta el bearer token a cada server function desde el cliente.
 * Si la sesión aún no está hidratada intenta refrescarla; si ya no hay sesión
 * y estamos en una ruta protegida, redirige a /auth en lugar de provocar
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
      // Sin sesión no llamamos al servidor: evitamos el 500
      // "Unauthorized: No authorization header provided" (pantalla en blanco).
      if (window.location.pathname !== "/auth") {
        window.location.replace("/auth");
        throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
      }
      return next();
    }

    return next({ headers: { Authorization: `Bearer ${token}` } });
  },
);
