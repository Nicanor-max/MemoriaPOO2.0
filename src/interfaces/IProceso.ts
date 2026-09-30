import { EstadoProceso } from '../comun/EstadoProceso';
import { DatosProceso } from './Datos';
import { IEventoEntradaSalida } from './IEventoEntradaSalida';
import { IImprimible } from './IImprimible';

/*
 * El proceso tiene CUATRO funcionalidades distintas y cada una es una interfaz.
 * Cada cliente depende sólo de la que usa (Segregación de Interfaces):
 *  - Los tests / vistas sólo consultan              -> IProcesoConsultable
 *  - La fase de admisión del Simulador lo admite    -> IProcesoAdmisible
 *  - El Planificador lo ejecuta en la CPU           -> IProcesoEjecutable
 *  - La E/S lo bloquea y desbloquea                 -> IProcesoEntradaSalida
 */

/** Funcionalidad: consultar datos del proceso (sólo lectura). */
export interface IProcesoConsultable {
  getPid(): number;
  getMemoriaRequerida(): number;
  getCpuTotal(): number;
  getCpuRestante(): number;
  getCpuConsumida(): number;
  getEstado(): EstadoProceso;
  getQuantumConsumido(): number;
  getBloqueoRestante(): number;
}

/** Funcionalidad: admisión en memoria (RF03). */
export interface IProcesoAdmisible {
  esperarMemoria(): void;
  admitir(): void;
}

/** Funcionalidad: uso de la CPU (RF07). */
export interface IProcesoEjecutable {
  despachar(): void;
  ejecutarUnaUnidad(): void;
  haFinalizadoSuCpu(): boolean;
  agotoQuantum(quantum: number): boolean;
  renovarQuantum(): void;
  expulsar(): void;
  terminar(): void;
}

/** Funcionalidad: entrada/salida (RF08). */
export interface IProcesoEntradaSalida {
  programarEntradaSalida(evento: IEventoEntradaSalida): void;
  debeBloquearse(): boolean;
  bloquear(): void;
  avanzarBloqueo(): boolean;
}

/** Lo que necesita el Planificador y la cola de bloqueados de un proceso. */
export interface IProcesoPlanificable
  extends IProcesoConsultable, IProcesoEjecutable, IProcesoEntradaSalida, IImprimible<DatosProceso> {}

/** Lo que necesita el Registro/Simulador: todo lo anterior + admisión. */
export interface IProcesoGestionable extends IProcesoPlanificable, IProcesoAdmisible {}
