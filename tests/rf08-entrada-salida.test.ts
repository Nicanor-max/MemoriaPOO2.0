import { describe, expect, it } from 'vitest';
import { EntradaSalida, ErrorDeDominio, Proceso, Simulador, SinEntradaSalida } from '../src/index';

function ejecutando(pid: string, cpu: number): Proceso {
  const proceso = new Proceso(pid, 10, cpu);
  proceso.admitir();
  proceso.despachar();
  return proceso;
}

describe('RF08 - EntradaSalida y SinEntradaSalida (polimorfismo en lugar de null)', () => {
  it('EntradaSalida se dispara al consumir exactamente sus ticks', () => {
    const evento = new EntradaSalida(2, 3);
    expect(evento.estado()).toEqual({ ticksDeCpu: 2, duracion: 3 });
    expect(evento.estaProgramada()).toBe(true);
    expect([1, 2, 3].map((cpu) => evento.correspondeDispararEn(cpu))).toEqual([false, true, false]);
  });

  it('SinEntradaSalida nunca se dispara', () => {
    const sinEvento = new SinEntradaSalida();
    expect(sinEvento.estaProgramada()).toBe(false);
    expect(sinEvento.correspondeDispararEn()).toBe(false);
    expect(sinEvento.getDuracion()).toBe(0);
    expect(sinEvento.estado()).toBeNull();
  });

  it.each([[0, 3], [2, 0], [-1, 2], [1.5, 2]])('rechaza eventos inválidos (ticks=%s, duración=%s)', (t, d) => {
    expect(() => new EntradaSalida(t, d)).toThrow(ErrorDeDominio);
  });

  it('el proceso rechaza E/S que nunca se dispararía, repetida, tardía o de un terminado', () => {
    const proceso = new Proceso('P1', 10, 3);
    expect(() => proceso.programarEntradaSalida(3, 1)).toThrow(/nunca/);
    proceso.programarEntradaSalida(1, 1);
    expect(() => proceso.programarEntradaSalida(2, 1)).toThrow(/ya tiene/);

    const otro = ejecutando('P2', 4);
    otro.ejecutarUnaUnidad();
    otro.ejecutarUnaUnidad();
    expect(() => otro.programarEntradaSalida(2, 1)).toThrow(/después/);

    const terminado = ejecutando('P3', 1);
    terminado.ejecutarUnaUnidad();
    terminado.terminar();
    expect(() => terminado.programarEntradaSalida(1, 1)).toThrow(/terminó/);
  });

  it('no se puede bloquear sin E/S ni desbloquear antes de tiempo', () => {
    expect(() => ejecutando('P1', 3).bloquear()).toThrow(ErrorDeDominio);
    const proceso = ejecutando('P2', 5);
    proceso.programarEntradaSalida(1, 2);
    proceso.ejecutarUnaUnidad();
    proceso.bloquear();
    expect(proceso.avanzarBloqueo()).toBe(false);
    expect(() => proceso.desbloquear()).toThrow(/todavía/);
    expect(proceso.avanzarBloqueo()).toBe(true);
    proceso.desbloquear();
    expect(proceso.getNombreEstado()).toBe('LISTO');
  });
});

describe('RF08 - Bloqueo por E/S en el Simulador', () => {
  it('bloquea, conserva memoria, no consume CPU y vuelve a listos al vencer', () => {
    const simulador = new Simulador(1024, 2);
    simulador.registrarProceso('P1', 100, 4);
    simulador.registrarProceso('P2', 100, 3);
    simulador.programarEntradaSalida('P1', 1, 2);

    simulador.avanzarTick(); // P1 ejecuta 1 y se bloquea
    expect(simulador.consultarProceso('P1').estado).toBe('BLOQUEADO');
    expect(simulador.consultarProcesosBloqueados().map((p) => p.pid)).toEqual(['P1']);
    expect(simulador.consultarMapaMemoria().some((b) => b.pid === 'P1')).toBe(true);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(1);

    simulador.avanzarTick(); // bloqueo 2 -> 1, corre P2
    expect(simulador.consultarProceso('P1')).toMatchObject({ cpuRestante: 3, bloqueoRestante: 1 });

    simulador.avanzarTick(); // P1 vuelve a listos; P2 agota el quantum y rota
    expect(simulador.consultarProceso('P1').estado).toBe('LISTO');
    expect(simulador.consultarColaListos().map((p) => p.pid)).toEqual(['P1', 'P2']);

    simulador.avanzarTicks(4);
    expect(simulador.consultarHistorialEjecucion()).toEqual(['P1', 'P2', 'P2', 'P1', 'P1', 'P2', 'P1']);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(3);
  });

  it('al volver de la E/S puede despacharse en ese mismo tick', () => {
    const simulador = new Simulador(1024, 2);
    simulador.registrarProceso('P1', 100, 3);
    simulador.programarEntradaSalida('P1', 1, 1);
    simulador.avanzarTicks(2);
    expect(simulador.consultarHistorialEjecucion()).toEqual(['P1', 'P1']);
  });

  it('rechaza E/S para un PID inexistente o con datos inválidos', () => {
    const simulador = new Simulador();
    simulador.registrarProceso('P1', 100, 3);
    expect(() => simulador.programarEntradaSalida('P9', 1, 1)).toThrow(/No existe/);
    expect(() => simulador.programarEntradaSalida('P1', 0, 1)).toThrow(ErrorDeDominio);
    expect(() => simulador.programarEntradaSalida('P1', 1, 0)).toThrow(ErrorDeDominio);
  });
});
