/** Helpers server-only de gobernanza y bitácora de auditoría. */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type CategoriaAuditoria =
  | "acceso"
  | "administracion"
  | "seguridad"
  | "operacion"
  | "vip";

export type EventoAuditoria = {
  categoria: CategoriaAuditoria;
  accion: string;
  recurso?: string | null;
  recurso_id?: string | null;
  resultado?: "ok" | "rechazado" | "pendiente";
  aprobado_por?: string | null;
  detalle?: string | null;
};

/**
 * Registra un evento en la bitácora general.
 * Nunca debe recibir contraseñas, tokens, OTP, JWT ni datos sensibles:
 * sólo metadatos de la acción (quién, qué, sobre qué recurso y resultado).
 * Es "best effort": un fallo de bitácora no interrumpe la operación.
 */
export async function registrarAuditoria(
  supabase: any,
  userId: string,
  evento: EventoAuditoria,
): Promise<void> {
  try {
    const [perfil, roles] = await Promise.all([
      supabase.from("profiles").select("nombre, area_id").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    await supabase.from("audit_log").insert({
      actor_id: userId,
      actor_nombre: perfil.data?.nombre ?? null,
      actor_rol: (roles.data ?? []).map((r: any) => r.role).join(", ") || null,
      actor_area: perfil.data?.area_id ?? null,
      categoria: evento.categoria,
      accion: evento.accion,
      recurso: evento.recurso ?? null,
      recurso_id: evento.recurso_id ?? null,
      resultado: evento.resultado ?? "ok",
      aprobado_por: evento.aprobado_por ?? null,
      detalle: evento.detalle ?? null,
    });
  } catch {
    /* la bitácora nunca bloquea la operación del hotel */
  }
}

/** Registro desde el cliente administrativo (login/rechazos), sin sesión de usuario. */
export async function registrarAuditoriaAdmin(
  supabaseAdmin: any,
  fila: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin.from("audit_log").insert(fila);
  } catch {
    /* noop */
  }
}
