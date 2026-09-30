import { exigir, exigirEnteroNoNegativo, exigirEnteroPositivo } from '../comun/Validador';
import { DatosBloque } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IBloqueConsultable, IBloqueModificable } from '../interfaces/IMemoria';

/** Partición contigua de la RAM: inicio, tamaño y proceso que la ocupa (o libre). */
export class BloqueMemoria implements IBloqueConsultable, IBloqueModificable, IImprimible<DatosBloque> {
  private _inicio!: number;
  private _tamanio!: number;
  private _pidAsignado!: string | null;

  public constructor(inicio: number, tamanio: number) {
    this.setInicio(inicio);
    this.setTamanio(tamanio);
    this.setPidAsignado(null);
  }

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

  /** Nunca hay bloques de tamaño 0. */
  private setTamanio(valor: number): void {
    exigirEnteroPositivo(valor, 'El tamaño del bloque');
    this._tamanio = valor;
  }

  public getPidAsignado(): string | null {
    return this._pidAsignado;
  }

  private setPidAsignado(valor: string | null): void {
    this._pidAsignado = valor;
  }

  public getFin(): number {
    return this.getInicio() + this.getTamanio() - 1;
  }

  public estaLibre(): boolean {
    return this.getPidAsignado() === null;
  }

  public asignarA(pid: string): void {
    exigir(this.estaLibre(), `El bloque en ${this.getInicio()} ya está ocupado.`);
    this.setPidAsignado(pid);
  }

  public liberar(): void {
    exigir(!this.estaLibre(), `El bloque en ${this.getInicio()} ya está libre.`);
    this.setPidAsignado(null);
  }

  public recortarA(tamanio: number): void {
    exigir(tamanio <= this.getTamanio(), 'Un bloque no puede agrandarse al recortarlo.');
    this.setTamanio(tamanio);
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
