import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouterState } from "@tanstack/react-router";
import { contarNotificaciones, marcarModuloVisto } from "@/lib/hotel.functions";

export type Modulo = "incidencias" | "pedidos" | "comunicados" | "turnos";

const rutaModulo: Record<string, Modulo> = {
  "/incidencias": "incidencias",
  "/pedidos": "pedidos",
  "/comunicados": "comunicados",
  "/turnos": "turnos",
};

/** Beep breve y discreto generado localmente con WebAudio. */
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio no disponible: la interfaz sigue funcionando */
  }
}

export function useNotificaciones() {
  const contar = useServerFn(contarNotificaciones);
  const marcar = useServerFn(marcarModuloVisto);
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const previo = useRef<Record<Modulo, number> | null>(null);
  const interaccion = useRef(false);

  useEffect(() => {
    const activar = () => {
      interaccion.current = true;
    };
    window.addEventListener("pointerdown", activar, { once: true });
    window.addEventListener("keydown", activar, { once: true });
    return () => {
      window.removeEventListener("pointerdown", activar);
      window.removeEventListener("keydown", activar);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["notificaciones"],
    queryFn: () => contar(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!data) return;
    const actual = data as Record<Modulo, number>;
    const anterior = previo.current;
    previo.current = actual;
    if (!anterior || !interaccion.current) return;
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
    contadores: (data ?? { incidencias: 0, pedidos: 0, comunicados: 0, turnos: 0 }) as Record<
      Modulo,
      number
    >,
  };
}
