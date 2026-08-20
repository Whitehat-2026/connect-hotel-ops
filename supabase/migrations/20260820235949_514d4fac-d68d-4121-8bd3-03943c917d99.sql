-- 1) Niveles de sensibilidad de áreas
DO $$ BEGIN
  CREATE TYPE public.nivel_sensibilidad AS ENUM ('operativo','restringido','critico','maximo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS nivel public.nivel_sensibilidad NOT NULL DEFAULT 'operativo';

-- 2) Trazabilidad de bajas en perfiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS desactivado_por uuid,
  ADD COLUMN IF NOT EXISTS desactivado_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_baja text;

-- 3) Bitácora general de auditoría (append-only)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_nombre text,
  actor_rol text,
  actor_area uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  categoria text NOT NULL DEFAULT 'administracion',
  accion text NOT NULL,
  recurso text,
  recurso_id uuid,
  resultado text NOT NULL DEFAULT 'ok',
  aprobado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detalle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auditoria gerente global" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'gerente'));

CREATE POLICY "auditoria admin tecnica" ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND categoria IN ('acceso','administracion','seguridad'));

CREATE POLICY "auditoria supervisor area" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'supervisor')
    AND categoria = 'operacion'
    AND actor_area IS NOT DISTINCT FROM public.area_usuario(auth.uid())
  );

CREATE POLICY "auditoria registrar propio" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);

-- 4) Solicitudes de privilegios críticos
CREATE TABLE IF NOT EXISTS public.privilege_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol_solicitado public.app_role NOT NULL,
  motivo text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  solicitado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  aprobado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  comentario text,
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.privilege_requests TO authenticated;
GRANT ALL ON public.privilege_requests TO service_role;
ALTER TABLE public.privilege_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solicitudes ver gerencia o propias" ON public.privilege_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'admin')
    OR solicitado_por = auth.uid()
  );

CREATE POLICY "solicitudes crear administracion" ON public.privilege_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    solicitado_por = auth.uid()
    AND estado = 'pendiente'
    AND aprobado_por IS NULL
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
  );

CREATE POLICY "solicitudes resolver gerente" ON public.privilege_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente'))
  WITH CHECK (public.has_role(auth.uid(), 'gerente') AND aprobado_por = auth.uid());

CREATE TRIGGER trg_privilege_requests_updated
  BEFORE UPDATE ON public.privilege_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Roles: administración no puede autoelevarse ni otorgar roles críticos
DROP POLICY IF EXISTS "roles admin gestiona" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin todo" ON public.user_roles;
DROP POLICY IF EXISTS "roles solo admin" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles admin" ON public.user_roles;
DROP POLICY IF EXISTS "roles ver propios" ON public.user_roles;
DROP POLICY IF EXISTS "roles lectura propia" ON public.user_roles;

CREATE POLICY "roles lectura propia o gerencia" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_gerencia(auth.uid()));

CREATE POLICY "roles admin asigna no criticos" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND user_id <> auth.uid()
    AND role IN ('supervisor','colaborador')
  );

CREATE POLICY "roles admin quita no criticos" ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND user_id <> auth.uid()
    AND role IN ('supervisor','colaborador')
  );

-- 6) Alta controlada de cuentas autorizadas (lista blanca)
DROP POLICY IF EXISTS "demo admin alta" ON public.demo_accounts;
CREATE POLICY "demo admin alta" ON public.demo_accounts
  FOR INSERT TO authenticated
  WITH CHECK (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
    AND role IN ('supervisor','colaborador')
  );