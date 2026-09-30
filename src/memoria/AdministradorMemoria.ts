import { exigir, exigirEnteroPositivo } from '../comun/Validador';
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
 * Administrador de memoria contigua. Mantiene los bloques ordenados y sus invariantes.
 * QUÉ hueco usar lo decide la política (polimorfismo): no hay "if algoritmo == ...".
 */
export class AdministradorMemoria
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

  // ======================= Getters y setters =======================
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

  /** Privado: la lista de bloques nunca sale hacia afuera. */
  private getBloques(): BloqueMemoria[] {
    return this._bloques;
  }

  /** El setter de la colección verifica los invariantes antes de guardarla. */
  private setBloques(valor: BloqueMemoria[]): void {
    this.verificarInvariantes(valor);
    this._bloques = valor;
  }

  // ======================= Asignación =======================
  /** Devuelve false, sin modificar nada, si no hay un hueco contiguo suficiente. */
  public asignar(pid: string, tamanio: number): boolean {
    exigirEnteroPositivo(tamanio, 'El tamaño solicitado');
    exigir(!this.tieneMemoriaAsignada(pid), `El proceso ${pid} ya tiene memoria asignada.`);
    const elegidos = this.getPolitica().elegir(this.getBloques(), tamanio);
    this.getBloques()
      .filter((bloque) => elegidos.includes(bloque))
      .forEach((bloque) => this.ocupar(bloque, pid, tamanio));
    return elegidos.length > 0;
  }

  /** Parte el bloque: la parte pedida queda ocupada y el sobrante (si hay) queda libre. */
  private ocupar(bloque: BloqueMemoria, pid: string, tamanio: number): void {
    const sobrantes = [bloque.getTamanio() - tamanio]
      .filter((sobrante) => sobrante > 0)
      .map((sobrante) => new BloqueMemoria(bloque.getInicio() + tamanio, sobrante));
    bloque.recortarA(tamanio);
    bloque.asignarA(pid);
    const posicion = this.getBloques().indexOf(bloque) + 1;
    this.setBloques([
      ...this.getBloques().slice(0, posicion),
      ...sobrantes,
      ...this.getBloques().slice(posicion),
    ]);
  }

  // ======================= Liberación =======================
  public liberar(pid: string): void {
    const bloque = this.getBloques().find((b) => b.getPidAsignado() === pid);
    exigir(bloque !== undefined, `El proceso ${pid} no tiene memoria asignada.`);
    bloque.liberar();
    this.coalescencia();
  }

  /**
   * Fusiona los bloques libres contiguos. Los bloques ocupados NO se mueven
   * (no es compactación): se rearman los huecos libres entre ellos, cada hueco en un solo bloque.
   */
  private coalescencia(): void {
    const ocupados = this.getBloques().filter((bloque) => !bloque.estaLibre());
    const bordes = [0, ...ocupados.flatMap((b) => [b.getInicio(), b.getFin() + 1]), this.getMemoriaTotal()];
    const huecos = bordes
      .filter((_, i) => i % 2 === 0)
      .map((inicio, i) => ({ inicio, fin: bordes[2 * i + 1] }))
      .filter((hueco) => hueco.fin > hueco.inicio)
      .map((hueco) => new BloqueMemoria(hueco.inicio, hueco.fin - hueco.inicio));
    this.setBloques([...ocupados, ...huecos].sort((a, b) => a.getInicio() - b.getInicio()));
  }

  // ======================= Consultas =======================
  public getMemoriaLibreTotal(): number {
    return this.bloquesLibres().reduce((suma, bloque) => suma + bloque.getTamanio(), 0);
  }

  public getMemoriaOcupada(): number {
    return this.getMemoriaTotal() - this.getMemoriaLibreTotal();
  }

  public getMayorBloqueLibre(): number {
    return Math.max(0, ...this.bloquesLibres().map((bloque) => bloque.getTamanio()));
  }

  public getNombrePolitica(): string {
    return this.getPolitica().getNombre();
  }

  public tieneMemoriaAsignada(pid: string): boolean {
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

  private bloquesLibres(): BloqueMemoria[] {
    return this.getBloques().filter((bloque) => bloque.estaLibre());
  }

  /** Invariantes: empieza en 0, sin huecos ni solapamientos, suma el total y nunca dos libres juntos. */
  private verificarInvariantes(bloques: BloqueMemoria[]): void {
    const fin = bloques.reduce((direccion, bloque) => {
      exigir(bloque.getInicio() === direccion, `Memoria inconsistente en la dirección ${direccion}.`);
      return direccion + bloque.getTamanio();
    }, 0);
    exigir(fin === this.getMemoriaTotal(), 'Memoria inconsistente: los bloques no suman el total.');
    exigir(
      bloques.slice(1).every((bloque, i) => !(bloque.estaLibre() && bloques[i].estaLibre())),
      'Memoria inconsistente: hay dos bloques libres juntos.',
    );
  }
}
