
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.es_gerencia(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.area_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_gerencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.area_usuario(uuid) TO authenticated;
