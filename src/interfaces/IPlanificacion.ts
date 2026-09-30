import { DatosProceso } from './Datos';
import { IProcesoConsultable, IProcesoPlanificable } from './IProceso';

/** Lo que pasó en la CPU durante un tick. */
export interface ResultadoTick {
  readonly pidEjecutado: string | null;
  readonly terminados: readonly IProcesoConsultable[];
  readonly cambiosDeContexto: number;
}

/** Funcionalidad: planificar (lo usa el Simulador). */
export interface IPlanificador {
  encolar(proceso: IProcesoPlanificable): void;
  actualizarBloqueados(): void;
  ejecutarTick(): ResultadoTick;
}

/** Funcionalidad: consultar CPU y colas. */
export interface IConsultaPlanificador {
  getQuantum(): number;
  consultarProcesoEnCpu(): DatosProceso | null;
  consultarColaListos(): readonly DatosProceso[];
  consultarBloqueados(): readonly DatosProceso[];
  consultarHistorialEjecucion(): readonly (string | null)[];
}

/** Funcionalidad: controlar la CPU (lo usan las reglas de fin de unidad). */
export interface IControlCpu {
  getQuantum(): number;
  hayProcesosListos(): boolean;
  liberarCpu(): void;
  encolar(proceso: IProcesoPlanificable): void;
  agregarBloqueado(proceso: IProcesoPlanificable): void;
}

/** Funcionalidad: decidir qué pasa después de ejecutar una unidad de CPU. */
export interface IReglaCpu {
  aplica(proceso: IProcesoPlanificable, cpu: IControlCpu): boolean;
  aplicar(proceso: IProcesoPlanificable, cpu: IControlCpu): ResultadoTick;
}
