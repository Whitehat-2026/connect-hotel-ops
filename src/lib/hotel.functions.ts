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
      .select(
        "*, areas:areas!incidents_area_id_fkey(nombre, codigo), origen:areas!incidents_area_origen_fkey(nombre, codigo)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listarEventosIncidencia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: eventos, error } = await context.supabase
      .from("incident_events")
      .select("*")
      .eq("incident_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = [...new Set((eventos ?? []).map((e) => e.actor_id).filter(Boolean))] as string[];
    const perfiles = ids.length
      ? (await context.supabase.from("profiles").select("id, nombre").in("id", ids)).data ?? []
      : [];
    return (eventos ?? []).map((e) => ({
      ...e,
      actor: perfiles.find((p) => p.id === e.actor_id)?.nombre ?? null,
    }));
  });

export const crearIncidencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => incidenciaCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const perfil = await supabase.from("profiles").select("area_id, nombre").eq("id", userId).maybeSingle();
    const areaOrigen = perfil.data?.area_id ?? null;
    const { data: creada, error } = await supabase
      .from("incidents")
      .insert(limpiar({ ...data, created_by: userId, area_origen: areaOrigen }))
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const nombres = (await supabase.from("areas").select("id, nombre")).data ?? [];
    const nombreArea = (id?: string | null) => nombres.find((a) => a.id === id)?.nombre ?? null;
    await supabase.from("incident_events").insert({
      incident_id: creada.id,
      actor_id: userId,
      tipo: "creada",
      descripcion: `${nombreArea(areaOrigen) ?? perfil.data?.nombre ?? "Un colaborador"} reportó la incidencia a ${nombreArea(data.area_id) ?? "sin área responsable"}`,
    });
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
    if (cambios.estado && cambios.estado !== "abierta") patch["asignado_a"] = context.userId;
    const { error } = await context.supabase.from("incidents").update(limpiar(patch)).eq("id", id);
    if (error) throw new Error(error.message);
    if (cambios.estado) {
      await context.supabase.from("incident_events").insert({
        incident_id: id,
        actor_id: context.userId,
        tipo: "estado",
        descripcion: `Estado actualizado a "${cambios.estado.replace("_", " ")}"`,
      });
    }
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

export const listarEventosPedido = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: eventos, error } = await context.supabase
      .from("request_events")
      .select("*")
      .eq("request_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = [...new Set((eventos ?? []).map((e) => e.actor_id).filter(Boolean))] as string[];
    const perfiles = ids.length
      ? (await context.supabase.from("profiles").select("id, nombre").in("id", ids)).data ?? []
      : [];
    return (eventos ?? []).map((e) => ({
      ...e,
      actor: perfiles.find((p) => p.id === e.actor_id)?.nombre ?? null,
    }));
  });

export const crearPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pedidoCrearSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: creado, error } = await supabase
      .from("internal_requests")
      .insert(limpiar({ ...data, created_by: userId }))
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const nombres = (await supabase.from("areas").select("id, nombre")).data ?? [];
    const nombreArea = (id?: string | null) => nombres.find((a) => a.id === id)?.nombre ?? null;
    await supabase.from("request_events").insert({
      request_id: creado.id,
      actor_id: userId,
      tipo: "creado",
      descripcion: `Pedido solicitado por ${nombreArea(data.area_solicitante) ?? "un área"} hacia ${nombreArea(data.area_destino) ?? "sin destino"}${
        data.prioridad === "alta" || data.prioridad === "critica"
          ? " · requiere aprobación de gerencia"
          : " · circulación directa entre áreas"
      }`,
    });
    return { ok: true };
  });

export const cambiarEstadoPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => pedidoEstadoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const pedido = await supabase
      .from("internal_requests")
      .select("prioridad, estado, created_by")
      .eq("id", data.id)
      .maybeSingle();
    if (!pedido.data) throw new Error("Pedido no encontrado");

    const requiereAprobacion =
      pedido.data.prioridad === "alta" || pedido.data.prioridad === "critica";
    const { data: esGerencia } = await supabase.rpc("es_gerencia", { _user_id: userId });

    if (data.estado === "aprobado" || data.estado === "rechazado") {
      if (!esGerencia) throw new Error("Solo gerencia puede aprobar o rechazar pedidos");
    }
    if (requiereAprobacion && !esGerencia && data.estado !== "solicitado") {
      // Un pedido de prioridad alta necesita el visto bueno de gerencia antes de avanzar.
      if (!["aprobado", "en_proceso", "entregado", "cerrado"].includes(pedido.data.estado)) {
        throw new Error("Este pedido requiere aprobación de gerencia antes de avanzar");
      }
    }

    const patch: Record<string, unknown> = { estado: data.estado };
    if (data.estado === "aprobado" || data.estado === "rechazado") patch["aprobado_por"] = userId;
    const { error } = await supabase
      .from("internal_requests")
      .update(limpiar(patch))
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.from("request_events").insert({
      request_id: data.id,
      actor_id: userId,
      tipo: "estado",
      descripcion: `Estado actualizado a "${data.estado.replace("_", " ")}"`,
    });
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

/** Acuses de lectura de un comunicado (visible para perfiles autorizados por RLS). */
export const listarLecturas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: lecturas, error } = await context.supabase
      .from("announcement_reads")
      .select("user_id, leido_at")
      .eq("announcement_id", data.id)
      .order("leido_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = (lecturas ?? []).map((l) => l.user_id);
    const perfiles = ids.length
      ? (await context.supabase.from("profiles").select("id, nombre, email").in("id", ids)).data ?? []
      : [];
    return (lecturas ?? []).map((l) => ({
      ...l,
      nombre: perfiles.find((p) => p.id === l.user_id)?.nombre ?? "Colaborador",
      email: perfiles.find((p) => p.id === l.user_id)?.email ?? null,
    }));
  });
