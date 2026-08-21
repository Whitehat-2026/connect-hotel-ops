import { z } from "zod";

/** Roles considerados críticos: requieren aprobación de Gerencia. */
export const ROLES_CRITICOS = ["admin", "gerente"] as const;
export const rolNoCriticoEnum = z.enum(["supervisor", "colaborador"]);
export const rolCriticoEnum = z.enum(ROLES_CRITICOS);

export const nivelEnum = z.enum(["operativo", "restringido", "critico", "maximo"]);

export const usuarioAltaSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  nombre: z.string().trim().min(2).max(120),
  area_codigo: z.string().trim().min(2).max(10),
  role: rolNoCriticoEnum,
});

export const privilegioSolicitarSchema = z.object({
  target_user_id: z.string().uuid(),
  rol_solicitado: rolCriticoEnum,
  motivo: z.string().trim().min(10, "Describa el motivo (mínimo 10 caracteres).").max(500),
});

export const privilegioResolverSchema = z.object({
  id: z.string().uuid(),
  aprobar: z.boolean(),
  comentario: z.string().trim().max(500).optional(),
});

export const bajaUsuarioSchema = z.object({
  user_id: z.string().uuid(),
  activo: z.boolean(),
  motivo: z.string().trim().max(300).optional(),
});

export const nivelAreaSchema = z.object({
  area_id: z.string().uuid(),
  nivel: nivelEnum,
});

export const accesoSensibleSchema = z.object({
  modulo: z.enum(["vip", "admin", "auditoria", "estrategia"]),
});

export const auditoriaFiltroSchema = z.object({
  categoria: z.enum(["todas", "acceso", "administracion", "seguridad", "operacion", "vip"]).default("todas"),
  limite: z.number().int().min(1).max(300).default(100),
});
