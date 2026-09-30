import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConfiguracionSimulacion,
  DatosProceso,
  ErrorDeDominio,
  EstadoProceso,
  Proceso,
  RegistroProcesos,
  Simulador,
} from '../src/index';

describe('RF02 - Proceso: datos y contadores', () => {
  it('se crea Nuevo, con CPU restante = CPU total y contadores en 0', () => {
    const proceso = new Proceso(1, 100, 5);
    expect(proceso.estado()).toEqual({
      pid: 1,
      memoriaRequerida: 100,
      cpuTotal: 5,
      cpuRestante: 5,
      cpuConsumida: 0,
      estado: EstadoProceso.Nuevo,
      quantumConsumido: 0,
      bloqueoRestante: 0,
      entradaSalida: null,
      entradaSalidaDisparada: false,
    });
  });

  it.each([
    [0, 100, 5],
    [-1, 100, 5],
    [1.5, 100, 5],
    [1, 0, 5],
    [1, 100, 0],
    [1, 100, -3],
  ])('rechaza datos no enteros positivos (pid=%s, mem=%s, cpu=%s)', (pid, memoria, cpu) => {
    expect(() => new Proceso(pid, memoria, cpu)).toThrow(ErrorDeDominio);
  });
});

describe('RF02 - RegistroProcesos', () => {
  let registro: RegistroProcesos;

  beforeEach(() => {
    registro = new RegistroProcesos(1024);
  });

  it('registra procesos en orden y los consulta', () => {
    registro.registrar(new Proceso(1, 100, 3));
    registro.registrar(new Proceso(2, 200, 2));
    expect(registro.getCantidad()).toBe(2);
    expect(registro.existe(2)).toBe(true);
    expect(registro.existe(9)).toBe(false);
    expect(registro.consultarTodos().map((p) => p.pid)).toEqual([1, 2]);
    expect(registro.buscar(2).getMemoriaRequerida()).toBe(200);
  });

  it('rechaza PID duplicado', () => {
    registro.registrar(new Proceso(1, 100, 3));
    expect(() => registro.registrar(new Proceso(1, 50, 1))).toThrow(/Ya existe/);
    expect(registro.getCantidad()).toBe(1);
  });

  it('acepta un proceso igual a la memoria total y rechaza uno mayor', () => {
    registro.registrar(new Proceso(1, 1024, 1));
    expect(() => registro.registrar(new Proceso(2, 1025, 1))).toThrow(ErrorDeDominio);
  });

  it('falla al buscar un PID inexistente', () => {
    expect(() => registro.buscar(99)).toThrow(/No existe/);
  });

  it('devuelve pendientes de admisión en orden de registro', () => {
    const p1 = new Proceso(1, 10, 1);
    const p2 = new Proceso(2, 10, 1);
    const p3 = new Proceso(3, 10, 1);
    [p1, p2, p3].forEach((p) => registro.registrar(p));
    p2.admitir();
    p3.esperarMemoria();
    expect(registro.pendientesDeAdmision()).toEqual([p1, p3]);
    expect(registro.consultarPorEstado(EstadoProceso.Listo).map((p) => p.pid)).toEqual([2]);
  });

  it('las consultas son copias congeladas: no se puede modificar el estado interno', () => {
    registro.registrar(new Proceso(1, 100, 3));
    const lista = registro.consultarTodos();
    expect(() => (lista as DatosProceso[]).push(lista[0])).toThrow(TypeError);
    expect(() => {
      (lista[0] as { cpuRestante: number }).cpuRestante = 0;
    }).toThrow(TypeError);
    expect(registro.buscar(1).getCpuRestante()).toBe(3);
    expect(registro.estado()).toEqual(registro.consultarTodos());
  });
});

describe('RF02 - Registro a través del Simulador', () => {
  it('registra y consulta sin exponer el objeto interno', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion());
    const datos = simulador.registrarProceso(7, 128, 4);
    expect(datos.estado).toBe(EstadoProceso.Nuevo);
    expect(simulador.consultarProceso(7)).toEqual(datos);
    expect(Object.isFrozen(simulador.consultarProceso(7))).toBe(true);
  });

  it('rechaza PID repetidos y procesos mayores que la memoria', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(256, 2));
    simulador.registrarProceso(1, 100, 1);
    expect(() => simulador.registrarProceso(1, 10, 1)).toThrow(ErrorDeDominio);
    expect(() => simulador.registrarProceso(2, 257, 1)).toThrow(ErrorDeDominio);
    expect(simulador.consultarProcesos()).toHaveLength(1);
  });
});
