/** Formato de fecha/hora único para toda la aplicación: 10/08/2026 - 14:35 */
export function fechaHora(valor?: string | Date | null): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} - ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Solo fecha: 10/08/2026 */
export function soloFecha(valor?: string | Date | null): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor.length <= 10 ? `${valor}T00:00:00` : valor) : valor;
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Solo hora: 14:35 */
export function soloHora(valor?: string | Date | null): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}
