import { z } from "zod";

export const prioridadEnum = z.enum(["baja", "media", "alta", "critica"]);
export const estadoIncidenciaEnum = z.enum([
  "abierta",
  "en_proceso",
  "escalada",
  "resuelta",
  "cerrada",
]);
export const estadoPedidoEnum = z.enum([
  "solicitado",
  "aprobado",
  "rechazado",
  "en_proceso",
  "entregado",
  "cerrado",
]);
export const confidencialidadEnum = z.enum(["interno", "restringido"]);
export const rolEnum = z.enum(["admin", "gerente", "supervisor", "colaborador"]);

export const incidenciaCrearSchema = z.object({
  titulo: z.string().trim().min(3).max(140),
  descripcion: z.string().trim().max(2000).optional(),
  area_id: z.string().uuid().nullable().optional(),
  ubicacion: z.string().trim().max(120).optional(),
  prioridad: prioridadEnum,
});

export const incidenciaActualizarSchema = z.object({
  id: z.string().uuid(),
  estado: estadoIncidenciaEnum.optional(),
  prioridad: prioridadEnum.optional(),
  asignado_a: z.string().uuid().nullable().optional(),
});

export const turnoCrearSchema = z.object({
  area_id: z.string().uuid().nullable().optional(),
  turno: z.string().trim().min(3).max(30),
  pendientes: z
    .string()
    .trim()
    .min(1, "Indique los pendientes del turno antes de realizar la entrega.")
    .max(2000),
  vips: z.string().trim().max(2000).optional(),
  incidencias_abiertas: z.string().trim().max(2000).optional(),
  notas: z.string().trim().max(2000).optional(),
  firma_entrega: z.string().trim().max(120).optional(),
});

export const turnoFirmarSchema = z.object({
  id: z.string().uuid(),
  firma_recepcion: z.string().trim().min(2).max(120),
});

export const comunicadoCrearSchema = z.object({
  titulo: z.string().trim().min(3).max(140),
  cuerpo: z.string().trim().min(3).max(4000),
  area_id: z.string().uuid().nullable().optional(),
  confidencialidad: confidencialidadEnum,
  prioridad: prioridadEnum,
});

export const vipCrearSchema = z.object({
  huesped: z.string().trim().min(2).max(120),
  habitacion: z.string().trim().max(40).optional(),
  preferencias: z.string().trim().max(1000).optional(),
  alergias: z.string().trim().max(500).optional(),
  restricciones: z.string().trim().max(500).optional(),
  areas_involucradas: z.array(z.string().trim().max(10)).max(12).default([]),
  prioridad: prioridadEnum,
});

export const itemToggleSchema = z.object({
  id: z.string().uuid(),
  completado: z.boolean(),
});

export const pedidoCrearSchema = z.object({
  titulo: z.string().trim().min(3).max(140),
  detalle: z.string().trim().max(2000).optional(),
  area_solicitante: z.string().uuid().nullable().optional(),
  area_destino: z.string().uuid().nullable().optional(),
  prioridad: prioridadEnum,
});

export const pedidoEstadoSchema = z.object({
  id: z.string().uuid(),
  estado: estadoPedidoEnum,
});

export const rolAsignarSchema = z.object({
  user_id: z.string().uuid(),
  role: rolEnum,
});

export const usuarioActivoSchema = z.object({
  user_id: z.string().uuid(),
  activo: z.boolean(),
});

export const areaCrearSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  codigo: z.string().trim().min(2).max(10),
  descripcion: z.string().trim().max(300).optional(),
});

export const idSchema = z.object({ id: z.string().uuid() });
