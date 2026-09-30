import { IEstadoProceso } from '../../interfaces/IEstadoProceso';
import { EsperandoMemoria } from './EsperandoMemoria';
import { EstadoProceso } from './EstadoProceso';
import { Listo } from './Listo';

/** NUEVO: recién registrado; espera la fase de admisión. */
export class Nuevo extends EstadoProceso {
  public constructor() {
    super('NUEVO');
  }

  public override estaPendienteDeMemoria(): boolean {
    return true;
  }

  public override admitir(): IEstadoProceso {
    return new Listo();
  }

  public override esperarMemoria(): IEstadoProceso {
    return new EsperandoMemoria();
  }
}
