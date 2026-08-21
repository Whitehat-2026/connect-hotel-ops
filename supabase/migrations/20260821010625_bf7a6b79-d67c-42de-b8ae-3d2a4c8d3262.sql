CREATE TABLE public.account_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  nombre text NOT NULL,
  area_codigo text NOT NULL,
  rol_solicitado public.app_role NOT NULL,
  motivo text,
  estado text NOT NULL DEFAULT 'pendiente',
  solicitado_por uuid REFERENCES auth.users(id),
  aprobado_por uuid REFERENCES auth.users(id),
  comentario text,
  resuelto_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.account_requests TO authenticated;
GRANT ALL ON public.account_requests TO service_role;

ALTER TABLE public.account_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "altas crear administracion" ON public.account_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    solicitado_por = auth.uid()
    AND estado = 'pendiente'
    AND aprobado_por IS NULL
    AND rol_solicitado = ANY (ARRAY['supervisor'::public.app_role, 'colaborador'::public.app_role])
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'))
  );

CREATE POLICY "altas ver gerencia o propias" ON public.account_requests
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'gerente')
    OR public.has_role(auth.uid(), 'admin')
    OR solicitado_por = auth.uid()
  );

CREATE POLICY "altas resolver gerente" ON public.account_requests
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerente') AND solicitado_por IS DISTINCT FROM auth.uid())
  WITH CHECK (
    public.has_role(auth.uid(), 'gerente')
    AND aprobado_por = auth.uid()
    AND solicitado_por IS DISTINCT FROM auth.uid()
  );

CREATE TRIGGER trg_account_requests_updated
  BEFORE UPDATE ON public.account_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Administración ya no puede habilitar cuentas de forma unilateral.
DROP POLICY IF EXISTS "demo admin alta" ON public.demo_accounts;
