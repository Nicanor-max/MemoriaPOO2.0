import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { EstadoProceso } from '../comun/EstadoProceso';
import { exigirEnteroNoNegativo, exigirEnteroPositivo } from '../comun/validaciones';
import {
  DatosBloque,
  DatosConfiguracion,
  DatosMemoria,
  DatosMetricas,
  DatosProceso,
  DatosSimulador,
} from '../interfaces/Datos';
import { IConfiguracion } from '../interfaces/IConfiguracion';
import { IImprimible } from '../interfaces/IImprimible';
import { IAsignadorMemoria, IConsultaMemoria, ILiberadorMemoria } from '../interfaces/IMemoria';
import { IConsultaMetricas, IRegistroMetricas } from '../interfaces/IMetricas';
import {
  IConsultaBloqueados,
  IConsultaPlanificador,
  IGestionBloqueos,
  IPlanificador,
} from '../interfaces/IPlanificacion';
import { IConsultaProcesos, IRegistroProcesos } from '../interfaces/IProcesos';
import { IConsultaSimulador, ISimulador } from '../interfaces/ISimulador';
import { GestorMemoria } from '../memoria/GestorMemoria';
import { Metricas } from '../metricas/Metricas';
import { PlanificadorRoundRobin } from '../planificacion/PlanificadorRoundRobin';
import { ColaBloqueados } from '../procesos/ColaBloqueados';
import { EventoEntradaSalida } from '../procesos/EventoEntradaSalida';
import { Proceso } from '../procesos/Proceso';
import { RegistroProcesos } from '../procesos/RegistroProcesos';

/*
 * El Simulador depende de ABSTRACCIONES (interfaces), no de las clases concretas.
 * Cada tipo declara exactamente las capacidades que el Simulador usa de su parte.
 */
type Registro = IRegistroProcesos & IConsultaProcesos;
type Memoria = IAsignadorMemoria & ILiberadorMemoria & IConsultaMemoria & IImprimible<DatosMemoria>;
type Planificador = IPlanificador & IConsultaPlanificador;
type Bloqueados = IGestionBloqueos & IConsultaBloqueados;
type MetricasSimulador = IRegistroMetricas & IConsultaMetricas & IImprimible<DatosMetricas>;

/**
 * Fachada de la biblioteca. Responsabilidad única: COORDINAR las fases del tick (RF06).
 * No asigna memoria, no planifica y no calcula métricas: se lo pide a sus partes (composición).
 */
export class Simulador implements ISimulador, IConsultaSimulador, IImprimible<DatosSimulador> {
  private _configuracion!: IConfiguracion & IImprimible<DatosConfiguracion>;
  private _tick!: number;
  private _registro!: Registro;
  private _memoria!: Memoria;
  private _planificador!: Planificador;
  private _bloqueados!: Bloqueados;
  private _metricas!: MetricasSimulador;

  /** RF01: tick 0, memoria en un único bloque libre, colas vacías y contadores en 0. */
  public constructor(configuracion: IConfiguracion & IImprimible<DatosConfiguracion>) {
    if (configuracion === null || configuracion === undefined) {
      throw new ErrorDeDominio('El simulador necesita una configuración.');
    }
    this.setConfiguracion(configuracion);
    this.setTick(0);
    this.setRegistro(new RegistroProcesos(configuracion.getMemoriaTotal()));
    this.setMemoria(new GestorMemoria(configuracion.getMemoriaTotal(), configuracion.getPolitica()));
    this.setPlanificador(new PlanificadorRoundRobin(configuracion.getQuantum()));
    this.setBloqueados(new ColaBloqueados());
    this.setMetricas(new Metricas());
    this.getMetricas().recalcular(this.getMemoria(), this.getTick());
  }

  // =====================================================================
  // Doble encapsulamiento (las partes son privadas: nadie de afuera las toca)
  // =====================================================================
  private getConfiguracion(): IConfiguracion & IImprimible<DatosConfiguracion> {
    return this._configuracion;
  }

  private setConfiguracion(valor: IConfiguracion & IImprimible<DatosConfiguracion>): void {
    this._configuracion = valor;
  }

  public getTick(): number {
    return this._tick;
  }

  private setTick(valor: number): void {
    exigirEnteroNoNegativo(valor, 'El tick');
    this._tick = valor;
  }

  private getRegistro(): Registro {
    return this._registro;
  }

