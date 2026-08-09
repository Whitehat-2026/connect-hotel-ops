import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const accesoSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

/**
 * Acceso de DEMOSTRACIÓN.
 * El correo corporativo funciona únicamente como identificador: no se valida
 * contra ningún directorio ni se solicita contraseña. La verificación
 * biométrica es una simulación visual del cliente; aquí sólo se emite la
 * sesión para poder recorrer la plataforma.
 */
export const accesoDemo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => accesoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    async function generar() {
      return supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    }

    let res = await generar();
    if (res.error || !res.data?.properties?.hashed_token) {
      const creado = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: { nombre: data.email.split("@")[0] },
      });
      if (creado.error && !/already/i.test(creado.error.message)) {
        throw new Error("No fue posible iniciar la sesión de demostración.");
      }
      res = await generar();
    }

    const tokenHash = res.data?.properties?.hashed_token;
    if (!tokenHash) throw new Error("No fue posible iniciar la sesión de demostración.");

    /**
     * Aprovisionamiento de perfil y rol.
     * El rol NUNCA se deduce del texto del correo: se lee de la tabla interna
     * `demo_accounts`. Cualquier correo no listado entra como `colaborador`.
     */
    let usuarioId = res.data?.user?.id;
    if (!usuarioId) {
      const lista = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      usuarioId = lista.data?.users.find((u) => u.email?.toLowerCase() === data.email)?.id;
    }
    if (usuarioId) {
      const cuenta = await supabaseAdmin
        .from("demo_accounts")
        .select("role, area_codigo, nombre")
        .eq("email", data.email)
        .maybeSingle();

      const codigo = cuenta.data?.area_codigo ?? "COC";
      const area = await supabaseAdmin.from("areas").select("id").eq("codigo", codigo).maybeSingle();

      const perfil = await supabaseAdmin.from("profiles").upsert(
        {
          id: usuarioId,
          nombre: cuenta.data?.nombre ?? data.email.split("@")[0]!,
          email: data.email,
          area_id: area.data?.id ?? null,
        },
        { onConflict: "id" },
      );
      if (perfil.error) throw new Error(`Perfil: ${perfil.error.message}`);

      const rol = cuenta.data?.role ?? "colaborador";
      const existente = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", usuarioId);
      if (!(existente.data ?? []).some((r) => r.role === rol)) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", usuarioId);
        const ins = await supabaseAdmin.from("user_roles").insert({ user_id: usuarioId, role: rol });
        if (ins.error) throw new Error(`Rol: ${ins.error.message}`);
      }
    }

    return { tokenHash };
  });
