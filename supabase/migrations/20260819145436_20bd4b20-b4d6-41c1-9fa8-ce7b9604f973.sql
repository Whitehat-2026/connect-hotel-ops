DROP POLICY IF EXISTS "items gestion" ON public.checklist_items;

CREATE POLICY "items gestion"
ON public.checklist_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.checklists c
    WHERE c.id = checklist_items.checklist_id
      AND (public.es_gerencia(auth.uid())
           OR c.area_id = public.area_usuario(auth.uid())
           OR c.responsable = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.checklists c
    WHERE c.id = checklist_items.checklist_id
      AND (public.es_gerencia(auth.uid())
           OR c.area_id = public.area_usuario(auth.uid())
           OR c.responsable = auth.uid())
  )
  AND (checklist_items.completado_por IS NULL
       OR checklist_items.completado_por = auth.uid())
);