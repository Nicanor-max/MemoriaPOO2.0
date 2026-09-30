import { exigirEnteroPositivo } from '../comun/validaciones';
import { DatosEventoEntradaSalida } from '../interfaces/Datos';
import { IEventoEntradaSalida } from '../interfaces/IEventoEntradaSalida';
import { IImprimible } from '../interfaces/IImprimible';

/**
 * Evento de E/S determinista (RF08): "después de N ticks de CPU consumidos,
 * el proceso se bloquea durante D ticks". Es inmutable: sus setters son privados
 * y sólo se usan en el constructor.
 */
export class EventoEntradaSalida
  implements IEventoEntradaSalida, IImprimible<DatosEventoEntradaSalida>
{
  private _ticksDeCpu!: number;
  private _duracion!: number;

  public constructor(ticksDeCpu: number, duracion: number) {
    this.setTicksDeCpu(ticksDeCpu);
    this.setDuracion(duracion);
  }

  // ---------- Doble encapsulamiento: getters públicos, setters privados que validan ----------
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

  // ---------- Comportamiento ----------
  public correspondeDispararEn(cpuConsumida: number): boolean {
    return cpuConsumida === this.getTicksDeCpu();
  }

  public estado(): DatosEventoEntradaSalida {
    return Object.freeze({ ticksDeCpu: this.getTicksDeCpu(), duracion: this.getDuracion() });
  }
}
