import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mecanismo central de autorización: extiende `requireSupabaseAuth`
 * verificando además que el perfil siga activo (`profiles.activo = true`).
 * Un usuario desactivado no puede seguir usando ninguna server function.
 */
export const requireUsuarioActivo = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("activo")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data || data.activo !== true) {
      throw new Error("Usuario desactivado. Contacte con Administración.");
    }
    return next();
  });
