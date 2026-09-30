import { beforeEach, describe, expect, it } from 'vitest';
import { AdministradorMemoria, PrimerAjuste } from '../src/index';

describe('RF05 - Liberación y coalescencia', () => {
  let memoria: AdministradorMemoria;
  const resumen = (): (string | number | null)[][] => memoria.consultarMapa().map((b) => [b.inicio, b.tamanio, b.pid]);

  beforeEach(() => {
    memoria = new AdministradorMemoria(300, new PrimerAjuste()); // [P1][P2][P3]
    memoria.asignar('P1', 100);
    memoria.asignar('P2', 100);
    memoria.asignar('P3', 100);
  });

  it('libera sin fusionar cuando los vecinos están ocupados', () => {
    memoria.liberar('P2');
    expect(resumen()).toEqual([[0, 100, 'P1'], [100, 100, null], [200, 100, 'P3']]);
  });

  it('fusiona con el vecino izquierdo', () => {
    memoria.liberar('P1');
    memoria.liberar('P2');
    expect(resumen()).toEqual([[0, 200, null], [200, 100, 'P3']]);
  });

  it('fusiona con el vecino derecho', () => {
    memoria.liberar('P3');
    memoria.liberar('P2');
    expect(resumen()).toEqual([[0, 100, 'P1'], [100, 200, null]]);
  });

  it('fusiona con ambos; al liberar todo queda un único bloque del tamaño total', () => {
    memoria.liberar('P1');
    memoria.liberar('P3');
    memoria.liberar('P2');
    expect(memoria.consultarMapa()).toEqual([{ inicio: 0, tamanio: 300, fin: 299, pid: null, libre: true }]);
  });

  it('no mueve los bloques ocupados (no es compactación)', () => {
    memoria.liberar('P1');
    expect(memoria.consultarMapa().find((b) => b.pid === 'P3')?.inicio).toBe(200);
    expect(memoria.consultarMapa().reduce((suma, b) => suma + b.tamanio, 0)).toBe(300);
  });

  it('rechaza liberar un proceso sin memoria', () => {
    expect(() => memoria.liberar('P9')).toThrow(/no tiene memoria asignada/);
  });
});
