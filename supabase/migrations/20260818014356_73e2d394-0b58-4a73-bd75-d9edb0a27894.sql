
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.es_gerencia(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.area_usuario(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.es_gerencia(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.area_usuario(uuid) TO authenticated, service_role;
