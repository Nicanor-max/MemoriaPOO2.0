import { exigir, exigirEnteroNoNegativo } from '../comun/Validador';
import { DatosMetricas } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IConsultaMemoria } from '../interfaces/IMemoria';
import { IConsultaMetricas, IRegistroMetricas } from '../interfaces/IMetricas';
import { ResultadoTick } from '../interfaces/IPlanificacion';

/**
 * Métricas, recalculadas al final de cada tick.
 * Math.max(x, 1) evita dividir por 0 sin usar if: en el tick 0 y con memoria llena da 0 %.
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

  // ======================= Getters y setters =======================
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
    this.exigirPorcentaje(valor);
    this._ocupacionMemoria = valor;
  }

  public getUtilizacionCpu(): number {
    return this._utilizacionCpu;
  }

  private setUtilizacionCpu(valor: number): void {
    this.exigirPorcentaje(valor);
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
    this.exigirPorcentaje(valor);
    this._fragmentacionExterna = valor;
  }

  // ======================= Registro =======================
  /** Number(true) = 1 y Number(false) = 0: suma un tick ocupado sólo si hubo proceso. */
  public registrarTick(resultado: ResultadoTick): void {
    this.setTicksConCpuOcupada(this.getTicksConCpuOcupada() + Number(resultado.pidEjecutado !== null));
    this.setCambiosDeContexto(this.getCambiosDeContexto() + resultado.cambiosDeContexto);
  }

  public recalcular(memoria: IConsultaMemoria, ticksTranscurridos: number): void {
    exigirEnteroNoNegativo(ticksTranscurridos, 'Los ticks transcurridos');
    const libre = memoria.getMemoriaLibreTotal();
    const mayor = memoria.getMayorBloqueLibre();
    this.setOcupacionMemoria((100 * memoria.getMemoriaOcupada()) / memoria.getMemoriaTotal());
    this.setUtilizacionCpu((100 * this.getTicksConCpuOcupada()) / Math.max(ticksTranscurridos, 1));
    this.setMemoriaLibreTotal(libre);
    this.setMayorBloqueLibre(mayor);
    // 100 × (1 − mayor/libre) = 100 × (libre − mayor) / libre ; con libre = 0 da 0 %.
    this.setFragmentacionExterna((100 * (libre - mayor)) / Math.max(libre, 1));
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

  private exigirPorcentaje(valor: number): void {
    exigir(valor >= 0 && valor <= 100, `Un porcentaje debe estar entre 0 y 100 (recibido: ${valor}).`);
  }
}
