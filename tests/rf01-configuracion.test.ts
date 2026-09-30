import { describe, expect, it } from 'vitest';
import { ErrorDeDominio, MejorAjuste, Simulador } from '../src/index';

describe('RF01 - Configurar e iniciar la simulación', () => {
  it('usa la configuración de referencia: 1024 KB, quantum 2 y First-Fit', () => {
    const estado = new Simulador().estado();
    expect(estado.memoria.memoriaTotal).toBe(1024);
    expect(estado.quantum).toBe(2);
    expect(estado.memoria.politica).toBe('FIRST_FIT');
  });

  it('permite configurar memoria, quantum y política', () => {
    const estado = new Simulador(512, 3, new MejorAjuste()).estado();
    expect(estado.memoria.memoriaTotal).toBe(512);
    expect(estado.quantum).toBe(3);
    expect(estado.memoria.politica).toBe('BEST_FIT');
  });

  it('inicia en tick 0, un único bloque libre, colas vacías y contadores en cero', () => {
    const simulador = new Simulador();
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

  it('acepta el límite inferior: memoria 1 y quantum 1', () => {
    expect(new Simulador(1, 1).consultarMapaMemoria()).toHaveLength(1);
  });

  it.each([0, -1, 1.5, Number.NaN])('rechaza memoria total inválida (%s)', (memoria) => {
    expect(() => new Simulador(memoria, 2)).toThrow(ErrorDeDominio);
  });

  it.each([0, -2, 2.5])('rechaza quantum inválido (%s)', (quantum) => {
    expect(() => new Simulador(1024, quantum)).toThrow(ErrorDeDominio);
  });

  it('rechaza una política nula', () => {
    expect(() => new Simulador(1024, 2, null as never)).toThrow(ErrorDeDominio);
  });
});
