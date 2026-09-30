import { DatosBloque } from './Datos';

/** Funcionalidad: leer un bloque de memoria. */
export interface IBloqueConsultable {
  getInicio(): number;
  getTamanio(): number;
  getFin(): number;
  getPidAsignado(): number | null;
  estaLibre(): boolean;
}

/** Funcionalidad: modificar un bloque (sólo la usa el GestorMemoria). */
export interface IBloqueModificable {
  asignarA(pid: number): void;
  liberar(): void;
  recortarA(tamanio: number): void;
  absorber(vecinoDerecho: IBloqueConsultable): void;
}

/** Funcionalidad: elegir un hueco (First-Fit, Best-Fit, Worst-Fit) (RF04). */
export interface IPoliticaAsignacion {
  getNombre(): string;
  elegirBloque(bloques: ReadonlyArray<IBloqueConsultable>, tamanio: number): IBloqueConsultable | null;
}

/** Funcionalidad: asignar memoria contigua (RF04). */
export interface IAsignadorMemoria {
  asignar(pid: number, tamanio: number): boolean;
}

/** Funcionalidad: liberar memoria con coalescencia (RF05). */
export interface ILiberadorMemoria {
  liberar(pid: number): void;
}

/** Funcionalidad: consultar la memoria (RF09 / RF10). */
export interface IConsultaMemoria {
  getMemoriaTotal(): number;
  getMemoriaOcupada(): number;
  getMemoriaLibreTotal(): number;
  getMayorBloqueLibre(): number;
  getNombrePolitica(): string;
  tieneMemoriaAsignada(pid: number): boolean;
  consultarMapa(): readonly DatosBloque[];
}
