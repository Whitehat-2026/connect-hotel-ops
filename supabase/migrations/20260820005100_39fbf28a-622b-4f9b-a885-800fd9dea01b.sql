REVOKE ALL ON FUNCTION public.proteger_campos_perfil() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proteger_campos_perfil() TO service_role;