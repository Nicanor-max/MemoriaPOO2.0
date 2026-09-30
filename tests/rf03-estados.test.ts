import { describe, expect, it } from 'vitest';
import {
  Bloqueado,
  Ejecutando,
  ErrorDeDominio,
  EsperandoMemoria,
  EstadoProceso,
  Listo,
  Nuevo,
  Proceso,
  Simulador,
  Terminado,
} from '../src/index';

function procesoEjecutando(cpu = 3): Proceso {
  const proceso = new Proceso('P1', 100, cpu);
  proceso.admitir();
  proceso.despachar();
  return proceso;
}

describe('RF03 - Estados (herencia + override)', () => {
  it('cada estado es un EstadoProceso con su nombre', () => {
    const estados = [new Nuevo(), new EsperandoMemoria(), new Listo(), new Ejecutando(), new Bloqueado(), new Terminado()];
    estados.forEach((estado) => expect(estado).toBeInstanceOf(EstadoProceso));
    expect(estados.map((e) => e.getNombre())).toEqual([
      'NUEVO', 'ESPERANDO_MEMORIA', 'LISTO', 'EJECUTANDO', 'BLOQUEADO', 'TERMINADO',
    ]);
  });

  it('sólo NUEVO y ESPERANDO_MEMORIA están pendientes de memoria', () => {
    expect([new Nuevo(), new EsperandoMemoria(), new Listo(), new Terminado()].map((e) => e.estaPendienteDeMemoria()))
      .toEqual([true, true, false, false]);
  });

  it('un estado rechaza las transiciones que no redefine', () => {
    expect(() => new Listo().admitir()).toThrow(/No se puede admitir un proceso en estado LISTO/);
    expect(() => new Nuevo().despachar()).toThrow(ErrorDeDominio);
    expect(() => new Bloqueado().ejecutar()).toThrow(ErrorDeDominio);
    [() => new Listo().bloquear(), () => new Listo().desbloquear(), () => new Listo().terminar()].forEach(
      (transicion) => expect(transicion).toThrow(ErrorDeDominio),
    );
  });
});

describe('RF03 - Transiciones del Proceso', () => {
  it('recorre NUEVO -> ESPERANDO_MEMORIA -> LISTO -> EJECUTANDO -> TERMINADO', () => {
    const proceso = new Proceso('P1', 100, 1);
    proceso.esperarMemoria();
    expect(proceso.getNombreEstado()).toBe('ESPERANDO_MEMORIA');
    proceso.esperarMemoria();
    proceso.admitir();
    expect(proceso.getNombreEstado()).toBe('LISTO');
    proceso.despachar();
    proceso.ejecutarUnaUnidad();
    proceso.terminar();
    expect(proceso.getNombreEstado()).toBe('TERMINADO');
  });

  it('rechaza transiciones inválidas', () => {
    const proceso = new Proceso('P1', 100, 2);
    expect(() => proceso.despachar()).toThrow(ErrorDeDominio);
    expect(() => proceso.expulsar()).toThrow(ErrorDeDominio);
    expect(() => proceso.ejecutarUnaUnidad()).toThrow(ErrorDeDominio);
    expect(() => proceso.avanzarBloqueo()).toThrow(ErrorDeDominio);
  });

  it('no permite terminar con CPU restante ni ejecutar sin CPU', () => {
    expect(() => procesoEjecutando(2).terminar()).toThrow(/le queda CPU/);
    const proceso = procesoEjecutando(1);
    proceso.ejecutarUnaUnidad();
    expect(() => proceso.ejecutarUnaUnidad()).toThrow(/no tiene CPU restante/);
  });

  it('un proceso TERMINADO no vuelve a las colas', () => {
    const proceso = procesoEjecutando(1);
    proceso.ejecutarUnaUnidad();
    proceso.terminar();
    expect(() => proceso.admitir()).toThrow(ErrorDeDominio);
    expect(() => proceso.esperarMemoria()).toThrow(ErrorDeDominio);
    expect(() => proceso.despachar()).toThrow(ErrorDeDominio);
  });

  it('despachar reinicia el quantum; renovarQuantum sólo lo reinicia si se agotó', () => {
    const proceso = procesoEjecutando(5);
    proceso.ejecutarUnaUnidad();
    proceso.renovarQuantum(2);
    expect(proceso.getQuantumConsumido()).toBe(1);
    proceso.ejecutarUnaUnidad();
    expect(proceso.agotoQuantum(2)).toBe(true);
    proceso.renovarQuantum(2);
    expect(proceso.getQuantumConsumido()).toBe(0);
    proceso.ejecutarUnaUnidad();
    proceso.expulsar();
    proceso.despachar();
    expect(proceso.getQuantumConsumido()).toBe(0);
    expect(proceso.getCpuConsumida()).toBe(3);
  });
});

describe('RF03 - Admisión en el Simulador', () => {
  it('admite como LISTO y deja ESPERANDO_MEMORIA al que no entra, sin frenar a los siguientes', () => {
    const simulador = new Simulador(1000, 2);
    simulador.registrarProceso('P1', 600, 2);
    simulador.registrarProceso('P2', 500, 1); // no entra: quedan 400
    simulador.registrarProceso('P3', 300, 1); // sí entra
    simulador.avanzarTick();
    expect(simulador.consultarProcesoEnCpu()?.pid).toBe('P1');
    expect(simulador.consultarColaListos().map((p) => p.pid)).toEqual(['P3']);
    expect(simulador.consultarProcesosEsperando().map((p) => p.pid)).toEqual(['P2']);
  });

  it('la memoria liberada en un tick se ofrece en la admisión del tick siguiente', () => {
    const simulador = new Simulador(1000, 2);
    simulador.registrarProceso('P1', 600, 2);
    simulador.registrarProceso('P2', 500, 1);
    simulador.registrarProceso('P3', 300, 1);
    simulador.avanzarTicks(2); // en el tick 2 termina P1
    expect(simulador.consultarProceso('P1').estado).toBe('TERMINADO');
    expect(simulador.consultarProceso('P2').estado).toBe('ESPERANDO_MEMORIA');
    simulador.avanzarTick();
    expect(simulador.consultarProceso('P2').estado).toBe('LISTO');
    simulador.avanzarTick();
    expect(simulador.consultarHistorialEjecucion()).toEqual(['P1', 'P1', 'P3', 'P2']);
  });
});
