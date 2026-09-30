import { IEstadoProceso } from '../../interfaces/IEstadoProceso';
import { EstadoProceso } from './EstadoProceso';
import { Listo } from './Listo';

/** BLOQUEADO: esperando que termine su E/S. Conserva la memoria, no usa CPU. */
export class Bloqueado extends EstadoProceso {
  public constructor() {
    super('BLOQUEADO');
  }

  public override avanzarBloqueo(): IEstadoProceso {
    return this;
  }

  public override desbloquear(): IEstadoProceso {
    return new Listo();
  }
}
