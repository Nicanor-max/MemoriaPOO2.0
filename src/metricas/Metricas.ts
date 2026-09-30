import { exigirEnteroNoNegativo, exigirPorcentaje } from '../comun/validaciones';
import { DatosMetricas } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IConsultaMemoria } from '../interfaces/IMemoria';
import { IConsultaMetricas, IRegistroMetricas } from '../interfaces/IMetricas';

/**
 * Métricas del simulador (RF09). Se recalculan al final de cada tick.
 * Convención de cambios de contexto: sólo expulsión por quantum con otros listos
 * y bloqueo por E/S (no cuenta despacho inicial, finalización ni renovación de quantum).
 */
export class Metricas implements IRegistroMetricas, IConsultaMetricas, IImprimible<DatosMetricas> {
  private _ticksConCpuOcupada!: number;
  private _cambiosDeContexto!: number;
  private _ocupacionMemoria!: number;
  private _utilizacionCpu!: number;
  private _memoriaLibreTotal!: number;
  private _mayorBloqueLibre!: number;
  private _fragmentacionExterna!: number;

  public constructor() {
    this.setTicksConCpuOcupada(0);
    this.setCambiosDeContexto(0);
    this.setOcupacionMemoria(0);
    this.setUtilizacionCpu(0);
    this.setMemoriaLibreTotal(0);
    this.setMayorBloqueLibre(0);
    this.setFragmentacionExterna(0);
  }

  // ---------- Doble encapsulamiento ----------
  public getTicksConCpuOcupada(): number {
    return this._ticksConCpuOcupada;
  }

  private setTicksConCpuOcupada(valor: number): void {
    exigirEnteroNoNegativo(valor, 'Los ticks con CPU ocupada');
    this._ticksConCpuOcupada = valor;
  }

  public getCambiosDeContexto(): number {
    return this._cambiosDeContexto;
  }

  private setCambiosDeContexto(valor: number): void {
    exigirEnteroNoNegativo(valor, 'Los cambios de contexto');
    this._cambiosDeContexto = valor;
  }

  public getOcupacionMemoria(): number {
    return this._ocupacionMemoria;
  }

  private setOcupacionMemoria(valor: number): void {
    exigirPorcentaje(valor, 'La ocupación de memoria');
    this._ocupacionMemoria = valor;
  }

  public getUtilizacionCpu(): number {
    return this._utilizacionCpu;
  }

  private setUtilizacionCpu(valor: number): void {
    exigirPorcentaje(valor, 'La utilización de CPU');
    this._utilizacionCpu = valor;
  }

  public getMemoriaLibreTotal(): number {
    return this._memoriaLibreTotal;
  }

  private setMemoriaLibreTotal(valor: number): void {
    exigirEnteroNoNegativo(valor, 'La memoria libre total');
    this._memoriaLibreTotal = valor;
  }

  public getMayorBloqueLibre(): number {
    return this._mayorBloqueLibre;
  }

  private setMayorBloqueLibre(valor: number): void {
    exigirEnteroNoNegativo(valor, 'El mayor bloque libre');
    this._mayorBloqueLibre = valor;
  }

  public getFragmentacionExterna(): number {
    return this._fragmentacionExterna;
  }

  private setFragmentacionExterna(valor: number): void {
    exigirPorcentaje(valor, 'La fragmentación externa');
    this._fragmentacionExterna = valor;
  }

  // ---------- IRegistroMetricas ----------
  public registrarUsoDeCpu(ocupada: boolean): void {
    if (ocupada) {
      this.setTicksConCpuOcupada(this.getTicksConCpuOcupada() + 1);
    }
  }

  public registrarCambioDeContexto(): void {
    this.setCambiosDeContexto(this.getCambiosDeContexto() + 1);
  }

  public recalcular(memoria: IConsultaMemoria, ticksTranscurridos: number): void {
    exigirEnteroNoNegativo(ticksTranscurridos, 'Los ticks transcurridos');
    const libre = memoria.getMemoriaLibreTotal();
    const mayor = memoria.getMayorBloqueLibre();
    this.setOcupacionMemoria((100 * memoria.getMemoriaOcupada()) / memoria.getMemoriaTotal());
    this.setUtilizacionCpu(
      ticksTranscurridos === 0 ? 0 : (100 * this.getTicksConCpuOcupada()) / ticksTranscurridos,
    );
    this.setMemoriaLibreTotal(libre);
    this.setMayorBloqueLibre(mayor);
    this.setFragmentacionExterna(libre === 0 ? 0 : 100 * (1 - mayor / libre));
  }

  public estado(): DatosMetricas {
    return Object.freeze({
      ocupacionMemoria: this.getOcupacionMemoria(),
      utilizacionCpu: this.getUtilizacionCpu(),
      cambiosDeContexto: this.getCambiosDeContexto(),
      memoriaLibreTotal: this.getMemoriaLibreTotal(),
      mayorBloqueLibre: this.getMayorBloqueLibre(),
      fragmentacionExterna: this.getFragmentacionExterna(),
      ticksConCpuOcupada: this.getTicksConCpuOcupada(),
    });
  }
}
