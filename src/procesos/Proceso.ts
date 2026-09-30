import { exigir, exigirEnteroNoNegativo, exigirEnteroPositivo, exigirTexto } from '../comun/Validador';
import { DatosEntradaSalida, DatosProceso } from '../interfaces/Datos';
import { IEntradaSalida } from '../interfaces/IEntradaSalida';
import { IEstadoProceso } from '../interfaces/IEstadoProceso';
import { IImprimible } from '../interfaces/IImprimible';
import { IProcesoCicloDeVida, IProcesoConsultable, IProcesoEntradaSalida } from '../interfaces/IProceso';
import { EntradaSalida } from './EntradaSalida';
import { Nuevo } from './estados/Nuevo';
import { SinEntradaSalida } from './SinEntradaSalida';

/**
 * Bloque de Control de Proceso (PCB). Protege sus contadores y sus transiciones.
 * Doble encapsulamiento: atributos privados con "_" + getters/setters.
 * Los setters son privados y validan; la clase nunca toca "_x" fuera de su get/set.
 */
export class Proceso
  implements IProcesoConsultable, IProcesoCicloDeVida, IProcesoEntradaSalida, IImprimible<DatosProceso>
{
  private _pid!: string;
  private _memoriaRequerida!: number;
  private _cpuTotal!: number;
  private _cpuRestante!: number;
  private _estado!: IEstadoProceso;
  private _quantumConsumido!: number;
  private _bloqueoRestante!: number;
  private _entradaSalida!: IEntradaSalida & IImprimible<DatosEntradaSalida | null>;

  public constructor(pid: string, memoriaRequerida: number, cpuTotal: number) {
    this.setPid(pid);
    this.setMemoriaRequerida(memoriaRequerida);
    this.setCpuTotal(cpuTotal);
    this.setCpuRestante(cpuTotal);
    this.setEstado(new Nuevo());
    this.setQuantumConsumido(0);
    this.setBloqueoRestante(0);
    this.setEntradaSalida(new SinEntradaSalida());
  }

  // ======================= Getters y setters =======================
  public getPid(): string {
    return this._pid;
  }

  private setPid(valor: string): void {
    exigirTexto(valor, 'El PID');
    this._pid = valor;
  }

  public getMemoriaRequerida(): number {
    return this._memoriaRequerida;
  }

  private setMemoriaRequerida(valor: number): void {
    exigirEnteroPositivo(valor, 'La memoria requerida');
    this._memoriaRequerida = valor;
  }

  public getCpuTotal(): number {
    return this._cpuTotal;
  }

  private setCpuTotal(valor: number): void {
    exigirEnteroPositivo(valor, 'El tiempo total de CPU');
    this._cpuTotal = valor;
  }

  public getCpuRestante(): number {
    return this._cpuRestante;
  }

  private setCpuRestante(valor: number): void {
    exigirEnteroNoNegativo(valor, 'La CPU restante');
    this._cpuRestante = valor;
  }

  private getEstado(): IEstadoProceso {
    return this._estado;
  }

  private setEstado(valor: IEstadoProceso): void {
    this._estado = valor;
  }

  public getQuantumConsumido(): number {
    return this._quantumConsumido;
  }

  private setQuantumConsumido(valor: number): void {
    exigirEnteroNoNegativo(valor, 'El quantum consumido');
    this._quantumConsumido = valor;
  }

  public getBloqueoRestante(): number {
    return this._bloqueoRestante;
  }

  private setBloqueoRestante(valor: number): void {
    exigirEnteroNoNegativo(valor, 'El bloqueo restante');
    this._bloqueoRestante = valor;
  }

  private getEntradaSalida(): IEntradaSalida & IImprimible<DatosEntradaSalida | null> {
    return this._entradaSalida;
  }

  private setEntradaSalida(valor: IEntradaSalida & IImprimible<DatosEntradaSalida | null>): void {
    this._entradaSalida = valor;
  }

  // ======================= Consultas =======================
  public getNombreEstado(): string {
    return this.getEstado().getNombre();
  }

  public getCpuConsumida(): number {
    return this.getCpuTotal() - this.getCpuRestante();
  }

  public estaPendienteDeMemoria(): boolean {
    return this.getEstado().estaPendienteDeMemoria();
  }

  public haFinalizadoSuCpu(): boolean {
    return this.getCpuRestante() === 0;
  }

  public agotoQuantum(quantum: number): boolean {
    return this.getQuantumConsumido() >= quantum;
  }

  public debeBloquearse(): boolean {
    return !this.haFinalizadoSuCpu() && this.getEntradaSalida().correspondeDispararEn(this.getCpuConsumida());
  }

  // ======================= Ciclo de vida =======================
  public admitir(): void {
    this.setEstado(this.getEstado().admitir());
  }

  public esperarMemoria(): void {
    this.setEstado(this.getEstado().esperarMemoria());
  }

  public despachar(): void {
    this.setEstado(this.getEstado().despachar());
    this.setQuantumConsumido(0);
  }

  public ejecutarUnaUnidad(): void {
    this.setEstado(this.getEstado().ejecutar());
    exigir(!this.haFinalizadoSuCpu(), `El proceso ${this.getPid()} no tiene CPU restante.`);
    this.setCpuRestante(this.getCpuRestante() - 1);
    this.setQuantumConsumido(this.getQuantumConsumido() + 1);
  }

  /** Si agotó el quantum vuelve a 0; si no, queda igual (resto de la división). */
  public renovarQuantum(quantum: number): void {
    exigirEnteroPositivo(quantum, 'El quantum');
    this.setQuantumConsumido(this.getQuantumConsumido() % quantum);
  }

  public expulsar(): void {
    this.setEstado(this.getEstado().expulsar());
  }

  public terminar(): void {
    exigir(this.haFinalizadoSuCpu(), `El proceso ${this.getPid()} no puede terminar: le queda CPU.`);
    this.setEstado(this.getEstado().terminar());
  }

  // ======================= Entrada / Salida =======================
  /** Valida: no terminado, un solo evento, y que pueda dispararse antes de terminar. */
  public programarEntradaSalida(ticksDeCpu: number, duracion: number): void {
    const evento = new EntradaSalida(ticksDeCpu, duracion);
    exigir(this.getEstado().permiteProgramarEntradaSalida(), `El proceso ${this.getPid()} ya terminó.`);
    exigir(!this.getEntradaSalida().estaProgramada(), `El proceso ${this.getPid()} ya tiene una E/S programada.`);
    exigir(ticksDeCpu > this.getCpuConsumida(), 'La E/S debe dispararse después de la CPU ya consumida.');
    exigir(ticksDeCpu < this.getCpuTotal(), 'La E/S nunca se dispararía: el proceso termina antes.');
    this.setEntradaSalida(evento);
  }

  public bloquear(): void {
    exigir(this.debeBloquearse(), `El proceso ${this.getPid()} no tiene una E/S para disparar.`);
    this.setEstado(this.getEstado().bloquear());
    this.setBloqueoRestante(this.getEntradaSalida().getDuracion());
  }

  /** Descuenta un tick de bloqueo. Devuelve true cuando llega a 0. */
  public avanzarBloqueo(): boolean {
    this.setEstado(this.getEstado().avanzarBloqueo());
    this.setBloqueoRestante(this.getBloqueoRestante() - 1);
    return this.getBloqueoRestante() === 0;
  }

  public desbloquear(): void {
    exigir(this.getBloqueoRestante() === 0, `El proceso ${this.getPid()} todavía está en E/S.`);
    this.setEstado(this.getEstado().desbloquear());
  }

  // ======================= Estado completo =======================
  public estado(): DatosProceso {
    return Object.freeze({
      pid: this.getPid(),
      memoriaRequerida: this.getMemoriaRequerida(),
      cpuTotal: this.getCpuTotal(),
      cpuRestante: this.getCpuRestante(),
      cpuConsumida: this.getCpuConsumida(),
      estado: this.getNombreEstado(),
      quantumConsumido: this.getQuantumConsumido(),
      bloqueoRestante: this.getBloqueoRestante(),
      entradaSalida: this.getEntradaSalida().estado(),
    });
  }
}
