import { exigir, exigirEnteroNoNegativo, exigirEnteroPositivo } from './comun/Validador';
import { DatosBloque, DatosMemoria, DatosMetricas, DatosProceso, DatosSimulador } from './interfaces/Datos';
import { IImprimible } from './interfaces/IImprimible';
import { IAsignadorMemoria, IConsultaMemoria, ILiberadorMemoria, IPoliticaAsignacion } from './interfaces/IMemoria';
import { IConsultaMetricas, IRegistroMetricas } from './interfaces/IMetricas';
import { IConsultaPlanificador, IPlanificador } from './interfaces/IPlanificacion';
import { IProcesoPlanificable } from './interfaces/IProceso';
import { IConsultaSimulador, ISimulador } from './interfaces/ISimulador';
import { AdministradorMemoria } from './memoria/AdministradorMemoria';
import { PrimerAjuste } from './memoria/politicas/PrimerAjuste';
import { Metricas } from './metricas/Metricas';
import { PlanificadorRoundRobin } from './planificacion/PlanificadorRoundRobin';
import { Proceso } from './procesos/Proceso';

/* El Simulador depende de interfaces (abstracciones), no de las clases concretas. */
type Memoria = IAsignadorMemoria & ILiberadorMemoria & IConsultaMemoria & IImprimible<DatosMemoria>;
type Planificador = IPlanificador & IConsultaPlanificador;
type MetricasSimulador = IRegistroMetricas & IConsultaMetricas & IImprimible<DatosMetricas>;

/**
 * Motor del simulador. Su única responsabilidad es COORDINAR las 4 fases de cada tick;
 * el trabajo lo hacen sus partes (composición): memoria, planificador y métricas.
 */
export class Simulador implements ISimulador, IConsultaSimulador, IImprimible<DatosSimulador> {
  private _tick!: number;
  private _procesos!: IProcesoPlanificable[];
  private _memoria!: Memoria;
  private _planificador!: Planificador;
  private _metricas!: MetricasSimulador;

  /** Tick 0, memoria en un único bloque libre, colas vacías y contadores en 0. */
  public constructor(
    memoriaTotal: number = 1024,
    quantum: number = 2,
    politica: IPoliticaAsignacion = new PrimerAjuste(),
  ) {
    // Se valida TODO antes de crear nada: una configuración inválida no deja estados parciales.
    exigirEnteroPositivo(memoriaTotal, 'La memoria total');
    exigirEnteroPositivo(quantum, 'El quantum');
    exigir(politica !== null && politica !== undefined, 'Se debe indicar una política de asignación.');
    this.setTick(0);
    this.setProcesos([]);
    this.setMemoria(new AdministradorMemoria(memoriaTotal, politica));
    this.setPlanificador(new PlanificadorRoundRobin(quantum));
    this.setMetricas(new Metricas());
    this.getMetricas().recalcular(this.getMemoria(), this.getTick());
  }

  // ======================= Getters y setters =======================
  public getTick(): number {
    return this._tick;
  }

  private setTick(valor: number): void {
    exigirEnteroNoNegativo(valor, 'El tick');
    this._tick = valor;
  }

  private getProcesos(): IProcesoPlanificable[] {
    return this._procesos;
  }

  private setProcesos(valor: IProcesoPlanificable[]): void {
    this._procesos = valor;
  }

  private getMemoria(): Memoria {
    return this._memoria;
  }

  private setMemoria(valor: Memoria): void {
    this._memoria = valor;
  }

  private getPlanificador(): Planificador {
    return this._planificador;
  }

  private setPlanificador(valor: Planificador): void {
    this._planificador = valor;
  }

  private getMetricas(): MetricasSimulador {
    return this._metricas;
  }

  private setMetricas(valor: MetricasSimulador): void {
    this._metricas = valor;
  }

  // ======================= Operaciones =======================
  /** Registra el proceso como NUEVO; se intenta admitir en la fase 1 del próximo tick. */
  public registrarProceso(pid: string, memoriaRequerida: number, cpuTotal: number): DatosProceso {
    const proceso = new Proceso(pid, memoriaRequerida, cpuTotal);
    exigir(!this.existe(pid), `Ya existe un proceso con PID ${pid}.`);
    exigir(
      memoriaRequerida <= this.getMemoria().getMemoriaTotal(),
      `El proceso ${pid} pide más memoria que la total.`,
    );
    this.setProcesos([...this.getProcesos(), proceso]);
    return proceso.estado();
  }

