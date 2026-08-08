/** Helpers server-only para las server functions (fuera del archivo *.functions.ts). */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function limpiar<T extends object>(obj: T): any {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/** Reintenta una lectura cuando el token recién emitido aún no es válido por desfase de reloj. */
export async function conReintento<T>(
  fn: () => Promise<T>,
  esFallo: (r: T) => string | null,
): Promise<T> {
  let r = await fn();
  const msg = esFallo(r);
  if (msg && /issued at future|not yet valid|JWT/i.test(msg)) {
    await new Promise((res) => setTimeout(res, 1500));
    r = await fn();
  }
  return r;
}
