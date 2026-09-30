import {
  DatosBloque,
  DatosConfiguracion,
  DatosMetricas,
  DatosProceso,
} from './Datos';

/** Funcionalidad: operar la simulación (RF02, RF06, RF08). */
export interface ISimulador {
  registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number): DatosProceso;
  programarEntradaSalida(pid: number, ticksDeCpu: number, duracion: number): void;
  avanzarTick(): void;
  avanzarTicks(cantidad: number): void;
}

/** Funcionalidad: consultar el estado del sistema (RF10). */
export interface IConsultaSimulador {
  getTick(): number;
  consultarConfiguracion(): DatosConfiguracion;
  consultarProceso(pid: number): DatosProceso;
  consultarProcesos(): readonly DatosProceso[];
  consultarProcesoEnCpu(): DatosProceso | null;
  consultarColaListos(): readonly DatosProceso[];
  consultarProcesosEsperando(): readonly DatosProceso[];
  consultarProcesosBloqueados(): readonly DatosProceso[];
  consultarProcesosTerminados(): readonly DatosProceso[];
  consultarMapaMemoria(): readonly DatosBloque[];
  consultarMetricas(): DatosMetricas;
  consultarHistorialEjecucion(): readonly (number | null)[];
}
