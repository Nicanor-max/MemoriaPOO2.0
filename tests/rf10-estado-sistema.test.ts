import { describe, expect, it } from 'vitest';
import { AdministradorMemoria, DatosBloque, DatosProceso, PrimerAjuste, Simulador } from '../src/index';

/** "Imprimí tu estado completo": se verifica con aserciones el objeto que devuelve estado(). */
describe('RF10 - estado() completo', () => {
  it('memoria.estado()', () => {
    const memoria = new AdministradorMemoria(1000, new PrimerAjuste());
    memoria.asignar('P1', 600);
    memoria.asignar('P3', 300);
    expect(memoria.estado()).toEqual({
      memoriaTotal: 1000,
      politica: 'FIRST_FIT',
      memoriaOcupada: 900,
      memoriaLibreTotal: 100,
      mayorBloqueLibre: 100,
      bloques: [
        { inicio: 0, tamanio: 600, fin: 599, pid: 'P1', libre: false },
        { inicio: 600, tamanio: 300, fin: 899, pid: 'P3', libre: false },
        { inicio: 900, tamanio: 100, fin: 999, pid: null, libre: true },
      ],
    });
  });

  it('simulador.estado() devuelve TODO el sistema', () => {
    const simulador = new Simulador(1000, 2);
    simulador.registrarProceso('P1', 600, 2);
    simulador.registrarProceso('P2', 500, 1);
    simulador.registrarProceso('P3', 300, 1);
    simulador.avanzarTick();
    const base = { bloqueoRestante: 0, entradaSalida: null };
    const p1 = { ...base, pid: 'P1', memoriaRequerida: 600, cpuTotal: 2, cpuRestante: 1, cpuConsumida: 1, estado: 'EJECUTANDO', quantumConsumido: 1 };
    const p2 = { ...base, pid: 'P2', memoriaRequerida: 500, cpuTotal: 1, cpuRestante: 1, cpuConsumida: 0, estado: 'ESPERANDO_MEMORIA', quantumConsumido: 0 };
    const p3 = { ...base, pid: 'P3', memoriaRequerida: 300, cpuTotal: 1, cpuRestante: 1, cpuConsumida: 0, estado: 'LISTO', quantumConsumido: 0 };

    expect(simulador.estado()).toEqual({
      tick: 1,
      quantum: 2,
      procesos: [p1, p2, p3],
      procesoEnCpu: p1,
      colaListos: [p3],
      procesosEsperando: [p2],
      procesosBloqueados: [],
      procesosTerminados: [],
      memoria: {
        memoriaTotal: 1000,
        politica: 'FIRST_FIT',
        memoriaOcupada: 900,
        memoriaLibreTotal: 100,
        mayorBloqueLibre: 100,
        bloques: [
          { inicio: 0, tamanio: 600, fin: 599, pid: 'P1', libre: false },
          { inicio: 600, tamanio: 300, fin: 899, pid: 'P3', libre: false },
          { inicio: 900, tamanio: 100, fin: 999, pid: null, libre: true },
        ],
      },
      metricas: {
        ocupacionMemoria: 90,
        utilizacionCpu: 100,
        cambiosDeContexto: 0,
        memoriaLibreTotal: 100,
        mayorBloqueLibre: 100,
        fragmentacionExterna: 0,
        ticksConCpuOcupada: 1,
      },
      historialEjecucion: ['P1'],
    });
  });

  it('muestra la E/S programada en el estado del proceso', () => {
    const simulador = new Simulador();
    simulador.registrarProceso('P1', 100, 3);
    simulador.programarEntradaSalida('P1', 1, 2);
    simulador.avanzarTick();
    expect(simulador.consultarProceso('P1')).toMatchObject({
      estado: 'BLOQUEADO',
      bloqueoRestante: 2,
      entradaSalida: { ticksDeCpu: 1, duracion: 2 },
    });
  });
});

describe('RF10 - Las consultas no permiten modificar el estado interno', () => {
  it('colecciones y objetos devueltos están congelados', () => {
    const simulador = new Simulador();
    simulador.registrarProceso('P1', 100, 3);
    simulador.registrarProceso('P2', 100, 3);
    simulador.avanzarTick();
    const cola = simulador.consultarColaListos();
    const mapa = simulador.consultarMapaMemoria();
    expect(() => (cola as DatosProceso[]).pop()).toThrow(TypeError);
    expect(() => (mapa as DatosBloque[]).splice(0, 1)).toThrow(TypeError);
    expect(() => {
      (mapa[0] as { tamanio: number }).tamanio = 1;
    }).toThrow(TypeError);
    expect(() => {
      (simulador.estado() as { tick: number }).tick = 99;
    }).toThrow(TypeError);
    expect(() => (simulador.consultarHistorialEjecucion() as string[]).push('X')).toThrow(TypeError);
    expect(simulador.consultarColaListos().map((p) => p.pid)).toEqual(['P2']);
    expect(simulador.getTick()).toBe(1);
  });
});
