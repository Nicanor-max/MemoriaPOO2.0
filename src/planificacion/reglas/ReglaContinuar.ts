import { IControlCpu, IReglaCpu, ResultadoTick } from '../../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../../interfaces/IProceso';

/**
 * Última regla (siempre aplica): sigue en la CPU.
 * Si agotó el quantum pero no hay otros listos, lo renueva sin cambio de contexto.
 */
export class ReglaContinuar implements IReglaCpu {
  public aplica(): boolean {
    return true;
  }

  public aplicar(proceso: IProcesoPlanificable, cpu: IControlCpu): ResultadoTick {
    proceso.renovarQuantum(cpu.getQuantum());
    return { pidEjecutado: proceso.getPid(), terminados: [], cambiosDeContexto: 0 };
  }
}
