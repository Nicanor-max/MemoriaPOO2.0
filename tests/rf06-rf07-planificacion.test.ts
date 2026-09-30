import { describe, expect, it } from 'vitest';
import { ErrorDeDominio, PlanificadorRoundRobin, Proceso, Simulador } from '../src/index';

function listo(pid: string, cpu: number): Proceso {
  const proceso = new Proceso(pid, 10, cpu);
  proceso.admitir();
  return proceso;
}

describe('RF07 - PlanificadorRoundRobin', () => {
  it('sin listos registra un tick ocioso', () => {
    const planificador = new PlanificadorRoundRobin(2);
    expect(planificador.ejecutarTick()).toEqual({ pidEjecutado: null, terminados: [], cambiosDeContexto: 0 });
    expect(planificador.consultarHistorialEjecucion()).toEqual([null]);
  });

  it('caso de la consigna: Q=2, P1 CPU 3, P2 CPU 2 -> P1 P1 P2 P2 P1 y 1 cambio de contexto', () => {
    const planificador = new PlanificadorRoundRobin(2);
    planificador.encolar(listo('P1', 3));
    planificador.encolar(listo('P2', 2));
    const cambios = [1, 2, 3, 4, 5].reduce((suma) => suma + planificador.ejecutarTick().cambiosDeContexto, 0);
    expect(planificador.consultarHistorialEjecucion()).toEqual(['P1', 'P1', 'P2', 'P2', 'P1']);
    expect(cambios).toBe(1);
  });

  it('un único proceso renueva el quantum sin cambio de contexto', () => {
    const planificador = new PlanificadorRoundRobin(2);
    const p1 = listo('P1', 5);
    planificador.encolar(p1);
    planificador.ejecutarTick();
    expect(planificador.ejecutarTick().cambiosDeContexto).toBe(0);
    expect(p1.getQuantumConsumido()).toBe(0);
    expect(planificador.consultarProcesoEnCpu()?.pid).toBe('P1');
  });

  it('terminar en el límite del quantum no reencola; el siguiente corre en el próximo tick', () => {
    const planificador = new PlanificadorRoundRobin(2);
    const p1 = listo('P1', 2);
    planificador.encolar(p1);
    planificador.encolar(listo('P2', 2));
    planificador.ejecutarTick();
    const resultado = planificador.ejecutarTick();
    expect(resultado.terminados).toEqual([p1]);
    expect(resultado.cambiosDeContexto).toBe(0);
    expect(planificador.consultarProcesoEnCpu()).toBeNull();
    expect(planificador.consultarColaListos().map((p) => p.pid)).toEqual(['P2']);
  });

  it('rechaza encolar procesos no LISTOS, repetidos o bloqueados inválidos', () => {
    const planificador = new PlanificadorRoundRobin(2);
    expect(() => planificador.encolar(new Proceso('P1', 10, 1))).toThrow(ErrorDeDominio);
    const p2 = listo('P2', 3);
    planificador.encolar(p2);
    expect(() => planificador.encolar(p2)).toThrow(/ya está/);
    expect(() => planificador.agregarBloqueado(p2)).toThrow(/no está bloqueado/);
    expect(() => new PlanificadorRoundRobin(0)).toThrow(ErrorDeDominio);
  });

  it('estado() devuelve CPU, colas e historial como copias', () => {
    const planificador = new PlanificadorRoundRobin(2);
    planificador.encolar(listo('P1', 3));
    planificador.encolar(listo('P2', 1));
    planificador.ejecutarTick();
    const estado = planificador.estado();
    expect(estado.procesoEnCpu?.pid).toBe('P1');
    expect(estado.colaListos.map((p) => p.pid)).toEqual(['P2']);
    expect(estado.bloqueados).toEqual([]);
    expect(estado.historialEjecucion).toEqual(['P1']);
    expect(Object.isFrozen(estado.colaListos)).toBe(true);
  });
});

describe('RF06 - Tick determinista (colaboración del Simulador)', () => {
  it('Round-Robin de la consigna a través del Simulador', () => {
    const simulador = new Simulador(1024, 2);
    simulador.registrarProceso('P1', 100, 3);
    simulador.registrarProceso('P2', 100, 2);
    simulador.avanzarTicks(5);
    expect(simulador.getTick()).toBe(5);
    expect(simulador.consultarHistorialEjecucion()).toEqual(['P1', 'P1', 'P2', 'P2', 'P1']);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(1);
    expect(simulador.consultarMetricas().utilizacionCpu).toBe(100);
    expect(simulador.consultarMapaMemoria()).toHaveLength(1);
  });

  it('escenario del main.py de la cátedra (First-Fit, Q=2, 12 ticks)', () => {
    const simulador = new Simulador(1024, 2);
    simulador.registrarProceso('P1', 200, 4);
    simulador.registrarProceso('P2', 350, 3);
    simulador.registrarProceso('P3', 150, 2);
    simulador.registrarProceso('P4', 400, 3); // no entra hasta que termina P3

    simulador.avanzarTick();
    expect(simulador.consultarProcesosEsperando().map((p) => p.pid)).toEqual(['P4']);

    simulador.avanzarTicks(11);
    expect(simulador.consultarHistorialEjecucion()).toEqual([
      'P1', 'P1', 'P2', 'P2', 'P3', 'P3', 'P1', 'P1', 'P2', 'P4', 'P4', 'P4',
    ]);
    expect(simulador.consultarProcesosTerminados().map((p) => p.pid)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(2);
    expect(simulador.consultarMapaMemoria()).toEqual([{ inicio: 0, tamanio: 1024, fin: 1023, pid: null, libre: true }]);
  });

  it('es reproducible: dos simulaciones iguales dan el mismo estado', () => {
    const correr = (): unknown => {
      const simulador = new Simulador(1024, 2);
      simulador.registrarProceso('P1', 300, 4);
      simulador.registrarProceso('P2', 800, 2);
      simulador.programarEntradaSalida('P1', 1, 2);
      simulador.avanzarTicks(8);
      return simulador.estado();
    };
    expect(correr()).toEqual(correr());
  });

  it('nunca hay dos procesos ejecutando ni procesos duplicados en las colas', () => {
    const simulador = new Simulador(500, 2);
    simulador.registrarProceso('P1', 200, 5);
    simulador.registrarProceso('P2', 200, 3);
    simulador.registrarProceso('P3', 200, 2);
    simulador.programarEntradaSalida('P2', 1, 3);
    Array.from({ length: 12 }).forEach(() => {
      simulador.avanzarTick();
      expect(simulador.consultarProcesos().filter((p) => p.estado === 'EJECUTANDO').length).toBeLessThanOrEqual(1);
      const pids = [
        ...simulador.consultarColaListos(),
        ...simulador.consultarProcesosBloqueados(),
        ...simulador.consultarProcesosEsperando(),
      ].map((p) => p.pid);
      expect(new Set(pids).size).toBe(pids.length);
    });
  });

  it('rechaza avanzar una cantidad de ticks inválida', () => {
    const simulador = new Simulador();
    expect(() => simulador.avanzarTicks(0)).toThrow(ErrorDeDominio);
    expect(simulador.getTick()).toBe(0);
  });
});
