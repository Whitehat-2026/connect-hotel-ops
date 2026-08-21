import { createServerFn } from "@tanstack/react-start";
import { requireUsuarioActivo } from "./auth-activo.middleware";
import {
  accesoSensibleSchema,
  auditoriaFiltroSchema,
  bajaUsuarioSchema,
  nivelAreaSchema,
  privilegioResolverSchema,
  privilegioSolicitarSchema,
  usuarioAltaSchema,
} from "./gobernanza.schemas";
import { registrarAuditoria } from "./gobernanza.server";

/** Bitácora general: la RLS decide qué eventos puede ver cada rol. */
export const listarAuditoria = createServerFn({ method: "GET" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => auditoriaFiltroSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("audit_log")
      .select("*, areas:areas!audit_log_actor_area_fkey(nombre, codigo)")
      .order("created_at", { ascending: false })
      .limit(data.limite);
    if (data.categoria !== "todas") q = q.eq("categoria", data.categoria);
    const { data: filas, error } = await q;
    if (error) throw new Error(error.message);
    return filas ?? [];
  });

/** Deja constancia del acceso a un módulo sensible. */
export const registrarAccesoSensible = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => accesoSensibleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await registrarAuditoria(context.supabase, context.userId, {
      categoria: data.modulo === "vip" ? "vip" : "seguridad",
      accion: "acceso_modulo",
      recurso: data.modulo,
      detalle: `Consulta del módulo ${data.modulo}`,
    });
    return { ok: true };
  });

/** Cierre de sesión: se registra antes de invalidar la sesión. */
export const registrarCierreSesion = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .handler(async ({ context }) => {
    await registrarAuditoria(context.supabase, context.userId, {
      categoria: "acceso",
      accion: "cierre_sesion",
      recurso: "sesion",
    });
    return { ok: true };
  });

/**
 * Solicitud de alta de personal (doble control).
 * Administración prepara la solicitud: NO se autoriza ninguna cuenta todavía.
 * Sólo Gerencia puede aprobarla mediante `resolverAlta`.
 */
export const solicitarAlta = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => usuarioAltaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const area = await supabase
      .from("areas")
      .select("id, codigo")
      .eq("codigo", data.area_codigo)
      .maybeSingle();
    if (!area.data) throw new Error("El área indicada no existe.");

    const yaAutorizada = await supabase
      .from("demo_accounts")
      .select("email")
      .eq("email", data.email)
      .maybeSingle();
    if (yaAutorizada.data) throw new Error("Ese correo ya está autorizado.");

    const pendiente = await supabase
      .from("account_requests")
      .select("id")
      .eq("email", data.email)
      .eq("estado", "pendiente")
      .maybeSingle();
    if (pendiente.data) throw new Error("Ya existe una solicitud pendiente para ese correo.");

    const { data: creada, error } = await supabase
      .from("account_requests")
      .insert({
        email: data.email,
        nombre: data.nombre,
        area_codigo: area.data.codigo,
        rol_solicitado: data.role,
        motivo: data.motivo ?? null,
        estado: "pendiente",
        solicitado_por: userId,
      })
      .select("id")
      .single();
    if (error) {
      await registrarAuditoria(supabase, userId, {
        categoria: "administracion",
        accion: "solicitud_alta",
        recurso: "account_requests",
        resultado: "rechazado",
        detalle: `No autorizada: ${data.email}`,
      });
      throw new Error("No tiene autorización para solicitar esta alta.");
    }

    await registrarAuditoria(supabase, userId, {
      categoria: "administracion",
      accion: "solicitud_alta",
      recurso: "account_requests",
      recurso_id: creada.id,
      resultado: "pendiente",
      detalle: `${data.email} · rol ${data.role} · área ${area.data.codigo}`,
    });
    return { ok: true };
  });

/** Listado de solicitudes de alta (RLS: Gerencia, Administración o propias). */
export const listarAltas = createServerFn({ method: "GET" })
  .middleware([requireUsuarioActivo])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("account_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = [
      ...new Set((data ?? []).flatMap((s) => [s.solicitado_por, s.aprobado_por].filter(Boolean))),
    ] as string[];
    const perfiles = ids.length
      ? (await context.supabase.from("profiles").select("id, nombre").in("id", ids)).data ?? []
      : [];
    const nombre = (id?: string | null) => perfiles.find((p) => p.id === id)?.nombre ?? null;
    return (data ?? []).map((s) => ({
      ...s,
      solicitante: nombre(s.solicitado_por),
      aprobador: nombre(s.aprobado_por),
    }));
  });

