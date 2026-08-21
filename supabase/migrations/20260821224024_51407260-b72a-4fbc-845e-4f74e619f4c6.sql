REVOKE ALL ON FUNCTION public.puede_ver_vip(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.puede_ver_vip(uuid) TO authenticated, service_role;