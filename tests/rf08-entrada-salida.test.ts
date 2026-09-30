import { describe, expect, it } from 'vitest';
import {
  ColaBloqueados,
  ConfiguracionSimulacion,
  ErrorDeDominio,
  EstadoProceso,
  EventoEntradaSalida,
  Proceso,
  Simulador,
} from '../src/index';

function ejecutando(pid: number, cpu: number): Proceso {
  const proceso = new Proceso(pid, 10, cpu);
  proceso.admitir();
  proceso.despachar();
  return proceso;
}

describe('RF08 - EventoEntradaSalida y validación', () => {
  it('guarda cuándo se dispara y su duración', () => {
    const evento = new EventoEntradaSalida(2, 3);
    expect(evento.estado()).toEqual({ ticksDeCpu: 2, duracion: 3 });
    expect(evento.correspondeDispararEn(2)).toBe(true);
    expect(evento.correspondeDispararEn(1)).toBe(false);
  });

  it.each([
    [0, 3],
    [2, 0],
    [-1, 2],
    [1.5, 2],
  ])('rechaza eventos inválidos (ticks=%s, duración=%s)', (ticks, duracion) => {
    expect(() => new EventoEntradaSalida(ticks, duracion)).toThrow(ErrorDeDominio);
  });

  it('el proceso rechaza eventos que nunca se dispararían, repetidos o tardíos', () => {
    const proceso = new Proceso(1, 10, 3);
    expect(() => proceso.programarEntradaSalida(new EventoEntradaSalida(3, 1))).toThrow(/nunca/);
    proceso.programarEntradaSalida(new EventoEntradaSalida(1, 1));
    expect(() => proceso.programarEntradaSalida(new EventoEntradaSalida(2, 1))).toThrow(/ya tiene/);

    const otro = ejecutando(2, 4);
    otro.ejecutarUnaUnidad();
    otro.ejecutarUnaUnidad();
    expect(() => otro.programarEntradaSalida(new EventoEntradaSalida(2, 1))).toThrow(/después/);

    const terminado = ejecutando(3, 1);
    terminado.ejecutarUnaUnidad();
    terminado.terminar();
    expect(() => terminado.programarEntradaSalida(new EventoEntradaSalida(1, 1))).toThrow(/terminó/);
  });

  it('no se puede bloquear un proceso sin E/S pendiente', () => {
    expect(() => ejecutando(1, 3).bloquear()).toThrow(ErrorDeDominio);
  });
});

describe('RF08 - ColaBloqueados', () => {
  it('descuenta temporizadores y devuelve los que vuelven a Listo', () => {
    const cola = new ColaBloqueados();
    const p1 = ejecutando(1, 5);
    p1.programarEntradaSalida(new EventoEntradaSalida(1, 1));
    p1.ejecutarUnaUnidad();
    p1.bloquear();
    const p2 = ejecutando(2, 5);
    p2.programarEntradaSalida(new EventoEntradaSalida(1, 2));
    p2.ejecutarUnaUnidad();
    p2.bloquear();
    cola.agregar(p1);
    cola.agregar(p2);

    expect(cola.actualizarTemporizadores()).toEqual([p1]);
    expect(p1.getEstado()).toBe(EstadoProceso.Listo);
    expect(cola.consultarBloqueados().map((p) => p.bloqueoRestante)).toEqual([1]);
    expect(cola.actualizarTemporizadores()).toEqual([p2]);
    expect(cola.getCantidad()).toBe(0);
    expect(cola.estado()).toEqual([]);
  });

  it('rechaza procesos no bloqueados o repetidos', () => {
    const cola = new ColaBloqueados();
    expect(() => cola.agregar(ejecutando(1, 3))).toThrow(/no está bloqueado/);
    const p2 = ejecutando(2, 3);
    p2.programarEntradaSalida(new EventoEntradaSalida(1, 2));
    p2.ejecutarUnaUnidad();
    p2.bloquear();
    cola.agregar(p2);
    expect(() => cola.agregar(p2)).toThrow(/ya está/);
  });
});

describe('RF08 - Bloqueo por E/S en el Simulador', () => {
  it('bloquea, conserva memoria, no consume CPU y vuelve a Listos al vencer el temporizador', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2));
    simulador.registrarProceso(1, 100, 4);
    simulador.registrarProceso(2, 100, 3);
    simulador.programarEntradaSalida(1, 1, 2);

    simulador.avanzarTick(); // tick 1: P1 ejecuta 1 unidad y se bloquea
    expect(simulador.consultarProceso(1).estado).toBe(EstadoProceso.Bloqueado);
    expect(simulador.consultarProcesosBloqueados().map((p) => p.pid)).toEqual([1]);
    expect(simulador.consultarMapaMemoria().some((b) => b.pid === 1)).toBe(true);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(1);

    simulador.avanzarTick(); // tick 2: bloqueo 2 -> 1, corre P2
    expect(simulador.consultarProceso(1).cpuRestante).toBe(3);
    expect(simulador.consultarProceso(1).bloqueoRestante).toBe(1);

    simulador.avanzarTick(); // tick 3: P1 vuelve a Listos; P2 agota quantum y rota
    expect(simulador.consultarProceso(1).estado).toBe(EstadoProceso.Listo);
    expect(simulador.consultarColaListos().map((p) => p.pid)).toEqual([1, 2]);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(2);

    simulador.avanzarTicks(4);
    expect(simulador.consultarHistorialEjecucion()).toEqual([1, 2, 2, 1, 1, 2, 1]);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(3);
    expect(simulador.consultarProcesosTerminados().map((p) => p.pid)).toEqual([1, 2]);
  });

  it('al volver de la E/S puede ser despachado en ese mismo tick', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2));
    simulador.registrarProceso(1, 100, 3);
    simulador.programarEntradaSalida(1, 1, 1);

    simulador.avanzarTick(); // se bloquea
    simulador.avanzarTick(); // fase 2 lo desbloquea, fase 3 lo ejecuta
    expect(simulador.consultarHistorialEjecucion()).toEqual([1, 1]);
    expect(simulador.consultarProcesoEnCpu()?.pid).toBe(1);
  });

  it('rechaza E/S para un PID inexistente o con datos inválidos', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());
    simulador.registrarProceso(1, 100, 3);
    expect(() => simulador.programarEntradaSalida(9, 1, 1)).toThrow(/No existe/);
    expect(() => simulador.programarEntradaSalida(1, 0, 1)).toThrow(ErrorDeDominio);
    expect(() => simulador.programarEntradaSalida(1, 1, 0)).toThrow(ErrorDeDominio);
  });
});