/**
 * Resolución de alta por Gerencia General.
 * Sólo al aprobar se autoriza la cuenta (inserción en la lista blanca), con el
 * rol y área exactos de la solicitud. Nadie puede resolver su propia solicitud.
 */
export const resolverAlta = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => altaResolverSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: esGerente } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "gerente",
    });
    if (!esGerente) throw new Error("Sólo Gerencia General puede autorizar altas de personal.");

    const solicitud = await supabase
      .from("account_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!solicitud.data) throw new Error("Solicitud no encontrada.");
    if (solicitud.data.estado !== "pendiente") throw new Error("La solicitud ya fue resuelta.");
    if (solicitud.data.solicitado_por === userId)
      throw new Error("No puede resolver su propia solicitud de alta.");

    const estado = data.aprobar ? "aprobada" : "rechazada";
    const actualizada = await supabase
      .from("account_requests")
      .update({
        estado,
        aprobado_por: userId,
        comentario: data.comentario ?? null,
        resuelto_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .eq("estado", "pendiente")
      .select("id");
    if (actualizada.error) throw new Error(actualizada.error.message);
    if (!(actualizada.data ?? []).length) throw new Error("No fue posible resolver la solicitud.");

    if (data.aprobar) {
      // Autorización efectiva de la cuenta: operación privilegiada ya aprobada.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const ins = await supabaseAdmin.from("demo_accounts").insert({
        email: solicitud.data.email,
        nombre: solicitud.data.nombre,
        area_codigo: solicitud.data.area_codigo,
        role: solicitud.data.rol_solicitado,
      });
      if (ins.error && !/duplicate|unique/i.test(ins.error.message))
        throw new Error(ins.error.message);
    }

    await registrarAuditoria(supabase, userId, {
      categoria: "administracion",
      accion: data.aprobar ? "alta_aprobada" : "alta_rechazada",
      recurso: "account_requests",
      recurso_id: data.id,
      resultado: data.aprobar ? "ok" : "rechazado",
      aprobado_por: userId,
      detalle: `${solicitud.data.email} · rol ${solicitud.data.rol_solicitado} · área ${solicitud.data.area_codigo}`,
    });
    return { ok: true };
  });

/** Solicita un rol crítico (admin/gerente): sólo Gerencia puede aprobarlo. */
export const solicitarPrivilegio = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => privilegioSolicitarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: creada, error } = await supabase
      .from("privilege_requests")
      .insert({
        target_user_id: data.target_user_id,
        rol_solicitado: data.rol_solicitado,
        motivo: data.motivo,
        estado: "pendiente",
        solicitado_por: userId,
      })
      .select("id")
      .single();
    if (error) throw new Error("No tiene autorización para solicitar privilegios críticos.");

    await registrarAuditoria(supabase, userId, {
      categoria: "seguridad",
      accion: "solicitud_privilegio",
      recurso: "privilege_requests",
      recurso_id: creada.id,
      resultado: "pendiente",
      detalle: `Solicita rol ${data.rol_solicitado}`,
    });
    return { ok: true };
  });

export const listarSolicitudes = createServerFn({ method: "GET" })
  .middleware([requireUsuarioActivo])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("privilege_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = [
      ...new Set(
        (data ?? []).flatMap((s) =>
          [s.target_user_id, s.solicitado_por, s.aprobado_por].filter(Boolean),
        ),
      ),
    ] as string[];
    const perfiles = ids.length
      ? (await context.supabase.from("profiles").select("id, nombre, email").in("id", ids)).data ?? []
      : [];
    const nombre = (id?: string | null) => perfiles.find((p) => p.id === id)?.nombre ?? null;
    return (data ?? []).map((s) => ({
      ...s,
      objetivo: nombre(s.target_user_id) ?? "Usuario",
      solicitante: nombre(s.solicitado_por),
      aprobador: nombre(s.aprobado_por),
    }));
  });

