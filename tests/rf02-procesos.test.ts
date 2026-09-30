import { describe, expect, it } from 'vitest';
import { DatosProceso, ErrorDeDominio, Proceso, Simulador } from '../src/index';

describe('RF02 - Proceso', () => {
  it('se crea NUEVO, con CPU restante = CPU total y contadores en 0', () => {
    expect(new Proceso('P1', 100, 5).estado()).toEqual({
      pid: 'P1',
      memoriaRequerida: 100,
      cpuTotal: 5,
      cpuRestante: 5,
      cpuConsumida: 0,
      estado: 'NUEVO',
      quantumConsumido: 0,
      bloqueoRestante: 0,
      entradaSalida: null,
    });
  });

  it.each([
    ['', 100, 5],
    ['  ', 100, 5],
    ['P1', 0, 5],
    ['P1', 1.5, 5],
    ['P1', 100, 0],
    ['P1', 100, -3],
  ])('rechaza datos inválidos (pid="%s", mem=%s, cpu=%s)', (pid, memoria, cpu) => {
    expect(() => new Proceso(pid, memoria, cpu)).toThrow(ErrorDeDominio);
  });
});

describe('RF02 - Registrar y consultar procesos en el Simulador', () => {
  it('registra en orden y consulta', () => {
    const simulador = new Simulador();
    const datos = simulador.registrarProceso('P1', 100, 3);
    simulador.registrarProceso('P2', 200, 2);
    expect(datos.estado).toBe('NUEVO');
    expect(simulador.consultarProceso('P1')).toEqual(datos);
    expect(simulador.consultarProcesos().map((p) => p.pid)).toEqual(['P1', 'P2']);
  });

  it('rechaza PID duplicado sin registrarlo', () => {
    const simulador = new Simulador();
    simulador.registrarProceso('P1', 100, 3);
    expect(() => simulador.registrarProceso('P1', 50, 1)).toThrow(/Ya existe/);
    expect(simulador.consultarProcesos()).toHaveLength(1);
  });

  it('acepta un proceso igual a la memoria total y rechaza uno mayor', () => {
    const simulador = new Simulador(256, 2);
    simulador.registrarProceso('P1', 256, 1);
    expect(() => simulador.registrarProceso('P2', 257, 1)).toThrow(ErrorDeDominio);
  });

  it('falla al consultar un PID inexistente', () => {
    expect(() => new Simulador().consultarProceso('P9')).toThrow(/No existe/);
  });

  it('las consultas son copias congeladas: no se puede modificar el estado interno', () => {
    const simulador = new Simulador();
    simulador.registrarProceso('P1', 100, 3);
    const lista = simulador.consultarProcesos();
    expect(() => (lista as DatosProceso[]).push(lista[0])).toThrow(TypeError);
    expect(() => {
      (lista[0] as { cpuRestante: number }).cpuRestante = 0;
    }).toThrow(TypeError);
    expect(simulador.consultarProceso('P1').cpuRestante).toBe(3);
  });
});
