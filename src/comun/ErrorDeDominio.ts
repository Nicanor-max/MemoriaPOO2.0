/**
 * Error que se lanza cuando se intenta romper una regla del dominio.
 * Herencia "es un": un ErrorDeDominio ES UN Error y lo sustituye en cualquier try/catch.
 */
export class ErrorDeDominio extends Error {
  public constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeDominio';
  }
}