/** Resolución por Gerencia: aprueba (y aplica el rol) o rechaza. */
export const resolverPrivilegio = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => privilegioResolverSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: esGerente } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "gerente",
    });
    if (!esGerente) throw new Error("Sólo Gerencia General puede resolver privilegios críticos.");

    const solicitud = await supabase
      .from("privilege_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!solicitud.data) throw new Error("Solicitud no encontrada.");
    if (solicitud.data.estado !== "pendiente") throw new Error("La solicitud ya fue resuelta.");

    const estado = data.aprobar ? "aprobada" : "rechazada";
    const actualizada = await supabase
      .from("privilege_requests")
      .update({
        estado,
        aprobado_por: userId,
        comentario: data.comentario ?? null,
        resuelto_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (actualizada.error) throw new Error(actualizada.error.message);

    if (data.aprobar) {
      // Aplicación del rol crítico: operación privilegiada, ya autorizada por Gerencia.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", solicitud.data.target_user_id);
      const ins = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: solicitud.data.target_user_id, role: solicitud.data.rol_solicitado });
      if (ins.error) throw new Error(ins.error.message);
    }

    await registrarAuditoria(supabase, userId, {
      categoria: "seguridad",
      accion: data.aprobar ? "privilegio_aprobado" : "privilegio_rechazado",
      recurso: "privilege_requests",
      recurso_id: data.id,
      resultado: data.aprobar ? "ok" : "rechazado",
      aprobado_por: userId,
      detalle: `Rol ${solicitud.data.rol_solicitado} · solicitado por ${solicitud.data.solicitado_por ?? "—"}`,
    });
    return { ok: true };
  });

/** Baja / reactivación de personal conservando todo el historial operativo. */
export const cambiarEstadoUsuario = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => bajaUsuarioSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.activo && !data.motivo) throw new Error("Indique el motivo de la baja.");
    if (data.user_id === userId) throw new Error("No puede modificar su propio acceso.");

    const { error } = await supabase
      .from("profiles")
      .update({
        activo: data.activo,
        desactivado_por: data.activo ? null : userId,
        desactivado_at: data.activo ? null : new Date().toISOString(),
        motivo_baja: data.activo ? null : (data.motivo ?? null),
      })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);

    await registrarAuditoria(supabase, userId, {
      categoria: "administracion",
      accion: data.activo ? "reactivacion_usuario" : "baja_usuario",
      recurso: "profiles",
      recurso_id: data.user_id,
      detalle: data.activo ? "Acceso restablecido" : `Motivo: ${data.motivo}`,
    });
    return { ok: true };
  });

/** Nivel de sensibilidad del área (clasificación, sólo Gerencia). */
export const actualizarNivelArea = createServerFn({ method: "POST" })
  .middleware([requireUsuarioActivo])
  .inputValidator((input: unknown) => nivelAreaSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: esGerente } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "gerente",
    });
    if (!esGerente) throw new Error("Sólo Gerencia puede clasificar el nivel de un área.");
    const { error } = await supabase.from("areas").update({ nivel: data.nivel }).eq("id", data.area_id);
    if (error) throw new Error(error.message);
    await registrarAuditoria(supabase, userId, {
      categoria: "seguridad",
      accion: "nivel_area",
      recurso: "areas",
      recurso_id: data.area_id,
      detalle: `Nivel establecido en ${data.nivel}`,
    });
    return { ok: true };
  });

/** Resumen de gobernanza para la vista de Gerencia (información agregada). */
export const resumenGobernanza = createServerFn({ method: "GET" })
  .middleware([requireUsuarioActivo])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [perfiles, solicitudes, eventos, areas] = await Promise.all([
      supabase.from("profiles").select("id, activo"),
      supabase.from("privilege_requests").select("id, estado"),
      supabase
        .from("audit_log")
        .select("id, accion, detalle, categoria, actor_nombre, created_at")
        .in("categoria", ["seguridad", "administracion"])
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("areas").select("id, nombre, codigo, nivel").order("nombre"),
    ]);
    const p = perfiles.data ?? [];
    return {
      usuariosActivos: p.filter((x) => x.activo).length,
      usuariosInactivos: p.filter((x) => !x.activo).length,
      solicitudesPendientes: (solicitudes.data ?? []).filter((s) => s.estado === "pendiente").length,
      eventosRecientes: eventos.data ?? [],
      areas: areas.data ?? [],
    };
  });
