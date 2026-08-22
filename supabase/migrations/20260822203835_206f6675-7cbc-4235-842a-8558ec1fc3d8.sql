CREATE OR REPLACE FUNCTION public.tomar_incidencia(_incident_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_area uuid;
  v_nombre text;
  v_activo boolean;
  v_area_nombre text;
  v_inc public.incidents%ROWTYPE;
  v_ts timestamptz := now();
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  SELECT p.activo, p.area_id, p.nombre INTO v_activo, v_area, v_nombre
  FROM public.profiles p WHERE p.id = v_actor;

  IF v_activo IS NOT TRUE THEN
    RAISE EXCEPTION 'Usuario desactivado. Contacte con Administración.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_actor AND role = 'supervisor') THEN
    RAISE EXCEPTION 'Sólo un Supervisor del área responsable puede tomar la incidencia.';
  END IF;

  IF v_area IS NULL THEN
    RAISE EXCEPTION 'Su perfil no tiene un área asignada.';
  END IF;

  SELECT * INTO v_inc FROM public.incidents WHERE id = _incident_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La incidencia no existe.';
  END IF;

  IF v_inc.area_id IS DISTINCT FROM v_area THEN
    RAISE EXCEPTION 'La incidencia pertenece a otra área responsable.';
  END IF;

  IF v_inc.created_by = v_actor THEN
    RAISE EXCEPTION 'No puede recibir una incidencia que usted mismo reportó.';
  END IF;

  IF v_inc.estado <> 'abierta' OR v_inc.asignado_a IS NOT NULL OR v_inc.primera_respuesta_at IS NOT NULL THEN
    RAISE EXCEPTION 'La incidencia ya fue tomada por otro Supervisor.';
  END IF;

  UPDATE public.incidents
     SET asignado_a = v_actor,
         primera_respuesta_at = v_ts,
         estado = 'abierta',
         updated_at = v_ts
   WHERE id = _incident_id;

  SELECT a.nombre INTO v_area_nombre FROM public.areas a WHERE a.id = v_area;

  INSERT INTO public.incident_events (incident_id, actor_id, tipo, descripcion, created_at)
  VALUES (_incident_id, v_actor, 'recibida',
          format('Recibida por %s · %s', COALESCE(v_nombre, 'Supervisor'), COALESCE(v_area_nombre, 'sin área')),
          v_ts);
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_estado_incidencia(_incident_id uuid, _estado public.estado_incidencia)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_area uuid;
  v_activo boolean;
  v_inc public.incidents%ROWTYPE;
  v_ts timestamptz := now();
  v_permitido boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado.';
  END IF;

  SELECT p.activo, p.area_id INTO v_activo, v_area FROM public.profiles p WHERE p.id = v_actor;

  IF v_activo IS NOT TRUE THEN
    RAISE EXCEPTION 'Usuario desactivado. Contacte con Administración.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_actor AND role = 'supervisor') THEN
    RAISE EXCEPTION 'Sólo el Supervisor asignado puede gestionar la incidencia.';
  END IF;

  SELECT * INTO v_inc FROM public.incidents WHERE id = _incident_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La incidencia no existe.';
  END IF;

  IF v_inc.area_id IS DISTINCT FROM v_area THEN
    RAISE EXCEPTION 'La incidencia pertenece a otra área responsable.';
  END IF;

  IF v_inc.asignado_a IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Sólo el Supervisor que recibió la incidencia puede gestionarla.';
  END IF;

  IF v_inc.created_by = v_actor THEN
    RAISE EXCEPTION 'No puede gestionar una incidencia que usted mismo reportó.';
  END IF;

  IF v_inc.primera_respuesta_at IS NULL THEN
    RAISE EXCEPTION 'La incidencia aún no fue recibida formalmente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.incident_events e
    WHERE e.incident_id = _incident_id AND e.tipo = 'recibida'
  ) THEN
    RAISE EXCEPTION 'La incidencia aún no fue recibida formalmente.';
  END IF;

  v_permitido := (v_inc.estado = 'abierta'    AND _estado = 'en_proceso')
              OR (v_inc.estado = 'en_proceso' AND _estado IN ('escalada','resuelta'))
              OR (v_inc.estado = 'escalada'   AND _estado IN ('en_proceso','resuelta'))
              OR (v_inc.estado = 'resuelta'   AND _estado = 'cerrada');

  IF NOT v_permitido THEN
    RAISE EXCEPTION 'Transición de estado no permitida (% → %).', v_inc.estado, _estado;
  END IF;

  UPDATE public.incidents
     SET estado = _estado,
         resuelta_at = CASE WHEN _estado = 'resuelta' AND resuelta_at IS NULL THEN v_ts ELSE resuelta_at END,
         updated_at = v_ts
   WHERE id = _incident_id;

  INSERT INTO public.incident_events (incident_id, actor_id, tipo, descripcion, created_at)
  VALUES (_incident_id, v_actor, 'estado',
          format('Estado actualizado a "%s"', replace(_estado::text, '_', ' ')), v_ts);
END;
$$;

REVOKE ALL ON FUNCTION public.tomar_incidencia(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.actualizar_estado_incidencia(uuid, public.estado_incidencia) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tomar_incidencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_estado_incidencia(uuid, public.estado_incidencia) TO authenticated;

DROP POLICY IF EXISTS "incidencias edicion" ON public.incidents;
REVOKE UPDATE ON public.incidents FROM authenticated;