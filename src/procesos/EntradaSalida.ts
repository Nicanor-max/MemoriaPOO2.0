import { exigirEnteroPositivo } from '../comun/Validador';
import { DatosEntradaSalida } from '../interfaces/Datos';
import { IEntradaSalida } from '../interfaces/IEntradaSalida';
import { IImprimible } from '../interfaces/IImprimible';

/** Evento de E/S determinista: después de "ticksDeCpu" de CPU, se bloquea "duracion" ticks. */
export class EntradaSalida implements IEntradaSalida, IImprimible<DatosEntradaSalida> {
  private _ticksDeCpu!: number;
  private _duracion!: number;

  public constructor(ticksDeCpu: number, duracion: number) {
    this.setTicksDeCpu(ticksDeCpu);
    this.setDuracion(duracion);
  }

  public getTicksDeCpu(): number {
    return this._ticksDeCpu;
  }

  private setTicksDeCpu(valor: number): void {
    exigirEnteroPositivo(valor, 'Los ticks de CPU antes de la E/S');
    this._ticksDeCpu = valor;
  }

  public getDuracion(): number {
    return this._duracion;
  }

  private setDuracion(valor: number): void {
    exigirEnteroPositivo(valor, 'La duración de la E/S');
    this._duracion = valor;
  }

  public estaProgramada(): boolean {
    return true;
  }

  public correspondeDispararEn(cpuConsumida: number): boolean {
    return cpuConsumida === this.getTicksDeCpu();
  }

  public estado(): DatosEntradaSalida {
    return Object.freeze({ ticksDeCpu: this.getTicksDeCpu(), duracion: this.getDuracion() });
  }
}
