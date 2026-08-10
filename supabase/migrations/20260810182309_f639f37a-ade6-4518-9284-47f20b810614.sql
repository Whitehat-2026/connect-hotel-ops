ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS area_origen uuid REFERENCES public.areas(id);

UPDATE public.incidents i
SET area_origen = p.area_id
FROM public.profiles p
WHERE i.created_by = p.id AND i.area_origen IS NULL;

CREATE TABLE IF NOT EXISTS public.incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  tipo text NOT NULL,
  descripcion text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incident_events_incident ON public.incident_events(incident_id, created_at);

GRANT SELECT, INSERT ON public.incident_events TO authenticated;
GRANT ALL ON public.incident_events TO service_role;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos incidencia lectura" ON public.incident_events
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id));

CREATE POLICY "eventos incidencia alta" ON public.incident_events
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.incidents i WHERE i.id = incident_id));

CREATE TABLE IF NOT EXISTS public.request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.internal_requests(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id),
  tipo text NOT NULL,
  descripcion text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_request_events_request ON public.request_events(request_id, created_at);

GRANT SELECT, INSERT ON public.request_events TO authenticated;
GRANT ALL ON public.request_events TO service_role;
ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos pedido lectura" ON public.request_events
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.internal_requests r WHERE r.id = request_id));

CREATE POLICY "eventos pedido alta" ON public.request_events
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() AND EXISTS (SELECT 1 FROM public.internal_requests r WHERE r.id = request_id));

INSERT INTO public.incident_events (incident_id, actor_id, tipo, descripcion, created_at)
SELECT i.id, i.created_by, 'creada',
       COALESCE((SELECT a.nombre FROM public.areas a WHERE a.id = i.area_origen), 'Un área') ||
       ' reportó la incidencia a ' ||
       COALESCE((SELECT a.nombre FROM public.areas a WHERE a.id = i.area_id), 'sin área responsable'),
       i.created_at
FROM public.incidents i
WHERE NOT EXISTS (SELECT 1 FROM public.incident_events e WHERE e.incident_id = i.id);

INSERT INTO public.incident_events (incident_id, actor_id, tipo, descripcion, created_at)
SELECT i.id, i.asignado_a, 'estado', 'Estado actualizado a "' || replace(i.estado::text, '_', ' ') || '"',
       COALESCE(i.resuelta_at, i.primera_respuesta_at, i.updated_at)
FROM public.incidents i
WHERE i.estado <> 'abierta'
  AND NOT EXISTS (SELECT 1 FROM public.incident_events e WHERE e.incident_id = i.id AND e.tipo = 'estado');

INSERT INTO public.request_events (request_id, actor_id, tipo, descripcion, created_at)
SELECT r.id, r.created_by, 'creado',
       'Pedido solicitado por ' || COALESCE((SELECT a.nombre FROM public.areas a WHERE a.id = r.area_solicitante), 'un área') ||
       ' hacia ' || COALESCE((SELECT a.nombre FROM public.areas a WHERE a.id = r.area_destino), 'sin destino'),
       r.created_at
FROM public.internal_requests r
WHERE NOT EXISTS (SELECT 1 FROM public.request_events e WHERE e.request_id = r.id);

INSERT INTO public.request_events (request_id, actor_id, tipo, descripcion, created_at)
SELECT r.id, r.aprobado_por, 'estado', 'Estado actualizado a "' || replace(r.estado::text, '_', ' ') || '"', r.updated_at
FROM public.internal_requests r
WHERE r.estado <> 'solicitado'
  AND NOT EXISTS (SELECT 1 FROM public.request_events e WHERE e.request_id = r.id AND e.tipo = 'estado');