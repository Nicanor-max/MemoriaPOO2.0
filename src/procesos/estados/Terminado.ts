import { EstadoProceso } from './EstadoProceso';

/** TERMINADO: no admite ninguna transición (hereda todas las que lanzan error). */
export class Terminado extends EstadoProceso {
  public constructor() {
    super('TERMINADO');
  }

  public override permiteProgramarEntradaSalida(): boolean {
    return false;
  }
}
