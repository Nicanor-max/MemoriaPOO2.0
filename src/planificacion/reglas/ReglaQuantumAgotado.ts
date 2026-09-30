import { IControlCpu, IReglaCpu, ResultadoTick } from '../../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../../interfaces/IProceso';

/** Prioridad 3: agotó el quantum y hay otros listos -> vuelve al final de la cola. Cuenta 1 cambio. */
export class ReglaQuantumAgotado implements IReglaCpu {
  public aplica(proceso: IProcesoPlanificable, cpu: IControlCpu): boolean {
    return proceso.agotoQuantum(cpu.getQuantum()) && cpu.hayProcesosListos();
  }

  public aplicar(proceso: IProcesoPlanificable, cpu: IControlCpu): ResultadoTick {
    proceso.expulsar();
    cpu.liberarCpu();
    cpu.encolar(proceso);
    return { pidEjecutado: proceso.getPid(), terminados: [], cambiosDeContexto: 1 };
  }
}
