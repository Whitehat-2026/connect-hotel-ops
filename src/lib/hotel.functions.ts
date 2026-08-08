import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  areaCrearSchema,
  comunicadoCrearSchema,
  idSchema,
  incidenciaActualizarSchema,
  incidenciaCrearSchema,
  itemToggleSchema,
  pedidoCrearSchema,
  pedidoEstadoSchema,
  rolAsignarSchema,
  turnoCrearSchema,
  turnoFirmarSchema,
  usuarioActivoSchema,
  vipCrearSchema,
} from "./hotel.schemas";
import { conReintento, limpiar } from "./hotel.server";

/** Sesión: perfil, roles y catálogo de áreas. */

export const obtenerSesion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [perfil, roles, areas] = await conReintento(
      () =>
        Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("areas").select("*").order("nombre"),
        ]),
      ([p, r, a]) => p.error?.message ?? r.error?.message ?? a.error?.message ?? null,
    );
    if (perfil.error) throw new Error(perfil.error.message);
    return {
      userId,
      perfil: perfil.data,
      roles: (roles.data ?? []).map((r) => r.role),
      areas: areas.data ?? [],
    };
  });


export const listarIncidencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("incidents")
      .select("*, areas(nombre, codigo)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const crearIncidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => incidenciaCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("incidents")
      .insert(limpiar({ ...data, created_by: context.userId }));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const actualizarIncidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => incidenciaActualizarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { id, ...cambios } = data;
    const patch: Record<string, unknown> = { ...cambios };
    if (cambios.estado === "en_proceso") patch["primera_respuesta_at"] = new Date().toISOString();
    if (cambios.estado === "resuelta" || cambios.estado === "cerrada")
      patch["resuelta_at"] = new Date().toISOString();
    const { error } = await context.supabase.from("incidents").update(limpiar(patch)).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarTurnos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("shift_handovers")
      .select("*, areas(nombre, codigo)")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const crearTurno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => turnoCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shift_handovers")
      .insert(limpiar({ ...data, created_by: context.userId, entregado_por: context.userId }));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const firmarTurno = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => turnoFirmarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("shift_handovers")
      .update({ firma_recepcion: data.firma_recepcion, recibido_por: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarComunicados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [comunicados, lecturas] = await Promise.all([
      context.supabase
        .from("announcements")
        .select("*, areas(nombre, codigo)")
        .order("created_at", { ascending: false }),
      context.supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", context.userId),
    ]);
    if (comunicados.error) throw new Error(comunicados.error.message);
    const leidos = new Set((lecturas.data ?? []).map((l) => l.announcement_id));
    return (comunicados.data ?? []).map((c) => ({ ...c, leido: leidos.has(c.id) }));
  });

export const crearComunicado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => comunicadoCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("announcements")
      .insert(limpiar({ ...data, created_by: context.userId }));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const marcarLeido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("announcement_reads")
      .upsert(
        { announcement_id: data.id, user_id: context.userId },
        { onConflict: "announcement_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarVips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("vip_alerts")
      .select("*")
      .order("llegada", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const crearVip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => vipCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("vip_alerts")
      .insert(limpiar({ ...data, created_by: context.userId }));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarChecklists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("checklists")
      .select("*, areas(nombre, codigo), checklist_items(*)")
      .order("fecha", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const alternarItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itemToggleSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("checklist_items")
      .update({
        completado: data.completado,
        completado_por: data.completado ? context.userId : null,
        completado_at: data.completado ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarPedidos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("internal_requests")
      .select("*, solicitante:areas!internal_requests_area_solicitante_fkey(nombre, codigo), destino:areas!internal_requests_area_destino_fkey(nombre, codigo)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const crearPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pedidoCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("internal_requests")
      .insert(limpiar({ ...data, created_by: context.userId }));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cambiarEstadoPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pedidoEstadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = { estado: data.estado };
    if (data.estado === "aprobado" || data.estado === "rechazado")
      patch["aprobado_por"] = context.userId;
    const { error } = await context.supabase
      .from("internal_requests")
      .update(limpiar(patch))
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [perfiles, roles] = await Promise.all([
      context.supabase.from("profiles").select("*, areas(nombre, codigo)").order("nombre"),
      context.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (perfiles.error) throw new Error(perfiles.error.message);
    return (perfiles.data ?? []).map((p) => ({
      ...p,
      roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    }));
  });

export const asignarRol = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => rolAsignarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const borrado = await context.supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (borrado.error) throw new Error(borrado.error.message);
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cambiarActivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => usuarioActivoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ activo: data.activo })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const crearArea = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => areaCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("areas").insert(limpiar(data));
    if (error) throw new Error(error.message);
    return { ok: true };
  });
