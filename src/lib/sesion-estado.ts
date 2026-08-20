/**
 * Estado mínimo del cierre de sesión.
 * Marca la transición de logout para que ninguna server function protegida
 * se ejecute (ni siquiera se envíe al servidor) mientras la sesión se cierra.
 */
let cerrandoSesion = false;

export class SesionCerradaError extends Error {
  constructor() {
    super("Sesión cerrada");
    this.name = "SesionCerradaError";
  }
}

export function iniciarCierreSesion() {
  cerrandoSesion = true;
}

export function estaCerrandoSesion() {
  return cerrandoSesion;
}
