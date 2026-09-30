import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { EstadoProceso } from '../comun/EstadoProceso';
import { exigirEnteroPositivo } from '../comun/validaciones';
import { DatosPlanificador, DatosProceso } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IConsultaPlanificador, IPlanificador, ResultadoTick } from '../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../interfaces/IProceso';

/**
 * Planificador Round-Robin (RF07).
 * Responsabilidad única: administrar la CPU y la cola FIFO de listos.
 * No sabe nada de memoria ni de métricas: informa lo que pasó en un ResultadoTick
 * y el Simulador decide qué hacer (liberar memoria, bloquear, contar métricas).
 */
export class PlanificadorRoundRobin
  implements IPlanificador, IConsultaPlanificador, IImprimible<DatosPlanificador>
{
  private _quantum!: number;
  private _colaListos!: IProcesoPlanificable[];
  private _procesoEnCpu!: IProcesoPlanificable | null;
  private _historialEjecucion!: (number | null)[];

  public constructor(quantum: number) {
    this.setQuantum(quantum);
    this.setColaListos([]);
    this.setProcesoEnCpu(null);
    this.setHistorialEjecucion([]);
  }

  // ---------- Doble encapsulamiento ----------
  public getQuantum(): number {
    return this._quantum;
  }

  private setQuantum(valor: number): void {
    exigirEnteroPositivo(valor, 'El quantum');
    this._quantum = valor;
  }

  private getColaListos(): IProcesoPlanificable[] {
    return this._colaListos;
  }

  private setColaListos(valor: IProcesoPlanificable[]): void {
    this._colaListos = valor;
  }

  private getProcesoEnCpu(): IProcesoPlanificable | null {
    return this._procesoEnCpu;
  }

  private setProcesoEnCpu(valor: IProcesoPlanificable | null): void {
    this._procesoEnCpu = valor;
  }

  private getHistorialEjecucion(): (number | null)[] {
    return this._historialEjecucion;
  }

  private setHistorialEjecucion(valor: (number | null)[]): void {
    this._historialEjecucion = valor;
  }

  // ---------- IPlanificador ----------
  public encolar(proceso: IProcesoPlanificable): void {
    if (proceso.getEstado() !== EstadoProceso.Listo) {
      throw new ErrorDeDominio(`Sólo se encolan procesos Listos (PID ${proceso.getPid()}).`);
    }
    if (this.getColaListos().includes(proceso) || this.getProcesoEnCpu() === proceso) {
      throw new ErrorDeDominio(`El proceso ${proceso.getPid()} ya está en el planificador.`);
    }
    this.setColaListos([...this.getColaListos(), proceso]);
  }

  /** Despacha si la CPU está libre y ejecuta UNA unidad de CPU. */
  public ejecutarTick(): ResultadoTick {
    if (this.getProcesoEnCpu() === null) {
      this.despacharSiguiente();
    }
    const proceso = this.getProcesoEnCpu();
    if (proceso === null) {
      this.registrarEnHistorial(null);
      return this.resultado(null, null, null, false);
    }
    proceso.ejecutarUnaUnidad();
    this.registrarEnHistorial(proceso.getPid());
    return this.resolverFinDeUnidad(proceso);
  }

  // ---------- IConsultaPlanificador ----------
  public estaCpuOcupada(): boolean {
    return this.getProcesoEnCpu() !== null;
  }

  public consultarProcesoEnCpu(): DatosProceso | null {
    const proceso = this.getProcesoEnCpu();
    return proceso === null ? null : proceso.estado();
  }

  public consultarColaListos(): readonly DatosProceso[] {
    return Object.freeze(this.getColaListos().map((p) => p.estado()));
  }

  public consultarHistorialEjecucion(): readonly (number | null)[] {
    return Object.freeze([...this.getHistorialEjecucion()]);
  }

  public estado(): DatosPlanificador {
    return Object.freeze({
      quantum: this.getQuantum(),
      procesoEnCpu: this.consultarProcesoEnCpu(),
      colaListos: this.consultarColaListos(),
      historialEjecucion: this.consultarHistorialEjecucion(),
    });
  }

  // ---------- Privados ----------
  private despacharSiguiente(): void {
    const [primero, ...resto] = this.getColaListos();
    if (primero === undefined) {
      return;
    }
    this.setColaListos(resto);
    primero.despachar();
    this.setProcesoEnCpu(primero);
  }

  /** Orden de prioridad: 1) finalización, 2) bloqueo por E/S, 3) quantum. */
  private resolverFinDeUnidad(proceso: IProcesoPlanificable): ResultadoTick {
    const pid = proceso.getPid();
    if (proceso.haFinalizadoSuCpu()) {
      proceso.terminar();
      this.setProcesoEnCpu(null);
      return this.resultado(pid, proceso, null, false);
    }
    if (proceso.debeBloquearse()) {
      proceso.bloquear();
      this.setProcesoEnCpu(null);
      return this.resultado(pid, null, proceso, true);
    }
    if (proceso.agotoQuantum(this.getQuantum())) {
      if (this.getColaListos().length > 0) {
        proceso.expulsar();
        this.setColaListos([...this.getColaListos(), proceso]);
        this.setProcesoEnCpu(null);
        return this.resultado(pid, null, null, true);
      }
      proceso.renovarQuantum();
    }
    return this.resultado(pid, null, null, false);
  }

  private registrarEnHistorial(pid: number | null): void {
    this.setHistorialEjecucion([...this.getHistorialEjecucion(), pid]);
  }

  private resultado(
    pidEjecutado: number | null,
    procesoTerminado: IProcesoPlanificable | null,
    procesoBloqueado: IProcesoPlanificable | null,
    huboCambioDeContexto: boolean,
  ): ResultadoTick {
    return Object.freeze({ pidEjecutado, procesoTerminado, procesoBloqueado, huboCambioDeContexto });
  }
}
