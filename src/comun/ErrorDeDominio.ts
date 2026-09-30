/**
 * Error que se lanza cuando se intenta violar una regla del dominio
 * (configuración inválida, PID repetido, transición de estado prohibida, etc.).
 *
 * Herencia justificada: un ErrorDeDominio ES UN Error de JavaScript y puede
 * sustituirlo en cualquier lugar (try/catch, toThrow en los tests).
 */
export class ErrorDeDominio extends Error {
  public constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeDominio';
  }
}
