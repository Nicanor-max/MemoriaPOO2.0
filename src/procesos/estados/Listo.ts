import { IEstadoProceso } from '../../interfaces/IEstadoProceso';
import { Ejecutando } from './Ejecutando';
import { EstadoProceso } from './EstadoProceso';

/** LISTO: tiene memoria y espera en la cola FIFO de listos. */
export class Listo extends EstadoProceso {
  public constructor() {
    super('LISTO');
  }

  public override despachar(): IEstadoProceso {
    return new Ejecutando();
  }
}
