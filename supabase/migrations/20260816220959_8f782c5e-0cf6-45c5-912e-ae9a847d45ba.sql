CREATE TABLE public.module_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo text NOT NULL CHECK (modulo IN ('incidencias','pedidos','comunicados','turnos')),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, modulo)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_views TO authenticated;
GRANT ALL ON public.module_views TO service_role;

ALTER TABLE public.module_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cada usuario gestiona sus propias vistas"
ON public.module_views FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_module_views_updated
BEFORE UPDATE ON public.module_views
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();