import { IPoliticaAsignacion } from './IMemoria';

/** Funcionalidad: parámetros de la simulación (RF01). */
export interface IConfiguracion {
  getMemoriaTotal(): number;
  getQuantum(): number;
  getPolitica(): IPoliticaAsignacion;
}
