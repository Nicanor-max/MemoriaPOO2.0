import { describe, expect, it } from 'vitest';
import { AdministradorMemoria, Metricas, PrimerAjuste, Simulador } from '../src/index';

describe('RF09 - Metricas', () => {
  it('huecos no contiguos de 100 y 300 KB: libre 400, mayor 300, fragmentación 25 %', () => {
    const memoria = new AdministradorMemoria(1000, new PrimerAjuste());
    ['P1', 'P2', 'P3', 'P4'].forEach((pid, i) => memoria.asignar(pid, (i + 1) * 100));
    memoria.liberar('P1');
    memoria.liberar('P3');
    const metricas = new Metricas();
    metricas.recalcular(memoria, 0);
    expect(metricas.getMemoriaLibreTotal()).toBe(400);
    expect(metricas.getMayorBloqueLibre()).toBe(300);
    expect(metricas.getFragmentacionExterna()).toBeCloseTo(25);
    expect(metricas.getOcupacionMemoria()).toBeCloseTo(60);
  });

  it('memoria llena: libre 0, mayor 0, fragmentación 0 % y ocupación 100 %', () => {
    const memoria = new AdministradorMemoria(100, new PrimerAjuste());
    memoria.asignar('P1', 100);
    const metricas = new Metricas();
    metricas.recalcular(memoria, 1);
    expect(metricas.estado()).toMatchObject({
      memoriaLibreTotal: 0, mayorBloqueLibre: 0, fragmentacionExterna: 0, ocupacionMemoria: 100,
    });
  });

  it('utilización: 0 % en el tick 0 y 100 × ocupados / transcurridos', () => {
    const memoria = new AdministradorMemoria(100, new PrimerAjuste());
    const metricas = new Metricas();
    metricas.recalcular(memoria, 0);
    expect(metricas.getUtilizacionCpu()).toBe(0);
    metricas.registrarTick({ pidEjecutado: 'P1', terminados: [], cambiosDeContexto: 1 });
    metricas.registrarTick({ pidEjecutado: null, terminados: [], cambiosDeContexto: 0 });
    metricas.recalcular(memoria, 2);
    expect(metricas.getUtilizacionCpu()).toBe(50);
    expect(metricas.getCambiosDeContexto()).toBe(1);
    expect(metricas.getTicksConCpuOcupada()).toBe(1);
    expect(() => metricas.recalcular(memoria, -1)).toThrow();
  });

  it('en el simulador la utilización baja cuando la CPU queda ociosa', () => {
    const simulador = new Simulador(1000, 2);
    simulador.registrarProceso('P1', 250, 1);
    simulador.avanzarTicks(4);
    expect(simulador.consultarMetricas().utilizacionCpu).toBe(25);
  });

  it('la ocupación refleja la memoria al final del tick', () => {
    const simulador = new Simulador(1000, 2);
    simulador.registrarProceso('P1', 250, 5);
    simulador.avanzarTick();
    expect(simulador.consultarMetricas()).toMatchObject({ ocupacionMemoria: 25, memoriaLibreTotal: 750 });
  });

  it('no cuenta despacho inicial, finalización ni renovación de quantum', () => {
    const simulador = new Simulador(1024, 1);
    simulador.registrarProceso('P1', 100, 3);
    simulador.avanzarTicks(3);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(0);
  });
});
