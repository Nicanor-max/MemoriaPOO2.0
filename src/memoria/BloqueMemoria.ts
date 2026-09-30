import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { exigirEnteroNoNegativo, exigirEnteroPositivo } from '../comun/validaciones';
import { DatosBloque } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IBloqueConsultable, IBloqueModificable } from '../interfaces/IMemoria';

/** Bloque contiguo de memoria: inicio, tamaño y proceso asignado o libre (RF04). */
export class BloqueMemoria implements IBloqueConsultable, IBloqueModificable, IImprimible<DatosBloque> {
  private _inicio!: number;
  private _tamanio!: number;
  private _pidAsignado!: number | null;

  public constructor(inicio: number, tamanio: number, pidAsignado: number | null = null) {
    this.setInicio(inicio);
    this.setTamanio(tamanio);
    this.setPidAsignado(pidAsignado);
  }

  // ---------- Doble encapsulamiento ----------
  public getInicio(): number {
    return this._inicio;
  }

  private setInicio(valor: number): void {
    exigirEnteroNoNegativo(valor, 'El inicio del bloque');
    this._inicio = valor;
  }

  public getTamanio(): number {
    return this._tamanio;
  }

  /** Un bloque nunca puede tener tamaño 0 (RF04: el ajuste exacto no genera bloques vacíos). */
  private setTamanio(valor: number): void {
    exigirEnteroPositivo(valor, 'El tamaño del bloque');
    this._tamanio = valor;
  }

  public getPidAsignado(): number | null {
    return this._pidAsignado;
  }

  private setPidAsignado(valor: number | null): void {
    if (valor !== null) {
      exigirEnteroPositivo(valor, 'El PID asignado');
    }
    this._pidAsignado = valor;
  }

  // ---------- IBloqueConsultable ----------
  public getFin(): number {
    return this.getInicio() + this.getTamanio() - 1;
  }

  public estaLibre(): boolean {
    return this.getPidAsignado() === null;
  }

  // ---------- IBloqueModificable ----------
  public asignarA(pid: number): void {
    if (!this.estaLibre()) {
      throw new ErrorDeDominio(`El bloque en ${this.getInicio()} ya está ocupado.`);
    }
    this.setPidAsignado(pid);
  }

  public liberar(): void {
    if (this.estaLibre()) {
      throw new ErrorDeDominio(`El bloque en ${this.getInicio()} ya está libre.`);
    }
    this.setPidAsignado(null);
  }

  /** Achica el bloque (el sobrante lo crea el GestorMemoria como un bloque nuevo). */
  public recortarA(tamanio: number): void {
    if (tamanio >= this.getTamanio()) {
      throw new ErrorDeDominio('Sólo se recorta un bloque cuando sobra espacio.');
    }
    this.setTamanio(tamanio);
  }

  /** Coalescencia: absorbe al vecino libre inmediatamente a la derecha (RF05). */
  public absorber(vecinoDerecho: IBloqueConsultable): void {
    if (!this.estaLibre() || !vecinoDerecho.estaLibre()) {
      throw new ErrorDeDominio('Sólo se fusionan bloques libres.');
    }
    if (vecinoDerecho.getInicio() !== this.getFin() + 1) {
      throw new ErrorDeDominio('Sólo se fusionan bloques adyacentes.');
    }
    this.setTamanio(this.getTamanio() + vecinoDerecho.getTamanio());
  }

  public estado(): DatosBloque {
    return Object.freeze({
      inicio: this.getInicio(),
      tamanio: this.getTamanio(),
      fin: this.getFin(),
      pid: this.getPidAsignado(),
      libre: this.estaLibre(),
    });
  }
}
