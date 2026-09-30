import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { exigirEnteroPositivo } from '../comun/validaciones';
import { DatosConfiguracion } from '../interfaces/Datos';
import { IConfiguracion } from '../interfaces/IConfiguracion';
import { IImprimible } from '../interfaces/IImprimible';
import { IPoliticaAsignacion } from '../interfaces/IMemoria';
import { PrimerAjuste } from '../memoria/politicas/PrimerAjuste';

/**
 * Parámetros de la simulación (RF01). Valida TODO en el constructor:
 * si algo es inválido se lanza el error antes de crear el Simulador,
 * así nunca queda un estado a medio construir.
 * Valores de referencia: 1024 KB y quantum 2.
 */
export class ConfiguracionSimulacion implements IConfiguracion, IImprimible<DatosConfiguracion> {
  private _memoriaTotal!: number;
  private _quantum!: number;
  private _politica!: IPoliticaAsignacion;

  public constructor(
    memoriaTotal: number = 1024,
    quantum: number = 2,
    politica: IPoliticaAsignacion = new PrimerAjuste(),
  ) {
    this.setMemoriaTotal(memoriaTotal);
    this.setQuantum(quantum);
    this.setPolitica(politica);
  }

  public getMemoriaTotal(): number {
    return this._memoriaTotal;
  }

  private setMemoriaTotal(valor: number): void {
    exigirEnteroPositivo(valor, 'La memoria total');
    this._memoriaTotal = valor;
  }

  public getQuantum(): number {
    return this._quantum;
  }

  private setQuantum(valor: number): void {
    exigirEnteroPositivo(valor, 'El quantum');
    this._quantum = valor;
  }

  public getPolitica(): IPoliticaAsignacion {
    return this._politica;
  }

  private setPolitica(valor: IPoliticaAsignacion): void {
    if (valor === null || valor === undefined) {
      throw new ErrorDeDominio('Se debe indicar una política de asignación.');
    }
    this._politica = valor;
  }

  public estado(): DatosConfiguracion {
    return Object.freeze({
      memoriaTotal: this.getMemoriaTotal(),
      quantum: this.getQuantum(),
      politica: this.getPolitica().getNombre(),
    });
  }
}
