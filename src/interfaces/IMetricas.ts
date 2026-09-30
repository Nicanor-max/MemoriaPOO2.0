import { IConsultaMemoria } from './IMemoria';
import { ResultadoTick } from './IPlanificacion';

/** Funcionalidad: registrar y recalcular métricas. */
export interface IRegistroMetricas {
  registrarTick(resultado: ResultadoTick): void;
  recalcular(memoria: IConsultaMemoria, ticksTranscurridos: number): void;
}

/** Funcionalidad: consultar métricas. */
export interface IConsultaMetricas {
  getOcupacionMemoria(): number;
  getUtilizacionCpu(): number;
  getCambiosDeContexto(): number;
  getMemoriaLibreTotal(): number;
  getMayorBloqueLibre(): number;
  getFragmentacionExterna(): number;
  getTicksConCpuOcupada(): number;
}