  public programarEntradaSalida(pid: string, ticksDeCpu: number, duracion: number): void {
    this.buscar(pid).programarEntradaSalida(ticksDeCpu, duracion);
  }

  /** Un tick = siempre las mismas 4 fases, en el mismo orden. */
  public avanzarTick(): void {
    this.admitirProcesos(); //                          1. admisión y asignación de memoria
    this.getPlanificador().actualizarBloqueados(); //   2. actualización de bloqueados
    const resultado = this.getPlanificador().ejecutarTick(); // 3. despacho y ejecución Round-Robin
    resultado.terminados.forEach((proceso) => this.getMemoria().liberar(proceso.getPid()));
    this.getMetricas().registrarTick(resultado);
    this.setTick(this.getTick() + 1); //                4. reloj y métricas
    this.getMetricas().recalcular(this.getMemoria(), this.getTick());
  }

  public avanzarTicks(cantidad: number): void {
    exigirEnteroPositivo(cantidad, 'La cantidad de ticks');
    Array.from({ length: cantidad }).forEach(() => this.avanzarTick());
  }

  /** En orden de registro. Si uno no entra, los siguientes igual lo intentan. */
  private admitirProcesos(): void {
    const pendientes = this.getProcesos().filter((proceso) => proceso.estaPendienteDeMemoria());
    const admitidos = pendientes.filter((proceso) =>
      this.getMemoria().asignar(proceso.getPid(), proceso.getMemoriaRequerida()),
    );
    admitidos.forEach((proceso) => {
      proceso.admitir();
      this.getPlanificador().encolar(proceso);
    });
    pendientes.filter((proceso) => !admitidos.includes(proceso)).forEach((proceso) => proceso.esperarMemoria());
  }

  private existe(pid: string): boolean {
    return this.getProcesos().some((proceso) => proceso.getPid() === pid);
  }

  private buscar(pid: string): IProcesoPlanificable {
    const proceso = this.getProcesos().find((p) => p.getPid() === pid);
    exigir(proceso !== undefined, `No existe un proceso con PID ${pid}.`);
    return proceso;
  }

  private porEstado(nombreEstado: string): readonly DatosProceso[] {
    return Object.freeze(
      this.getProcesos()
        .filter((proceso) => proceso.getNombreEstado() === nombreEstado)
        .map((proceso) => proceso.estado()),
    );
  }

  // ======================= Consultas (siempre copias) =======================
  public consultarProceso(pid: string): DatosProceso {
    return this.buscar(pid).estado();
  }

  public consultarProcesos(): readonly DatosProceso[] {
    return Object.freeze(this.getProcesos().map((proceso) => proceso.estado()));
  }

  public consultarProcesoEnCpu(): DatosProceso | null {
    return this.getPlanificador().consultarProcesoEnCpu();
  }

  public consultarColaListos(): readonly DatosProceso[] {
    return this.getPlanificador().consultarColaListos();
  }

  public consultarProcesosEsperando(): readonly DatosProceso[] {
    return this.porEstado('ESPERANDO_MEMORIA');
  }

  public consultarProcesosBloqueados(): readonly DatosProceso[] {
    return this.getPlanificador().consultarBloqueados();
  }

  public consultarProcesosTerminados(): readonly DatosProceso[] {
    return this.porEstado('TERMINADO');
  }

  public consultarMapaMemoria(): readonly DatosBloque[] {
    return this.getMemoria().consultarMapa();
  }

  public consultarMetricas(): DatosMetricas {
    return this.getMetricas().estado();
  }

  public consultarHistorialEjecucion(): readonly (string | null)[] {
    return this.getPlanificador().consultarHistorialEjecucion();
  }

  /** Estado COMPLETO del sistema: console.log(simulador.estado()). */
  public estado(): DatosSimulador {
    return Object.freeze({
      tick: this.getTick(),
      quantum: this.getPlanificador().getQuantum(),
      procesos: this.consultarProcesos(),
      procesoEnCpu: this.consultarProcesoEnCpu(),
      colaListos: this.consultarColaListos(),
      procesosEsperando: this.consultarProcesosEsperando(),
      procesosBloqueados: this.consultarProcesosBloqueados(),
      procesosTerminados: this.consultarProcesosTerminados(),
      memoria: this.getMemoria().estado(),
      metricas: this.consultarMetricas(),
      historialEjecucion: this.consultarHistorialEjecucion(),
    });
  }
}
