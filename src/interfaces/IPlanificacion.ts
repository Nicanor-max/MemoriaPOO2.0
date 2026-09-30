import { DatosProceso } from './Datos';
import { IProcesoPlanificable } from './IProceso';

/** Lo que informa el planificador después de ejecutar un tick. */
export interface ResultadoTick {
  readonly pidEjecutado: number | null;
  readonly procesoTerminado: IProcesoPlanificable | null;
  readonly procesoBloqueado: IProcesoPlanificable | null;
  readonly huboCambioDeContexto: boolean;
}

/** Funcionalidad: planificar la CPU (RF07). */
export interface IPlanificador {
  encolar(proceso: IProcesoPlanificable): void;
  ejecutarTick(): ResultadoTick;
}

/** Funcionalidad: consultar CPU y cola de listos (RF10). */
export interface IConsultaPlanificador {
  getQuantum(): number;
  estaCpuOcupada(): boolean;
  consultarProcesoEnCpu(): DatosProceso | null;
  consultarColaListos(): readonly DatosProceso[];
  consultarHistorialEjecucion(): readonly (number | null)[];
}

/** Funcionalidad: administrar los procesos bloqueados por E/S (RF08). */
export interface IGestionBloqueos {
  agregar(proceso: IProcesoPlanificable): void;
  actualizarTemporizadores(): IProcesoPlanificable[];
}

/** Funcionalidad: consultar los bloqueados (RF10). */
export interface IConsultaBloqueados {
  getCantidad(): number;
  consultarBloqueados(): readonly DatosProceso[];
}
