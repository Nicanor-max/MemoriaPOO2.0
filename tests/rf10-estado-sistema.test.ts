import { describe, expect, it } from 'vitest';
import {
  ConfiguracionSimulacion,
  DatosBloque,
  DatosProceso,
  EstadoProceso,
  GestorMemoria,
  PrimerAjuste,
  Simulador,
} from '../src/index';

/**
 * "Imprimí tu estado y lo imprimís completo": en vez de mirar un console.log,
 * se verifica con aserciones el objeto COMPLETO que devuelve estado().
 */
describe('RF10 - estado() completo', () => {
  it('memoria.estado() devuelve toda la información de la memoria', () => {
    const memoria = new GestorMemoria(1000, new PrimerAjuste());
    memoria.asignar(1, 600);
    memoria.asignar(3, 300);

    expect(memoria.estado()).toEqual({
      memoriaTotal: 1000,
      politica: 'Primer ajuste (First-Fit)',
      memoriaOcupada: 900,
      memoriaLibreTotal: 100,
      mayorBloqueLibre: 100,
      bloques: [
        { inicio: 0, tamanio: 600, fin: 599, pid: 1, libre: false },
        { inicio: 600, tamanio: 300, fin: 899, pid: 3, libre: false },
        { inicio: 900, tamanio: 100, fin: 999, pid: null, libre: true },
      ],
    });
  });

  it('simulador.estado() devuelve TODO el sistema en un momento dado', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1000, 2));
    simulador.registrarProceso(1, 600, 2);
    simulador.registrarProceso(2, 500, 1);
    simulador.registrarProceso(3, 300, 1);
    simulador.avanzarTick();

    const p1 = {
      pid: 1, memoriaRequerida: 600, cpuTotal: 2, cpuRestante: 1, cpuConsumida: 1,
      estado: EstadoProceso.Ejecutando, quantumConsumido: 1, bloqueoRestante: 0,
      entradaSalida: null, entradaSalidaDisparada: false,
    };
    const p2 = {
      pid: 2, memoriaRequerida: 500, cpuTotal: 1, cpuRestante: 1, cpuConsumida: 0,
      estado: EstadoProceso.EsperandoMemoria, quantumConsumido: 0, bloqueoRestante: 0,
      entradaSalida: null, entradaSalidaDisparada: false,
    };
    const p3 = {
      pid: 3, memoriaRequerida: 300, cpuTotal: 1, cpuRestante: 1, cpuConsumida: 0,
      estado: EstadoProceso.Listo, quantumConsumido: 0, bloqueoRestante: 0,
      entradaSalida: null, entradaSalidaDisparada: false,
    };

    expect(simulador.estado()).toEqual({
      tick: 1,
      configuracion: { memoriaTotal: 1000, quantum: 2, politica: 'Primer ajuste (First-Fit)' },
      procesos: [p1, p2, p3],
      procesoEnCpu: p1,
      colaListos: [p3],
      procesosEsperando: [p2],
      procesosBloqueados: [],
      procesosTerminados: [],
      memoria: {
        memoriaTotal: 1000,
        politica: 'Primer ajuste (First-Fit)',
        memoriaOcupada: 900,
        memoriaLibreTotal: 100,
        mayorBloqueLibre: 100,
        bloques: [
          { inicio: 0, tamanio: 600, fin: 599, pid: 1, libre: false },
          { inicio: 600, tamanio: 300, fin: 899, pid: 3, libre: false },
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
      historialEjecucion: [1],
    });
  });

  it('muestra la E/S programada y bloqueada en el estado del proceso', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());
    simulador.registrarProceso(1, 100, 3);
    simulador.programarEntradaSalida(1, 1, 2);
    simulador.avanzarTick();
    expect(simulador.consultarProceso(1)).toMatchObject({
      estado: EstadoProceso.Bloqueado,
      bloqueoRestante: 2,
      entradaSalida: { ticksDeCpu: 1, duracion: 2 },
      entradaSalidaDisparada: true,
    });
  });
});

describe('RF10 - Las consultas no permiten modificar el estado interno', () => {
  it('las colecciones y objetos devueltos están congelados', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());
    simulador.registrarProceso(1, 100, 3);
    simulador.registrarProceso(2, 100, 3);
    simulador.avanzarTick();

    const cola = simulador.consultarColaListos();
    const mapa = simulador.consultarMapaMemoria();
    const estado = simulador.estado();

    expect(() => (cola as DatosProceso[]).pop()).toThrow(TypeError);
    expect(() => (mapa as DatosBloque[]).splice(0, 1)).toThrow(TypeError);
    expect(() => {
      (mapa[0] as { tamanio: number }).tamanio = 1;
    }).toThrow(TypeError);
    expect(() => {
      (estado as { tick: number }).tick = 99;
    }).toThrow(TypeError);
    expect(() => {
      (simulador.consultarMetricas() as { cambiosDeContexto: number }).cambiosDeContexto = 5;
    }).toThrow(TypeError);

    expect(simulador.consultarColaListos().map((p) => p.pid)).toEqual([2]);
    expect(simulador.getTick()).toBe(1);
  });

  it('el historial devuelto es una copia', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());
    simulador.avanzarTick();
    const historial = simulador.consultarHistorialEjecucion();
    expect(historial).toEqual([null]);
    expect(() => (historial as (number | null)[]).push(1)).toThrow(TypeError);
    expect(simulador.consultarHistorialEjecucion()).toEqual([null]);
  });
});
