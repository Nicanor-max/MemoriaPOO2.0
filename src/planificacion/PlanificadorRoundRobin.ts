import { exigir, exigirEnteroPositivo } from '../comun/Validador';
import { DatosPlanificador, DatosProceso } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import {
  IConsultaPlanificador,
  IControlCpu,
  IPlanificador,
  IReglaCpu,
  ResultadoTick,
} from '../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../interfaces/IProceso';
import { ReglaContinuar } from './reglas/ReglaContinuar';
import { ReglaEntradaSalida } from './reglas/ReglaEntradaSalida';
import { ReglaFinalizacion } from './reglas/ReglaFinalizacion';
import { ReglaQuantumAgotado } from './reglas/ReglaQuantumAgotado';

const TICK_OCIOSO: ResultadoTick = Object.freeze({ pidEjecutado: null, terminados: [], cambiosDeContexto: 0 });

/**
 * Planificador Round-Robin: administra la CPU, la cola FIFO de listos y los bloqueados por E/S.
 * - La CPU es una lista de 0 o 1 procesos: despachar = tomar de la cola los lugares libres.
 * - Qué pasa al final de cada unidad lo decide la primera regla que aplica (polimorfismo).
 */
export class PlanificadorRoundRobin
  implements IPlanificador, IConsultaPlanificador, IControlCpu, IImprimible<DatosPlanificador>
{
  private _quantum!: number;
  private _colaListos!: IProcesoPlanificable[];
  private _cpu!: IProcesoPlanificable[];
  private _bloqueados!: IProcesoPlanificable[];
  private _historialEjecucion!: (string | null)[];
  private _reglas!: IReglaCpu[];

  public constructor(quantum: number) {
    this.setQuantum(quantum);
    this.setColaListos([]);
    this.setCpu([]);
    this.setBloqueados([]);
    this.setHistorialEjecucion([]);
    // El orden de la lista ES la prioridad: finalizar > E/S > quantum > continuar.
    this.setReglas([new ReglaFinalizacion(), new ReglaEntradaSalida(), new ReglaQuantumAgotado(), new ReglaContinuar()]);
  }

  // ======================= Getters y setters =======================
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

  private getCpu(): IProcesoPlanificable[] {
    return this._cpu;
  }

  private setCpu(valor: IProcesoPlanificable[]): void {
    exigir(valor.length <= 1, 'No puede haber más de un proceso en la CPU.');
    this._cpu = valor;
  }

  private getBloqueados(): IProcesoPlanificable[] {
    return this._bloqueados;
  }

  private setBloqueados(valor: IProcesoPlanificable[]): void {
    this._bloqueados = valor;
  }

  private getHistorialEjecucion(): (string | null)[] {
    return this._historialEjecucion;
  }

  private setHistorialEjecucion(valor: (string | null)[]): void {
    this._historialEjecucion = valor;
  }

  private getReglas(): IReglaCpu[] {
    return this._reglas;
  }

  private setReglas(valor: IReglaCpu[]): void {
    this._reglas = valor;
  }

  // ======================= IPlanificador / IControlCpu =======================
  public encolar(proceso: IProcesoPlanificable): void {
    exigir(proceso.getNombreEstado() === 'LISTO', `Sólo se encolan procesos LISTOS (${proceso.getPid()}).`);
    exigir(!this.contiene(proceso), `El proceso ${proceso.getPid()} ya está en el planificador.`);
    this.setColaListos([...this.getColaListos(), proceso]);
  }

  public agregarBloqueado(proceso: IProcesoPlanificable): void {
    exigir(proceso.getNombreEstado() === 'BLOQUEADO', `El proceso ${proceso.getPid()} no está bloqueado.`);
    exigir(!this.contiene(proceso), `El proceso ${proceso.getPid()} ya está en el planificador.`);
    this.setBloqueados([...this.getBloqueados(), proceso]);
  }

  /** Fase 2 del tick: descuenta la E/S; los que terminan vuelven al final de la cola de listos. */
  public actualizarBloqueados(): void {
    const vencidos = this.getBloqueados().filter((proceso) => proceso.avanzarBloqueo());
    this.setBloqueados(this.getBloqueados().filter((proceso) => !vencidos.includes(proceso)));
    vencidos.forEach((proceso) => {
      proceso.desbloquear();
      this.encolar(proceso);
    });
  }

  /** Fase 3 del tick: despacha si la CPU está libre y ejecuta una unidad. */
  public ejecutarTick(): ResultadoTick {
    this.despacharSiLaCpuEstaLibre();
    const resultado = this.getCpu().map((proceso) => this.ejecutar(proceso)).at(0) ?? TICK_OCIOSO;
    this.setHistorialEjecucion([...this.getHistorialEjecucion(), resultado.pidEjecutado]);
    return resultado;
  }

  public hayProcesosListos(): boolean {
    return this.getColaListos().length > 0;
  }

  public liberarCpu(): void {
    this.setCpu([]);
  }

  // ======================= Consultas =======================
  public consultarProcesoEnCpu(): DatosProceso | null {
    return this.getCpu().map((proceso) => proceso.estado()).at(0) ?? null;
  }

  public consultarColaListos(): readonly DatosProceso[] {
    return Object.freeze(this.getColaListos().map((proceso) => proceso.estado()));
  }

  public consultarBloqueados(): readonly DatosProceso[] {
    return Object.freeze(this.getBloqueados().map((proceso) => proceso.estado()));
  }

  public consultarHistorialEjecucion(): readonly (string | null)[] {
    return Object.freeze([...this.getHistorialEjecucion()]);
  }

  public estado(): DatosPlanificador {
    return Object.freeze({
      quantum: this.getQuantum(),
      procesoEnCpu: this.consultarProcesoEnCpu(),
      colaListos: this.consultarColaListos(),
      bloqueados: this.consultarBloqueados(),
      historialEjecucion: this.consultarHistorialEjecucion(),
    });
  }

  // ======================= Privados =======================
  /** Lugares libres en la CPU = 1 - ocupados (1 si está libre, 0 si está ocupada). */
  private despacharSiLaCpuEstaLibre(): void {
    const lugaresLibres = 1 - this.getCpu().length;
    const despachados = this.getColaListos().slice(0, lugaresLibres);
    this.setColaListos(this.getColaListos().slice(despachados.length));
    despachados.forEach((proceso) => proceso.despachar());
    this.setCpu([...this.getCpu(), ...despachados]);
  }

  private ejecutar(proceso: IProcesoPlanificable): ResultadoTick {
    proceso.ejecutarUnaUnidad();
    const regla = this.getReglas().find((r) => r.aplica(proceso, this)) as IReglaCpu;
    return regla.aplicar(proceso, this);
  }

  private contiene(proceso: IProcesoPlanificable): boolean {
    return [...this.getColaListos(), ...this.getCpu(), ...this.getBloqueados()].includes(proceso);
  }
}
