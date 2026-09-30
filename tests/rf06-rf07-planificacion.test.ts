import { describe, expect, it } from 'vitest';
import {
  ConfiguracionSimulacion,
  ErrorDeDominio,
  EstadoProceso,
  PlanificadorRoundRobin,
  Proceso,
  Simulador,
} from '../src/index';

function listo(pid: number, cpu: number): Proceso {
  const proceso = new Proceso(pid, 10, cpu);
  proceso.admitir();
  return proceso;
}

describe('RF07 - PlanificadorRoundRobin (unitario)', () => {
  it('con la CPU libre y sin listos registra un tick ocioso', () => {
    const planificador = new PlanificadorRoundRobin(2);
    const resultado = planificador.ejecutarTick();
    expect(resultado.pidEjecutado).toBeNull();
    expect(planificador.estaCpuOcupada()).toBe(false);
    expect(planificador.consultarHistorialEjecucion()).toEqual([null]);
  });

  it('caso de la consigna: Q=2, P1 CPU 3, P2 CPU 2 -> P1 P1 P2 P2 P1 y un cambio de contexto', () => {
    const planificador = new PlanificadorRoundRobin(2);
    planificador.encolar(listo(1, 3));
    planificador.encolar(listo(2, 2));
    let cambios = 0;
    for (let i = 0; i < 5; i++) {
      if (planificador.ejecutarTick().huboCambioDeContexto) cambios++;
    }
    expect(planificador.consultarHistorialEjecucion()).toEqual([1, 1, 2, 2, 1]);
    expect(cambios).toBe(1);
  });

  it('un único proceso renueva su quantum sin cambio de contexto', () => {
    const planificador = new PlanificadorRoundRobin(2);
    const p1 = listo(1, 5);
    planificador.encolar(p1);
    planificador.ejecutarTick();
    const segundo = planificador.ejecutarTick();
    expect(segundo.huboCambioDeContexto).toBe(false);
    expect(p1.getQuantumConsumido()).toBe(0);
    expect(planificador.consultarProcesoEnCpu()?.pid).toBe(1);
  });

  it('terminar justo en el límite del quantum no reencola; el siguiente corre recién en el próximo tick', () => {
    const planificador = new PlanificadorRoundRobin(2);
    const p1 = listo(1, 2);
    planificador.encolar(p1);
    planificador.encolar(listo(2, 2));
    planificador.ejecutarTick();
    const resultado = planificador.ejecutarTick();

    expect(resultado.procesoTerminado).toBe(p1);
    expect(resultado.huboCambioDeContexto).toBe(false);
    expect(p1.getEstado()).toBe(EstadoProceso.Terminado);
    expect(planificador.consultarProcesoEnCpu()).toBeNull();
    expect(planificador.consultarColaListos().map((p) => p.pid)).toEqual([2]);
  });

  it('rechaza encolar procesos que no están Listos o que ya están en el planificador', () => {
    const planificador = new PlanificadorRoundRobin(2);
    expect(() => planificador.encolar(new Proceso(1, 10, 1))).toThrow(ErrorDeDominio);
    const p2 = listo(2, 3);
    planificador.encolar(p2);
    expect(() => planificador.encolar(p2)).toThrow(/ya está/);
    expect(() => new PlanificadorRoundRobin(0)).toThrow(ErrorDeDominio);
  });

  it('estado() devuelve CPU, cola e historial como copias', () => {
    const planificador = new PlanificadorRoundRobin(2);
    planificador.encolar(listo(1, 3));
    planificador.encolar(listo(2, 1));
    planificador.ejecutarTick();
    const estado = planificador.estado();
    expect(estado.quantum).toBe(2);
    expect(estado.procesoEnCpu?.pid).toBe(1);
    expect(estado.colaListos.map((p) => p.pid)).toEqual([2]);
    expect(estado.historialEjecucion).toEqual([1]);
    expect(Object.isFrozen(estado.colaListos)).toBe(true);
  });
});

describe('RF06 - Tick determinista (colaboración del Simulador)', () => {
  it('Round-Robin de la consigna a través del Simulador', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2));
    simulador.registrarProceso(1, 100, 3);
    simulador.registrarProceso(2, 100, 2);

    simulador.avanzarTicks(5);

    expect(simulador.getTick()).toBe(5);
    expect(simulador.consultarHistorialEjecucion()).toEqual([1, 1, 2, 2, 1]);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(1);
    expect(simulador.consultarMetricas().utilizacionCpu).toBe(100);
    expect(simulador.consultarProcesosTerminados().map((p) => p.pid)).toEqual([1, 2]);
    expect(simulador.consultarMapaMemoria()).toHaveLength(1); // toda la memoria libre otra vez
  });

  it('es reproducible: dos simulaciones iguales dan el mismo estado', () => {
    const correr = (): unknown => {
      const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2));
      simulador.registrarProceso(1, 300, 4);
      simulador.registrarProceso(2, 800, 2);
      simulador.programarEntradaSalida(1, 1, 2);
      simulador.avanzarTicks(8);
      return simulador.estado();
    };
    expect(correr()).toEqual(correr());
  });

  it('como máximo un proceso por tick y nunca procesos duplicados en colas', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(500, 2));
    simulador.registrarProceso(1, 200, 5);
    simulador.registrarProceso(2, 200, 3);
    simulador.registrarProceso(3, 200, 2);
    simulador.programarEntradaSalida(2, 1, 3);

    for (let i = 0; i < 12; i++) {
      simulador.avanzarTick();
      const ejecutando = simulador.consultarProcesos().filter((p) => p.estado === EstadoProceso.Ejecutando);
      expect(ejecutando.length).toBeLessThanOrEqual(1);
      const pids = [
        ...simulador.consultarColaListos(),
        ...simulador.consultarProcesosBloqueados(),
        ...simulador.consultarProcesosEsperando(),
        ...(simulador.consultarProcesoEnCpu() ? [simulador.consultarProcesoEnCpu()!] : []),
      ].map((p) => p.pid);
      expect(new Set(pids).size).toBe(pids.length);
    }
    expect(simulador.consultarHistorialEjecucion()).toHaveLength(12);
  });

  it('rechaza avanzar una cantidad de ticks inválida', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());
    expect(() => simulador.avanzarTicks(0)).toThrow(ErrorDeDominio);
    expect(simulador.getTick()).toBe(0);
  });
});
