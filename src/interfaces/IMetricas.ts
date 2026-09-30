import { IConsultaMemoria } from './IMemoria';

/** Funcionalidad: registrar eventos y recalcular métricas (RF09). */
export interface IRegistroMetricas {
  registrarUsoDeCpu(ocupada: boolean): void;
  registrarCambioDeContexto(): void;
  recalcular(memoria: IConsultaMemoria, ticksTranscurridos: number): void;
}

/** Funcionalidad: consultar métricas (RF09). */
export interface IConsultaMetricas {
  getOcupacionMemoria(): number;
  getUtilizacionCpu(): number;
  getCambiosDeContexto(): number;
  getMemoriaLibreTotal(): number;
  getMayorBloqueLibre(): number;
  getFragmentacionExterna(): number;
  getTicksConCpuOcupada(): number;
}
