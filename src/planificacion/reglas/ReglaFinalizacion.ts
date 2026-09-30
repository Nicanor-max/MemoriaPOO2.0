import { IControlCpu, IReglaCpu, ResultadoTick } from '../../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../../interfaces/IProceso';

/** Prioridad 1: si no le queda CPU, termina y libera la CPU (la memoria la libera el Simulador). */
export class ReglaFinalizacion implements IReglaCpu {
  public aplica(proceso: IProcesoPlanificable): boolean {
    return proceso.haFinalizadoSuCpu();
  }

  public aplicar(proceso: IProcesoPlanificable, cpu: IControlCpu): ResultadoTick {
    proceso.terminar();
    cpu.liberarCpu();
    return { pidEjecutado: proceso.getPid(), terminados: [proceso], cambiosDeContexto: 0 };
  }
}