  private setRegistro(valor: Registro): void {
    this._registro = valor;
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

  private getBloqueados(): Bloqueados {
    return this._bloqueados;
  }

  private setBloqueados(valor: Bloqueados): void {
    this._bloqueados = valor;
  }

  private getMetricas(): MetricasSimulador {
    return this._metricas;
  }

  private setMetricas(valor: MetricasSimulador): void {
    this._metricas = valor;
  }

  // =====================================================================
  // ISimulador
  // =====================================================================
  /** RF02: el proceso queda Nuevo; se intenta admitir en la fase 1 del próximo tick. */
  public registrarProceso(pid: number, memoriaRequerida: number, cpuTotal: number): DatosProceso {
    const proceso = new Proceso(pid, memoriaRequerida, cpuTotal);
    this.getRegistro().registrar(proceso);
    return proceso.estado();
  }

  /** RF08: "después de ticksDeCpu unidades de CPU, bloquear durante duracion ticks". */
  public programarEntradaSalida(pid: number, ticksDeCpu: number, duracion: number): void {
    const evento = new EventoEntradaSalida(ticksDeCpu, duracion);
    this.getRegistro().buscar(pid).programarEntradaSalida(evento);
  }

  /** RF06: exactamente una unidad de tiempo, siempre en el mismo orden de fases. */
  public avanzarTick(): void {
    this.admitirProcesos(); //             1. admisión e intento de asignación
    this.actualizarBloqueados(); //        2. actualización de bloqueados
    this.ejecutarCpu(); //                 3. despacho y ejecución Round-Robin
    this.actualizarRelojYMetricas(); //    4. reloj y métricas
  }

  public avanzarTicks(cantidad: number): void {
    exigirEnteroPositivo(cantidad, 'La cantidad de ticks');
    for (let i = 0; i < cantidad; i++) {
      this.avanzarTick();
    }
  }

  // =====================================================================
  // Fases del tick (privadas)
  // =====================================================================
  /** Fase 1: en orden de registro; si uno no entra, los siguientes igual lo intentan. */
  private admitirProcesos(): void {
    for (const proceso of this.getRegistro().pendientesDeAdmision()) {
      if (this.getMemoria().asignar(proceso.getPid(), proceso.getMemoriaRequerida())) {
        proceso.admitir();
        this.getPlanificador().encolar(proceso);
      } else {
        proceso.esperarMemoria();
      }
    }
  }

  /** Fase 2: los que terminan su E/S vuelven al final de la cola de listos. */
  private actualizarBloqueados(): void {
    for (const proceso of this.getBloqueados().actualizarTemporizadores()) {
      this.getPlanificador().encolar(proceso);
    }
  }

  /** Fase 3: el planificador ejecuta y el simulador reacciona a lo que informó. */
  private ejecutarCpu(): void {
    const resultado = this.getPlanificador().ejecutarTick();
    if (resultado.procesoTerminado !== null) {
      this.getMemoria().liberar(resultado.procesoTerminado.getPid());
    }
    if (resultado.procesoBloqueado !== null) {
      this.getBloqueados().agregar(resultado.procesoBloqueado);
    }
    if (resultado.huboCambioDeContexto) {
      this.getMetricas().registrarCambioDeContexto();
    }
    this.getMetricas().registrarUsoDeCpu(resultado.pidEjecutado !== null);
  }

  /** Fase 4. */
  private actualizarRelojYMetricas(): void {
    this.setTick(this.getTick() + 1);
    this.getMetricas().recalcular(this.getMemoria(), this.getTick());
  }

  // =====================================================================
  // IConsultaSimulador (RF10): siempre copias de sólo lectura
  // =====================================================================
  public consultarConfiguracion(): DatosConfiguracion {
    return this.getConfiguracion().estado();
  }

  public consultarProceso(pid: number): DatosProceso {
    return this.getRegistro().buscar(pid).estado();
  }

  public consultarProcesos(): readonly DatosProceso[] {
    return this.getRegistro().consultarTodos();
  }

  public consultarProcesoEnCpu(): DatosProceso | null {
    return this.getPlanificador().consultarProcesoEnCpu();
  }

  public consultarColaListos(): readonly DatosProceso[] {
    return this.getPlanificador().consultarColaListos();
  }

  public consultarProcesosEsperando(): readonly DatosProceso[] {
    return this.getRegistro().consultarPorEstado(EstadoProceso.EsperandoMemoria);
  }

  public consultarProcesosBloqueados(): readonly DatosProceso[] {
    return this.getBloqueados().consultarBloqueados();
  }

  public consultarProcesosTerminados(): readonly DatosProceso[] {
    return this.getRegistro().consultarPorEstado(EstadoProceso.Terminado);
  }

  public consultarMapaMemoria(): readonly DatosBloque[] {
    return this.getMemoria().consultarMapa();
  }

  public consultarMetricas(): DatosMetricas {
    return this.getMetricas().estado();
  }

  public consultarHistorialEjecucion(): readonly (number | null)[] {
    return this.getPlanificador().consultarHistorialEjecucion();
  }

  /** Estado COMPLETO del sistema: console.log(simulador.estado()) */
  public estado(): DatosSimulador {
    return Object.freeze({
      tick: this.getTick(),
      configuracion: this.consultarConfiguracion(),
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
