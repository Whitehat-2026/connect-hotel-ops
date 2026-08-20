-- 1. Permiso independiente para VIP (solo gerente)
CREATE OR REPLACE FUNCTION public.puede_ver_vip(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'gerente'
  ) AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.activo
  );
$$;

REVOKE EXECUTE ON FUNCTION public.puede_ver_vip(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.puede_ver_vip(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "vip solo gerencia" ON public.vip_alerts;
CREATE POLICY "vip solo permiso vip" ON public.vip_alerts
  FOR ALL TO authenticated
  USING (public.puede_ver_vip(auth.uid()))
  WITH CHECK (public.puede_ver_vip(auth.uid()));

-- 2. Proteger campos sensibles de profiles mediante trigger
CREATE OR REPLACE FUNCTION public.proteger_campos_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.es_gerencia(auth.uid()) THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.area_id := OLD.area_id;
    NEW.activo := OLD.activo;
    NEW.puesto := OLD.puesto;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_proteger ON public.profiles;
CREATE TRIGGER trg_profiles_proteger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_perfil();

-- 3. Limpieza de cuentas accidentales (sin historial operativo asociado)
DELETE FROM public.module_views WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE lower(email) NOT IN (SELECT lower(email) FROM public.demo_accounts)
);
DELETE FROM public.user_roles WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE lower(email) NOT IN (SELECT lower(email) FROM public.demo_accounts)
);
DELETE FROM auth.users WHERE id IN (
  SELECT id FROM public.profiles
  WHERE lower(email) NOT IN (SELECT lower(email) FROM public.demo_accounts)
);
DELETE FROM public.profiles
  WHERE lower(email) NOT IN (SELECT lower(email) FROM public.demo_accounts);
