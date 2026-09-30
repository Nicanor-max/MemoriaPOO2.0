import { IControlCpu, IReglaCpu, ResultadoTick } from '../../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../../interfaces/IProceso';

/** Prioridad 2: si se dispara su E/S, se bloquea (conserva memoria). Cuenta 1 cambio de contexto. */
export class ReglaEntradaSalida implements IReglaCpu {
  public aplica(proceso: IProcesoPlanificable): boolean {
    return proceso.debeBloquearse();
  }

  public aplicar(proceso: IProcesoPlanificable, cpu: IControlCpu): ResultadoTick {
    proceso.bloquear();
    cpu.liberarCpu();
    cpu.agregarBloqueado(proceso);
    return { pidEjecutado: proceso.getPid(), terminados: [], cambiosDeContexto: 1 };
  }
}
