DROP POLICY IF EXISTS "turnos edicion" ON public.shift_handovers;

CREATE POLICY "turnos recepcion operativa"
ON public.shift_handovers
FOR UPDATE
TO authenticated
USING (
  recibido_por IS NULL
  AND area_id IS NOT NULL
  AND area_id = public.area_usuario(auth.uid())
  AND entregado_por IS DISTINCT FROM auth.uid()
  AND created_by IS DISTINCT FROM auth.uid()
  AND (public.has_role(auth.uid(), 'colaborador') OR public.has_role(auth.uid(), 'supervisor'))
  AND NOT public.es_gerencia(auth.uid())
)
WITH CHECK (
  recibido_por = auth.uid()
  AND area_id = public.area_usuario(auth.uid())
  AND entregado_por IS DISTINCT FROM auth.uid()
  AND created_by IS DISTINCT FROM auth.uid()
);