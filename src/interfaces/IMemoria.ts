import { DatosBloque } from './Datos';

/** Funcionalidad: leer un bloque. */
export interface IBloqueConsultable {
  getInicio(): number;
  getTamanio(): number;
  getFin(): number;
  getPidAsignado(): string | null;
  estaLibre(): boolean;
}

/** Funcionalidad: modificar un bloque (sólo lo usa el AdministradorMemoria). */
export interface IBloqueModificable {
  asignarA(pid: string): void;
  liberar(): void;
  recortarA(tamanio: number): void;
}

/** Funcionalidad: elegir el hueco (First-Fit, Best-Fit, Worst-Fit). Devuelve 0 o 1 bloque. */
export interface IPoliticaAsignacion {
  getNombre(): string;
  elegir(bloques: ReadonlyArray<IBloqueConsultable>, tamanio: number): IBloqueConsultable[];
}

/** Funcionalidad: asignar memoria contigua. */
export interface IAsignadorMemoria {
  asignar(pid: string, tamanio: number): boolean;
}

/** Funcionalidad: liberar memoria con coalescencia. */
export interface ILiberadorMemoria {
  liberar(pid: string): void;
}

/** Funcionalidad: consultar la memoria. */
export interface IConsultaMemoria {
  getMemoriaTotal(): number;
  getMemoriaOcupada(): number;
  getMemoriaLibreTotal(): number;
  getMayorBloqueLibre(): number;
  tieneMemoriaAsignada(pid: string): boolean;
  consultarMapa(): readonly DatosBloque[];
}
