/**
 * Normalización SOLO de presentación (no altera datos almacenados).
 */

/** Niveles de sensibilidad de área con etiqueta neutra. */
export function nivelArea(valor?: string | null): string {
  const map: Record<string, string> = {
    operativo: "OPERATIVO",
    restringido: "RESTRINGIDO",
    critico: "CRÍTICO",
    maximo: "MÁXIMO",
  };
  return map[(valor ?? "operativo").trim().toLowerCase()] ?? (valor ?? "").toUpperCase();
}

/** Nombres de actor equivalentes que deben mostrarse igual. */
export function nombreActor(valor?: string | null): string {
  const v = (valor ?? "").trim();
  if (!v) return "—";
  if (/^root admin(\s*\(demo\))?$/i.test(v)) return "Administrador raíz (demo)";
  if (/^administrador ra[ií]z(\s*\(demo\))?$/i.test(v)) return "Administrador raíz (demo)";
  return v;
}

/** Acciones de bitácora: se muestran con mayúscula inicial y tildes correctas. */
export function accionAuditoria(valor?: string | null): string {
  const v = (valor ?? "").trim().toLowerCase().replace(/_/g, " ");
  const map: Record<string, string> = {
    "acceso modulo": "Acceso módulo",
    "acceso módulo": "Acceso módulo",
    "cierre sesion": "Cierre de sesión",
    "inicio sesion": "Inicio de sesión",
    "cambio rol": "Cambio de rol",
    "solicitud alta": "Solicitud de alta",
    "alta aprobada": "Alta aprobada",
    "alta rechazada": "Alta rechazada",
    "solicitud privilegio": "Solicitud de privilegio",
    "privilegio aprobado": "Privilegio aprobado",
    "privilegio rechazado": "Privilegio rechazado",
    "baja usuario": "Baja de usuario",
    "reactivacion usuario": "Reactivación de usuario",
    "baja autoridad rechazada": "Baja de autoridad rechazada",
    "nivel area": "Nivel de área",
  };
  if (map[v]) return map[v];
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : "—";
}

/** Categorías con tilde y mayúscula inicial. */
export function categoriaAuditoria(valor?: string | null): string {
  const map: Record<string, string> = {
    todas: "Todas",
    acceso: "Acceso",
    administracion: "Administración",
    seguridad: "Seguridad",
    operacion: "Operación",
    vip: "VIP",
  };
  const v = (valor ?? "").trim().toLowerCase();
  return map[v] ?? (v ? v.charAt(0).toUpperCase() + v.slice(1) : "—");
}

/** Recursos frecuentes de la bitácora. */
export function recursoAuditoria(valor?: string | null): string {
  const map: Record<string, string> = {
    sesion: "Sesión",
    auditoria: "Auditoría",
    administracion: "Administración",
    admin: "Administración",
    estrategia: "Estrategia",
    vip: "VIP",
  };
  const v = (valor ?? "").trim().toLowerCase();
  return map[v] ?? (valor ?? "—");
}
