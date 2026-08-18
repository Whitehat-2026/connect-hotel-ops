
-- 1. incident_events
DROP POLICY IF EXISTS "eventos incidencia lectura" ON public.incident_events;
DROP POLICY IF EXISTS "eventos incidencia alta" ON public.incident_events;

CREATE POLICY "eventos incidencia lectura" ON public.incident_events
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.incidents i
  WHERE i.id = incident_events.incident_id
    AND (
      public.es_gerencia(auth.uid())
      OR i.created_by = auth.uid()
      OR i.asignado_a = auth.uid()
      OR i.area_id = public.area_usuario(auth.uid())
      OR i.area_origen = public.area_usuario(auth.uid())
    )
));

CREATE POLICY "eventos incidencia alta" ON public.incident_events
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.id = incident_events.incident_id
      AND (
        public.es_gerencia(auth.uid())
        OR i.created_by = auth.uid()
        OR i.asignado_a = auth.uid()
        OR i.area_id = public.area_usuario(auth.uid())
        OR i.area_origen = public.area_usuario(auth.uid())
      )
  )
);

-- 2. request_events
DROP POLICY IF EXISTS "eventos pedido lectura" ON public.request_events;
DROP POLICY IF EXISTS "eventos pedido alta" ON public.request_events;

CREATE POLICY "eventos pedido lectura" ON public.request_events
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.internal_requests r
  WHERE r.id = request_events.request_id
    AND (
      public.es_gerencia(auth.uid())
      OR r.created_by = auth.uid()
      OR r.area_solicitante = public.area_usuario(auth.uid())
      OR r.area_destino = public.area_usuario(auth.uid())
    )
));

CREATE POLICY "eventos pedido alta" ON public.request_events
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.internal_requests r
    WHERE r.id = request_events.request_id
      AND (
        public.es_gerencia(auth.uid())
        OR r.created_by = auth.uid()
        OR r.area_solicitante = public.area_usuario(auth.uid())
        OR r.area_destino = public.area_usuario(auth.uid())
      )
  )
);

ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

-- 3. user_roles: sin escritura desde el cliente salvo admin
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roles admin" ON public.user_roles;

CREATE POLICY "roles admin gestion" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
