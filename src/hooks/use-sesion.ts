import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { obtenerSesion } from "@/lib/hotel.functions";

export type Rol = "admin" | "gerente" | "supervisor" | "colaborador";

export function useSesion() {
  const fn = useServerFn(obtenerSesion);
  const query = useQuery({
    queryKey: ["sesion"],
    queryFn: () => fn(),
    staleTime: 60_000,
    retry: 2,
    retryDelay: 1200,
  });


  const roles = (query.data?.roles ?? []) as Rol[];
  return {
    ...query,
    sesion: query.data,
    roles,
    tieneRol: (...r: Rol[]) => r.some((x) => roles.includes(x)),
    esGerencia: roles.includes("admin") || roles.includes("gerente"),
  };
}
