import { describe, expect, it } from 'vitest';
import {
  ConfiguracionSimulacion,
  ErrorDeDominio,
  MejorAjuste,
  Simulador,
} from '../src/index';

describe('RF01 - Configurar e iniciar la simulación', () => {
  it('usa la configuración de referencia: 1024 KB, quantum 2 y First-Fit', () => {
    const configuracion = new ConfiguracionSimulacion();
    expect(configuracion.estado()).toEqual({
      memoriaTotal: 1024,
      quantum: 2,
      politica: 'Primer ajuste (First-Fit)',
    });
  });

  it('permite configurar memoria, quantum y política', () => {
    const configuracion = new ConfiguracionSimulacion(512, 3, new MejorAjuste());
    expect(configuracion.getMemoriaTotal()).toBe(512);
    expect(configuracion.getQuantum()).toBe(3);
    expect(configuracion.getPolitica().getNombre()).toBe('Mejor ajuste (Best-Fit)');
  });

  it('acepta el límite inferior: memoria 1 y quantum 1', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1, 1));
    expect(simulador.consultarMapaMemoria()).toEqual([
      { inicio: 0, tamanio: 1, fin: 0, pid: null, libre: true },
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN])('rechaza memoria total inválida (%s)', (memoria) => {
    expect(() => new ConfiguracionSimulacion(memoria, 2)).toThrow(ErrorDeDominio);
  });

  it.each([0, -2, 2.5])('rechaza quantum inválido (%s)', (quantum) => {
    expect(() => new ConfiguracionSimulacion(1024, quantum)).toThrow(ErrorDeDominio);
  });

  it('rechaza una política nula', () => {
    expect(() => new ConfiguracionSimulacion(1024, 2, null as never)).toThrow(ErrorDeDominio);
  });

  it('rechaza crear un simulador sin configuración (no quedan estados parciales)', () => {
    expect(() => new Simulador(null as never)).toThrow(ErrorDeDominio);
  });

  it('inicia en tick 0, un único bloque libre, colas vacías y contadores en cero', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());

    expect(simulador.getTick()).toBe(0);
    expect(simulador.consultarMapaMemoria()).toEqual([
      { inicio: 0, tamanio: 1024, fin: 1023, pid: null, libre: true },
    ]);
    expect(simulador.consultarProcesos()).toEqual([]);
    expect(simulador.consultarProcesoEnCpu()).toBeNull();
    expect(simulador.consultarColaListos()).toEqual([]);
    expect(simulador.consultarProcesosEsperando()).toEqual([]);
    expect(simulador.consultarProcesosBloqueados()).toEqual([]);
    expect(simulador.consultarProcesosTerminados()).toEqual([]);
    expect(simulador.consultarMetricas()).toEqual({
      ocupacionMemoria: 0,
      utilizacionCpu: 0,
      cambiosDeContexto: 0,
      memoriaLibreTotal: 1024,
      mayorBloqueLibre: 1024,
      fragmentacionExterna: 0,
      ticksConCpuOcupada: 0,
    });
  });
});
