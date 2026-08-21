/**
 * Único sistema de audio de la aplicación: un AudioContext compartido que se
 * desbloquea durante el primer gesto real del usuario (requisito de las
 * políticas de autoplay). Sin él, el contexto creado más tarde queda
 * "suspended" y el aviso nunca suena.
 */
let ctx: AudioContext | null = null;
let desbloqueado = false;
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
    void c.resume().then(() => {
      desbloqueado = c.state === "running";
    });
  };
  window.addEventListener("pointerdown", activar);
  window.addEventListener("keydown", activar);
  window.addEventListener("touchstart", activar);
}

export function audioHabilitado() {
  return desbloqueado;
}

/** Aviso breve y discreto. No hace nada si el usuario aún no interactuó. */
export function beep() {
  const c = ctx;
  if (!c || !desbloqueado) return;
  try {
    if (c.state === "suspended") void c.resume();
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
