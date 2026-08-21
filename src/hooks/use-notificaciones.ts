import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { contarNotificaciones, marcarModuloVisto } from "@/lib/hotel.functions";

export type Modulo = "incidencias" | "pedidos" | "comunicados" | "turnos" | "administracion";

const rutaModulo: Record<string, Modulo> = {
  "/incidencias": "incidencias",
  "/pedidos": "pedidos",
  "/comunicados": "comunicados",
  "/turnos": "turnos",
  "/admin": "administracion",
};

/** Línea base de contadores, fuera del componente para sobrevivir remontajes. */
let previoGlobal: Record<Modulo, number> | null = null;

export function useNotificaciones() {
  const contar = useServerFn(contarNotificaciones);
  const marcar = useServerFn(marcarModuloVisto);
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    if (!data) return;
    const actual = data as Record<Modulo, number>;
    const anterior = previoGlobal;
    previoGlobal = actual;
    if (!anterior || !audioHabilitado()) return;
    const hayNuevas = (Object.keys(actual) as Modulo[]).some((m) => actual[m] > (anterior[m] ?? 0));
    if (hayNuevas) beep();
  }, [data]);


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
