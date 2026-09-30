import { IEstadoProceso } from '../../interfaces/IEstadoProceso';
import { Bloqueado } from './Bloqueado';
import { EstadoProceso } from './EstadoProceso';
import { Listo } from './Listo';
import { Terminado } from './Terminado';

/** EJECUTANDO: está en la CPU. Desde acá puede terminar, bloquearse o ser expulsado. */
export class Ejecutando extends EstadoProceso {
  public constructor() {
    super('EJECUTANDO');
  }

  public override ejecutar(): IEstadoProceso {
    return this;
  }

  public override expulsar(): IEstadoProceso {
    return new Listo();
  }

  public override bloquear(): IEstadoProceso {
    return new Bloqueado();
  }

  public override terminar(): IEstadoProceso {
    return new Terminado();
  }
}
