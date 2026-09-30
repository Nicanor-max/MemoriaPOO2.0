import { describe, expect, it } from 'vitest';
import { ConfiguracionSimulacion, GestorMemoria, Metricas, PrimerAjuste, Simulador } from '../src/index';

describe('RF09 - Metricas (unitario)', () => {
  it('huecos no contiguos de 100 y 300 KB: libre 400, mayor 300, fragmentación 25%', () => {
    const memoria = new GestorMemoria(1000, new PrimerAjuste());
    memoria.asignar(1, 100);
    memoria.asignar(2, 200);
    memoria.asignar(3, 300);
    memoria.asignar(4, 400);
    memoria.liberar(1);
    memoria.liberar(3);
    const metricas = new Metricas();

    metricas.recalcular(memoria, 0);

    expect(metricas.getMemoriaLibreTotal()).toBe(400);
    expect(metricas.getMayorBloqueLibre()).toBe(300);
    expect(metricas.getFragmentacionExterna()).toBeCloseTo(25);
    expect(metricas.getOcupacionMemoria()).toBeCloseTo(60);
  });

  it('memoria llena: libre 0, mayor bloque 0, fragmentación 0% y ocupación 100%', () => {
    const memoria = new GestorMemoria(100, new PrimerAjuste());
    memoria.asignar(1, 100);
    const metricas = new Metricas();
    metricas.recalcular(memoria, 1);
    expect(metricas.estado()).toMatchObject({
      memoriaLibreTotal: 0,
      mayorBloqueLibre: 0,
      fragmentacionExterna: 0,
      ocupacionMemoria: 100,
    });
  });

  it('utilización de CPU: 0% en el tick 0 y 100 * ticks ocupados / ticks transcurridos', () => {
    const memoria = new GestorMemoria(100, new PrimerAjuste());
    const metricas = new Metricas();
    metricas.recalcular(memoria, 0);
    expect(metricas.getUtilizacionCpu()).toBe(0);

    metricas.registrarUsoDeCpu(true);
    metricas.registrarUsoDeCpu(false);
    metricas.registrarUsoDeCpu(true);
    metricas.recalcular(memoria, 4);
    expect(metricas.getTicksConCpuOcupada()).toBe(2);
    expect(metricas.getUtilizacionCpu()).toBe(50);
  });

  it('cuenta cambios de contexto acumulados y valida los ticks', () => {
    const metricas = new Metricas();
    metricas.registrarCambioDeContexto();
    metricas.registrarCambioDeContexto();
    expect(metricas.getCambiosDeContexto()).toBe(2);
    expect(() => metricas.recalcular(new GestorMemoria(10, new PrimerAjuste()), -1)).toThrow();
  });
});

describe('RF09 - Métricas recalculadas al final de cada tick (Simulador)', () => {
  it('la utilización baja cuando la CPU queda ociosa', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2));
    simulador.registrarProceso(1, 256, 1);
    simulador.avanzarTicks(4); // ejecuta 1 tick y queda ociosa 3
    expect(simulador.consultarMetricas().utilizacionCpu).toBe(25);
    expect(simulador.consultarMetricas().ocupacionMemoria).toBe(0);
  });

  it('la ocupación refleja la memoria asignada al final del tick', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1000, 2));
    simulador.registrarProceso(1, 250, 5);
    simulador.avanzarTick();
    expect(simulador.consultarMetricas().ocupacionMemoria).toBe(25);
    expect(simulador.consultarMetricas().memoriaLibreTotal).toBe(750);
  });

  it('no cuenta el despacho inicial, la finalización ni la renovación de quantum', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1024, 1));
    simulador.registrarProceso(1, 100, 3);
    simulador.avanzarTicks(3);
    expect(simulador.consultarMetricas().cambiosDeContexto).toBe(0);
  });
});
