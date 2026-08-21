CREATE OR REPLACE FUNCTION public.rango_autoridad(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(CASE role
    WHEN 'gerente' THEN 3
    WHEN 'admin' THEN 2
    WHEN 'supervisor' THEN 1
    ELSE 0 END), 0)
  FROM public.user_roles WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.proteger_autoridades()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_rango_actor integer;
  v_rango_objetivo integer;
  v_admins integer;
  v_gerentes integer;
BEGIN
  IF NEW.activo IS NOT DISTINCT FROM OLD.activo OR NEW.activo THEN
    RETURN NEW;
  END IF;
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id = v_actor THEN
    RAISE EXCEPTION 'No puede dar de baja su propia cuenta.';
  END IF;

  v_rango_actor := public.rango_autoridad(v_actor);
  v_rango_objetivo := public.rango_autoridad(NEW.id);

  IF v_rango_objetivo >= 3 AND v_rango_actor < 3 THEN
    RAISE EXCEPTION 'Sólo Gerencia General puede desactivar una cuenta de Gerencia.';
  END IF;

  IF v_rango_objetivo >= v_rango_actor THEN
    RAISE EXCEPTION 'No puede desactivar una cuenta de autoridad igual o superior.';
  END IF;

  SELECT count(*) INTO v_admins
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'admin'
  WHERE p.activo AND p.id <> NEW.id;

  SELECT count(*) INTO v_gerentes
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id AND r.role = 'gerente'
  WHERE p.activo AND p.id <> NEW.id;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin') AND v_admins = 0 THEN
    RAISE EXCEPTION 'Debe permanecer al menos una cuenta de Administración activa.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id AND role = 'gerente') AND v_gerentes = 0 THEN
    RAISE EXCEPTION 'Debe permanecer al menos una cuenta de Gerencia activa.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_proteger_autoridades ON public.profiles;
CREATE TRIGGER trg_profiles_proteger_autoridades
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.proteger_autoridades();

REVOKE EXECUTE ON FUNCTION public.rango_autoridad(uuid) FROM anon;