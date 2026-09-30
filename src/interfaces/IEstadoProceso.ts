/**
 * Contrato de un estado del proceso (patrón Estado).
 * Cada transición devuelve el estado siguiente; si no está permitida, lanza error.
 */
export interface IEstadoProceso {
  getNombre(): string;
  estaPendienteDeMemoria(): boolean;
  permiteProgramarEntradaSalida(): boolean;
  admitir(): IEstadoProceso;
  esperarMemoria(): IEstadoProceso;
  despachar(): IEstadoProceso;
  ejecutar(): IEstadoProceso;
  expulsar(): IEstadoProceso;
  bloquear(): IEstadoProceso;
  avanzarBloqueo(): IEstadoProceso;
  desbloquear(): IEstadoProceso;
  terminar(): IEstadoProceso;
}
