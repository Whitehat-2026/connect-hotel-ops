import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { contarNotificaciones, marcarModuloVisto } from "@/lib/hotel.functions";
import { audioHabilitado, beep, prepararAudio } from "@/lib/beep";
import { useSesion } from "@/hooks/use-sesion";

export type Modulo = "incidencias" | "pedidos" | "comunicados" | "turnos" | "administracion";

const rutaModulo: Record<string, Modulo> = {
  "/incidencias": "incidencias",
  "/pedidos": "pedidos",
  "/comunicados": "comunicados",
  "/turnos": "turnos",
  "/admin": "administracion",
};

/**
 * Línea base de contadores por usuario, fuera del componente para sobrevivir
 * remontajes. Al cambiar de usuario (o cerrar sesión) se descarta la anterior.
 */
let previoUsuario: string | null = null;
let previoGlobal: Record<Modulo, number> | null = null;

export function useNotificaciones() {
  const contar = useServerFn(contarNotificaciones);
  const marcar = useServerFn(marcarModuloVisto);
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { sesion } = useSesion();
  const userId = sesion?.userId ?? null;

  useEffect(() => {
    prepararAudio();
  }, []);

  const { data } = useQuery({
    queryKey: ["notificaciones"],
    queryFn: () => contar(),
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  useEffect(() => {
    if (!data || !userId) return;
    const actual = data as Record<Modulo, number>;
    const mismoUsuario = previoUsuario === userId;
    const anterior = mismoUsuario ? previoGlobal : null;
    // La línea base se actualiza siempre y de inmediato: una misma novedad
    // nunca vuelve a sonar en pollings posteriores.
    previoUsuario = userId;
    previoGlobal = actual;
    if (!anterior || !audioHabilitado()) return;
    const hayNuevas = (Object.keys(actual) as Modulo[]).some((m) => actual[m] > (anterior[m] ?? 0));
    // Un solo beep aunque aumenten varios módulos a la vez.
    if (hayNuevas) void beep();
  }, [data, userId]);

  const mMarcar = useMutation({
    mutationFn: (modulo: Modulo) => marcar({ data: { modulo } as never }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }),
  });
  const marcarRef = useRef(mMarcar.mutate);
  marcarRef.current = mMarcar.mutate;

  useEffect(() => {
    const modulo = Object.entries(rutaModulo).find(([ruta]) => pathname.startsWith(ruta))?.[1];
    if (modulo) marcarRef.current(modulo);
  }, [pathname]);

  return {
    contadores: (data ?? { incidencias: 0, pedidos: 0, comunicados: 0, turnos: 0, administracion: 0 }) as Record<
      Modulo,
      number
    >,
  };
}
