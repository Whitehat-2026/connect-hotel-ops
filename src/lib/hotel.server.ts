/** Helpers server-only para las server functions (fuera del archivo *.functions.ts). */

/* eslint-disable @typescript-eslint/no-explicit-any */
export function limpiar<T extends object>(obj: T): any {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
