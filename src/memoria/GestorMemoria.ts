import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { exigirEnteroPositivo } from '../comun/validaciones';
import { DatosBloque, DatosMemoria } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import {
  IAsignadorMemoria,
  IConsultaMemoria,
  ILiberadorMemoria,
  IPoliticaAsignacion,
} from '../interfaces/IMemoria';
import { BloqueMemoria } from './BloqueMemoria';

/**
 * Memoria contigua (RF04, RF05).
 * Responsabilidad única: mantener la lista ordenada de bloques y sus invariantes:
 *  - empieza en 0, sin huecos ni solapamientos, la suma da la memoria total;
 *  - nunca quedan dos bloques libres juntos (coalescencia).
 * La decisión de QUÉ hueco usar la delega en la política (polimorfismo).
 */
export class GestorMemoria
  implements IAsignadorMemoria, ILiberadorMemoria, IConsultaMemoria, IImprimible<DatosMemoria>
{
  private _memoriaTotal!: number;
  private _politica!: IPoliticaAsignacion;
  private _bloques!: BloqueMemoria[];

  public constructor(memoriaTotal: number, politica: IPoliticaAsignacion) {
    this.setMemoriaTotal(memoriaTotal);
    this.setPolitica(politica);
    this.setBloques([new BloqueMemoria(0, memoriaTotal)]);
  }

  // ---------- Doble encapsulamiento ----------
  public getMemoriaTotal(): number {
    return this._memoriaTotal;
  }

  private setMemoriaTotal(valor: number): void {
    exigirEnteroPositivo(valor, 'La memoria total');
    this._memoriaTotal = valor;
  }

  private getPolitica(): IPoliticaAsignacion {
    return this._politica;
  }

  private setPolitica(valor: IPoliticaAsignacion): void {
    this._politica = valor;
  }

  private getBloques(): BloqueMemoria[] {
    return this._bloques;
  }

  /** El setter de la colección es el guardián de los invariantes. */
  private setBloques(valor: BloqueMemoria[]): void {
    this.verificarInvariantes(valor);
    this._bloques = valor;
  }

  // ---------- IAsignadorMemoria ----------
  /** Devuelve false (sin tocar nada) si no hay un hueco contiguo suficiente. */
  public asignar(pid: number, tamanio: number): boolean {
    if (this.tieneMemoriaAsignada(pid)) {
      throw new ErrorDeDominio(`El proceso ${pid} ya tiene memoria asignada.`);
    }
    const elegido = this.getPolitica().elegirBloque([...this.getBloques()], tamanio);
    if (elegido === null) {
      return false;
    }
    const bloques = [...this.getBloques()];
    const indice = bloques.findIndex((bloque) => bloque === elegido);
    const bloque = bloques[indice];
    if (bloque.getTamanio() > tamanio) {
      const sobrante = new BloqueMemoria(bloque.getInicio() + tamanio, bloque.getTamanio() - tamanio);
      bloque.recortarA(tamanio);
      bloques.splice(indice + 1, 0, sobrante);
    }
    bloque.asignarA(pid);
    this.setBloques(bloques);
    return true;
  }

  // ---------- ILiberadorMemoria ----------
  public liberar(pid: number): void {
    const bloques = [...this.getBloques()];
    const indice = bloques.findIndex((bloque) => bloque.getPidAsignado() === pid);
    if (indice === -1) {
      throw new ErrorDeDominio(`El proceso ${pid} no tiene memoria asignada.`);
    }
    bloques[indice].liberar();
    // Coalescencia con el vecino derecho
    const derecho = bloques[indice + 1];
    if (derecho !== undefined && derecho.estaLibre()) {
      bloques[indice].absorber(derecho);
      bloques.splice(indice + 1, 1);
    }
    // Coalescencia con el vecino izquierdo
    const izquierdo = bloques[indice - 1];
    if (izquierdo !== undefined && izquierdo.estaLibre()) {
      izquierdo.absorber(bloques[indice]);
      bloques.splice(indice, 1);
    }
    this.setBloques(bloques);
  }

  // ---------- IConsultaMemoria ----------
  public getMemoriaLibreTotal(): number {
    return this.bloquesLibres().reduce((suma, bloque) => suma + bloque.getTamanio(), 0);
  }

  public getMemoriaOcupada(): number {
    return this.getMemoriaTotal() - this.getMemoriaLibreTotal();
  }

  public getMayorBloqueLibre(): number {
    return this.bloquesLibres().reduce((mayor, bloque) => Math.max(mayor, bloque.getTamanio()), 0);
  }

  public getNombrePolitica(): string {
    return this.getPolitica().getNombre();
  }

  public tieneMemoriaAsignada(pid: number): boolean {
    return this.getBloques().some((bloque) => bloque.getPidAsignado() === pid);
  }

  public consultarMapa(): readonly DatosBloque[] {
    return Object.freeze(this.getBloques().map((bloque) => bloque.estado()));
  }

  public estado(): DatosMemoria {
    return Object.freeze({
      memoriaTotal: this.getMemoriaTotal(),
      politica: this.getNombrePolitica(),
      memoriaOcupada: this.getMemoriaOcupada(),
      memoriaLibreTotal: this.getMemoriaLibreTotal(),
      mayorBloqueLibre: this.getMayorBloqueLibre(),
      bloques: this.consultarMapa(),
    });
  }

  // ---------- Privados ----------
  private bloquesLibres(): BloqueMemoria[] {
    return this.getBloques().filter((bloque) => bloque.estaLibre());
  }

  private verificarInvariantes(bloques: BloqueMemoria[]): void {
    let direccionEsperada = 0;
    bloques.forEach((bloque, i) => {
      if (bloque.getInicio() !== direccionEsperada) {
        throw new ErrorDeDominio(`Memoria inconsistente: hueco o solapamiento en ${direccionEsperada}.`);
      }
      if (i > 0 && bloque.estaLibre() && bloques[i - 1].estaLibre()) {
        throw new ErrorDeDominio('Memoria inconsistente: dos bloques libres adyacentes.');
      }
      direccionEsperada += bloque.getTamanio();
    });
    if (direccionEsperada !== this.getMemoriaTotal()) {
      throw new ErrorDeDominio('Memoria inconsistente: los bloques no suman la memoria total.');
    }
  }
}
