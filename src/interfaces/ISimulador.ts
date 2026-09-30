import { DatosBloque, DatosMetricas, DatosProceso } from './Datos';

/** Funcionalidad: operar la simulación. */
export interface ISimulador {
  registrarProceso(pid: string, memoriaRequerida: number, cpuTotal: number): DatosProceso;
  programarEntradaSalida(pid: string, ticksDeCpu: number, duracion: number): void;
  avanzarTick(): void;
  avanzarTicks(cantidad: number): void;
}

/** Funcionalidad: consultar el estado del sistema. */
export interface IConsultaSimulador {
  getTick(): number;
  consultarProceso(pid: string): DatosProceso;
  consultarProcesos(): readonly DatosProceso[];
  consultarProcesoEnCpu(): DatosProceso | null;
  consultarColaListos(): readonly DatosProceso[];
  consultarProcesosEsperando(): readonly DatosProceso[];
  consultarProcesosBloqueados(): readonly DatosProceso[];
  consultarProcesosTerminados(): readonly DatosProceso[];
  consultarMapaMemoria(): readonly DatosBloque[];
  consultarMetricas(): DatosMetricas;
  consultarHistorialEjecucion(): readonly (string | null)[];
}
