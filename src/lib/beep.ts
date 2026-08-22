/**
 * Único sistema de audio de la aplicación: un AudioContext compartido que se
 * desbloquea con el primer gesto real del usuario (requisito de las políticas
 * de autoplay). Los escuchas se registran desde la raíz de la app, antes del
 * login, para que el propio clic de ingreso sirva de desbloqueo.
 */
let ctx: AudioContext | null = null;
let escuchando = false;

function crearContexto(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

/** Registra los escuchas de gesto que habilitan el audio (idempotente). */
export function prepararAudio() {
  if (escuchando || typeof window === "undefined") return;
  escuchando = true;
  const activar = () => {
    const c = crearContexto();
    if (!c) return;
    if (c.state !== "running") void c.resume().catch(() => undefined);
  };
  window.addEventListener("pointerdown", activar, { capture: true });
  window.addEventListener("keydown", activar, { capture: true });
  window.addEventListener("touchstart", activar, { capture: true });
  window.addEventListener("click", activar, { capture: true });
}

/** El audio se considera disponible si existe un contexto reanudable. */
export function audioHabilitado() {
  return ctx !== null;
}

/** Aviso breve y discreto. Reanuda el contexto si quedó suspendido. */
export async function beep() {
  const c = ctx;
  if (!c) return;
  try {
    if (c.state === "suspended") {
      await c.resume().catch(() => undefined);
    }
    if (c.state !== "running") return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.2);
  } catch {
    /* audio no disponible: la interfaz sigue funcionando */
  }
}
