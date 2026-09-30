import { describe, expect, it } from 'vitest';
import { ConfiguracionSimulacion, ErrorDeDominio, EstadoProceso, Proceso, Simulador } from '../src/index';

function procesoEjecutando(cpu = 3): Proceso {
  const proceso = new Proceso(1, 100, cpu);
  proceso.admitir();
  proceso.despachar();
  return proceso;
}

describe('RF03 - Transiciones de estado protegidas por Proceso', () => {
  it('recorre Nuevo -> EsperandoMemoria -> Listo -> Ejecutando -> Terminado', () => {
    const proceso = new Proceso(1, 100, 1);
    proceso.esperarMemoria();
    expect(proceso.getEstado()).toBe(EstadoProceso.EsperandoMemoria);
    proceso.esperarMemoria(); // puede seguir esperando
    proceso.admitir();
    expect(proceso.getEstado()).toBe(EstadoProceso.Listo);
    proceso.despachar();
    expect(proceso.getEstado()).toBe(EstadoProceso.Ejecutando);
    proceso.ejecutarUnaUnidad();
    proceso.terminar();
    expect(proceso.getEstado()).toBe(EstadoProceso.Terminado);
  });

  it('rechaza transiciones inválidas', () => {
    const proceso = new Proceso(1, 100, 2);
    expect(() => proceso.despachar()).toThrow(/Transición inválida/);
    expect(() => proceso.expulsar()).toThrow(ErrorDeDominio);
    expect(() => proceso.ejecutarUnaUnidad()).toThrow(ErrorDeDominio);
    expect(() => proceso.renovarQuantum()).toThrow(ErrorDeDominio);
    expect(() => proceso.avanzarBloqueo()).toThrow(ErrorDeDominio);
  });

  it('no permite terminar si le queda CPU', () => {
    expect(() => procesoEjecutando(2).terminar()).toThrow(/le queda CPU/);
  });

  it('no permite ejecutar sin CPU restante', () => {
    const proceso = procesoEjecutando(1);
    proceso.ejecutarUnaUnidad();
    expect(() => proceso.ejecutarUnaUnidad()).toThrow(/no tiene CPU restante/);
  });

  it('un proceso Terminado no vuelve a las colas', () => {
    const proceso = procesoEjecutando(1);
    proceso.ejecutarUnaUnidad();
    proceso.terminar();
    expect(() => proceso.admitir()).toThrow(ErrorDeDominio);
    expect(() => proceso.esperarMemoria()).toThrow(ErrorDeDominio);
    expect(() => proceso.despachar()).toThrow(ErrorDeDominio);
  });

  it('despachar reinicia el quantum y la ejecución lo incrementa', () => {
    const proceso = procesoEjecutando(5);
    proceso.ejecutarUnaUnidad();
    proceso.ejecutarUnaUnidad();
    expect(proceso.getQuantumConsumido()).toBe(2);
    expect(proceso.agotoQuantum(2)).toBe(true);
    proceso.expulsar();
    proceso.despachar();
    expect(proceso.getQuantumConsumido()).toBe(0);
    expect(proceso.getCpuConsumida()).toBe(2);
  });
});

describe('RF03 - Admisión en el Simulador', () => {
  it('admite como Listo y deja Esperando Memoria al que no entra, sin frenar a los siguientes', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1000, 2));
    simulador.registrarProceso(1, 600, 2);
    simulador.registrarProceso(2, 500, 1); // no entra: sólo quedan 400
    simulador.registrarProceso(3, 300, 1); // sí entra aunque P2 esté esperando

    simulador.avanzarTick();

    expect(simulador.consultarProcesoEnCpu()?.pid).toBe(1);
    expect(simulador.consultarColaListos().map((p) => p.pid)).toEqual([3]);
    expect(simulador.consultarProcesosEsperando().map((p) => p.pid)).toEqual([2]);
    expect(simulador.consultarProceso(2).estado).toBe(EstadoProceso.EsperandoMemoria);
  });

  it('reintenta la admisión al inicio de cada tick: la memoria liberada sirve en el tick siguiente', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1000, 2));
    simulador.registrarProceso(1, 600, 2);
    simulador.registrarProceso(2, 500, 1);
    simulador.registrarProceso(3, 300, 1);

    simulador.avanzarTicks(2); // en el tick 2 termina P1 y libera 0..599
    expect(simulador.consultarProceso(1).estado).toBe(EstadoProceso.Terminado);
    expect(simulador.consultarProceso(2).estado).toBe(EstadoProceso.EsperandoMemoria);

    simulador.avanzarTick(); // fase 1 del tick 3: ahora P2 entra
    expect(simulador.consultarProceso(2).estado).toBe(EstadoProceso.Listo);
    expect(simulador.consultarProcesosEsperando()).toEqual([]);

    simulador.avanzarTick();
    expect(simulador.consultarHistorialEjecucion()).toEqual([1, 1, 3, 2]);
    expect(simulador.consultarProcesosTerminados().map((p) => p.pid)).toEqual([1, 2, 3]);
  });
});
