import { IEstadoProceso } from '../../interfaces/IEstadoProceso';
import { EstadoProceso } from './EstadoProceso';
import { Listo } from './Listo';

/** ESPERANDO_MEMORIA: no había un hueco contiguo suficiente; se reintenta cada tick. */
export class EsperandoMemoria extends EstadoProceso {
  public constructor() {
    super('ESPERANDO_MEMORIA');
  }

  public override estaPendienteDeMemoria(): boolean {
    return true;
  }

  public override admitir(): IEstadoProceso {
    return new Listo();
  }

  public override esperarMemoria(): IEstadoProceso {
    return this;
  }
}
