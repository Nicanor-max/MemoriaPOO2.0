import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { EstadoProceso } from '../comun/EstadoProceso';
import { exigirEnteroNoNegativo, exigirEnteroPositivo } from '../comun/validaciones';
import { DatosProceso } from '../interfaces/Datos';
import { IEventoEntradaSalida } from '../interfaces/IEventoEntradaSalida';
import { IImprimible } from '../interfaces/IImprimible';
import {
  IProcesoAdmisible,
  IProcesoConsultable,
  IProcesoEjecutable,
  IProcesoEntradaSalida,
} from '../interfaces/IProceso';

/**
 * Proceso del sistema operativo simulado.
 * Responsabilidad única: proteger SUS transiciones de estado y SUS contadores (RF02, RF03).
 *
 * Doble encapsulamiento:
 *  1) Los atributos son privados y llevan guion bajo (_cpuRestante).
 *  2) Nadie, ni siquiera la propia clase, toca el atributo directamente: todo pasa por
 *     getX() / setX(). Los setters son privados y validan la regla del dominio.
 */
export class Proceso
  implements
    IProcesoConsultable,
    IProcesoAdmisible,
    IProcesoEjecutable,
    IProcesoEntradaSalida,
    IImprimible<DatosProceso>
{
  private _pid!: number;
  private _memoriaRequerida!: number;
  private _cpuTotal!: number;
  private _cpuRestante!: number;
  private _estado!: EstadoProceso;
  private _quantumConsumido!: number;
  private _bloqueoRestante!: number;
  private _eventoEntradaSalida!: IEventoEntradaSalida | null;
  private _entradaSalidaDisparada!: boolean;

  public constructor(pid: number, memoriaRequerida: number, cpuTotal: number) {
    this.setPid(pid);
    this.setMemoriaRequerida(memoriaRequerida);
    this.setCpuTotal(cpuTotal);
    this.setCpuRestante(cpuTotal);
    this.setEstado(EstadoProceso.Nuevo);
    this.setQuantumConsumido(0);
    this.setBloqueoRestante(0);
    this.setEventoEntradaSalida(null);
    this.setEntradaSalidaDisparada(false);
  }

  // =====================================================================
  // Getters (públicos) y setters (privados, con validación)
  // =====================================================================
  public getPid(): number {
    return this._pid;
  }

  private setPid(valor: number): void {
    exigirEnteroPositivo(valor, 'El PID');
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

  public getEstado(): EstadoProceso {
    return this._estado;
  }

  private setEstado(valor: EstadoProceso): void {
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
    exigirEnteroNoNegativo(valor, 'El tiempo de bloqueo restante');
    this._bloqueoRestante = valor;
  }

  /** Privado: el evento es un objeto, no se entrega hacia afuera (se ve en estado()). */
  private getEventoEntradaSalida(): IEventoEntradaSalida | null {
    return this._eventoEntradaSalida;
  }

  private setEventoEntradaSalida(valor: IEventoEntradaSalida | null): void {
    this._eventoEntradaSalida = valor;
  }

  private getEntradaSalidaDisparada(): boolean {
    return this._entradaSalidaDisparada;
  }

  private setEntradaSalidaDisparada(valor: boolean): void {
    this._entradaSalidaDisparada = valor;
  }

  /** Dato derivado: no se guarda, se calcula. */
  public getCpuConsumida(): number {
    return this.getCpuTotal() - this.getCpuRestante();
  }

  // =====================================================================
  // IProcesoAdmisible (RF03)
  // =====================================================================
  public esperarMemoria(): void {
    this.cambiarEstado(EstadoProceso.EsperandoMemoria, [
      EstadoProceso.Nuevo,
      EstadoProceso.EsperandoMemoria,
    ]);
  }

  public admitir(): void {
    this.cambiarEstado(EstadoProceso.Listo, [EstadoProceso.Nuevo, EstadoProceso.EsperandoMemoria]);
  }

  // =====================================================================
  // IProcesoEjecutable (RF07)
  // =====================================================================
  public despachar(): void {
    this.cambiarEstado(EstadoProceso.Ejecutando, [EstadoProceso.Listo]);
    this.setQuantumConsumido(0);
  }

  public ejecutarUnaUnidad(): void {
    this.exigirEstado(EstadoProceso.Ejecutando, 'ejecutar');
    if (this.haFinalizadoSuCpu()) {
      throw new ErrorDeDominio(`El proceso ${this.getPid()} no tiene CPU restante.`);
    }
    this.setCpuRestante(this.getCpuRestante() - 1);
    this.setQuantumConsumido(this.getQuantumConsumido() + 1);
  }

  public haFinalizadoSuCpu(): boolean {
    return this.getCpuRestante() === 0;
  }

  public agotoQuantum(quantum: number): boolean {
    return this.getQuantumConsumido() >= quantum;
  }

  public renovarQuantum(): void {
    this.exigirEstado(EstadoProceso.Ejecutando, 'renovar el quantum');
    this.setQuantumConsumido(0);
  }

  public expulsar(): void {
    this.cambiarEstado(EstadoProceso.Listo, [EstadoProceso.Ejecutando]);
  }

  public terminar(): void {
    if (!this.haFinalizadoSuCpu()) {
      throw new ErrorDeDominio(`El proceso ${this.getPid()} no puede terminar: le queda CPU.`);
    }
    this.cambiarEstado(EstadoProceso.Terminado, [EstadoProceso.Ejecutando]);
  }

  // =====================================================================
  // IProcesoEntradaSalida (RF08)
  // =====================================================================
  /**
   * Validación del evento: el proceso no debe haber terminado, sólo se admite un evento,
   * y el evento tiene que poder dispararse (después de la CPU ya consumida y antes de terminar,
   * porque la finalización tiene prioridad sobre el bloqueo).
   */
  public programarEntradaSalida(evento: IEventoEntradaSalida): void {
    if (this.getEstado() === EstadoProceso.Terminado) {
      throw new ErrorDeDominio(`El proceso ${this.getPid()} ya terminó.`);
    }
    if (this.getEventoEntradaSalida() !== null) {
      throw new ErrorDeDominio(`El proceso ${this.getPid()} ya tiene una E/S programada.`);
    }
    if (evento.getTicksDeCpu() <= this.getCpuConsumida()) {
      throw new ErrorDeDominio('La E/S debe dispararse después de la CPU ya consumida.');
    }
    if (evento.getTicksDeCpu() >= this.getCpuTotal()) {
      throw new ErrorDeDominio('La E/S nunca se dispararía: el proceso termina antes.');
    }
    this.setEventoEntradaSalida(evento);
  }

  public debeBloquearse(): boolean {
    const evento = this.getEventoEntradaSalida();
    return (
      evento !== null &&
      !this.getEntradaSalidaDisparada() &&
      !this.haFinalizadoSuCpu() &&
      evento.correspondeDispararEn(this.getCpuConsumida())
    );
  }

  public bloquear(): void {
    const evento = this.getEventoEntradaSalida();
    if (evento === null || !this.debeBloquearse()) {
      throw new ErrorDeDominio(`El proceso ${this.getPid()} no tiene una E/S para disparar.`);
    }
    this.cambiarEstado(EstadoProceso.Bloqueado, [EstadoProceso.Ejecutando]);
    this.setBloqueoRestante(evento.getDuracion());
    this.setEntradaSalidaDisparada(true);
  }

  /** Descuenta un tick de bloqueo. Devuelve true si el proceso volvió a Listo. */
  public avanzarBloqueo(): boolean {
    this.exigirEstado(EstadoProceso.Bloqueado, 'avanzar el bloqueo');
    this.setBloqueoRestante(this.getBloqueoRestante() - 1);
    if (this.getBloqueoRestante() === 0) {
      this.cambiarEstado(EstadoProceso.Listo, [EstadoProceso.Bloqueado]);
      return true;
    }
    return false;
  }

  // =====================================================================
  // IImprimible
  // =====================================================================
  public estado(): DatosProceso {
    const evento = this.getEventoEntradaSalida();
    return Object.freeze({
      pid: this.getPid(),
      memoriaRequerida: this.getMemoriaRequerida(),
      cpuTotal: this.getCpuTotal(),
      cpuRestante: this.getCpuRestante(),
      cpuConsumida: this.getCpuConsumida(),
      estado: this.getEstado(),
      quantumConsumido: this.getQuantumConsumido(),
      bloqueoRestante: this.getBloqueoRestante(),
      entradaSalida:
        evento === null
          ? null
          : Object.freeze({ ticksDeCpu: evento.getTicksDeCpu(), duracion: evento.getDuracion() }),
      entradaSalidaDisparada: this.getEntradaSalidaDisparada(),
    });
  }

  // =====================================================================
  // Reglas internas de transición
  // =====================================================================
  private cambiarEstado(nuevo: EstadoProceso, permitidosDesde: EstadoProceso[]): void {
    if (!permitidosDesde.includes(this.getEstado())) {
      throw new ErrorDeDominio(
        `Transición inválida del proceso ${this.getPid()}: ${this.getEstado()} -> ${nuevo}.`,
      );
    }
    this.setEstado(nuevo);
  }

  private exigirEstado(esperado: EstadoProceso, accion: string): void {
    if (this.getEstado() !== esperado) {
      throw new ErrorDeDominio(
        `El proceso ${this.getPid()} no puede ${accion} en estado ${this.getEstado()}.`,
      );
    }
  }
}
