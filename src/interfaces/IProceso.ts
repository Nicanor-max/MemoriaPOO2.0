import { DatosProceso } from './Datos';
import { IImprimible } from './IImprimible';

/** Funcionalidad: consultar el proceso (sólo lectura). */
export interface IProcesoConsultable {
  getPid(): string;
  getMemoriaRequerida(): number;
  getCpuTotal(): number;
  getCpuRestante(): number;
  getCpuConsumida(): number;
  getNombreEstado(): string;
  getQuantumConsumido(): number;
  getBloqueoRestante(): number;
  estaPendienteDeMemoria(): boolean;
  haFinalizadoSuCpu(): boolean;
  agotoQuantum(quantum: number): boolean;
  debeBloquearse(): boolean;
}

/** Funcionalidad: ciclo de vida (admisión y uso de CPU). */
export interface IProcesoCicloDeVida {
  admitir(): void;
  esperarMemoria(): void;
  despachar(): void;
  ejecutarUnaUnidad(): void;
  renovarQuantum(quantum: number): void;
  expulsar(): void;
  terminar(): void;
}

/** Funcionalidad: entrada/salida. */
export interface IProcesoEntradaSalida {
  programarEntradaSalida(ticksDeCpu: number, duracion: number): void;
  bloquear(): void;
  avanzarBloqueo(): boolean;
  desbloquear(): void;
}

/** Lo que necesitan el Simulador y el Planificador: las tres funcionalidades juntas. */
export interface IProcesoPlanificable
  extends IProcesoConsultable, IProcesoCicloDeVida, IProcesoEntradaSalida, IImprimible<DatosProceso> {}
