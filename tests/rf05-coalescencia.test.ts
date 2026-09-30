import { beforeEach, describe, expect, it } from 'vitest';
import { GestorMemoria, PrimerAjuste } from '../src/index';

describe('RF05 - Liberación y coalescencia', () => {
  let memoria: GestorMemoria;

  // Memoria llena con tres procesos de 100 KB: [P1][P2][P3]
  beforeEach(() => {
    memoria = new GestorMemoria(300, new PrimerAjuste());
    memoria.asignar(1, 100);
    memoria.asignar(2, 100);
    memoria.asignar(3, 100);
  });

  it('libera sin fusionar cuando los vecinos están ocupados', () => {
    memoria.liberar(2);
    expect(memoria.consultarMapa().map((b) => [b.inicio, b.tamanio, b.pid])).toEqual([
      [0, 100, 1],
      [100, 100, null],
      [200, 100, 3],
    ]);
  });

  it('fusiona con el vecino izquierdo', () => {
    memoria.liberar(1);
    memoria.liberar(2);
    expect(memoria.consultarMapa().map((b) => [b.inicio, b.tamanio, b.pid])).toEqual([
      [0, 200, null],
      [200, 100, 3],
    ]);
  });

  it('fusiona con el vecino derecho', () => {
    memoria.liberar(3);
    memoria.liberar(2);
    expect(memoria.consultarMapa().map((b) => [b.inicio, b.tamanio, b.pid])).toEqual([
      [0, 100, 1],
      [100, 200, null],
    ]);
  });

  it('fusiona con ambos vecinos y, al liberar todo, queda un único bloque del tamaño total', () => {
    memoria.liberar(1);
    memoria.liberar(3);
    memoria.liberar(2);
    expect(memoria.consultarMapa()).toEqual([
      { inicio: 0, tamanio: 300, fin: 299, pid: null, libre: true },
    ]);
    expect(memoria.getMemoriaLibreTotal()).toBe(300);
  });

  it('conserva tamaño total, orden y continuidad (no compacta: los ocupados no se mueven)', () => {
    memoria.liberar(1);
    const mapa = memoria.consultarMapa();
    expect(mapa.reduce((suma, b) => suma + b.tamanio, 0)).toBe(300);
    mapa.forEach((bloque, i) => {
      if (i > 0) expect(bloque.inicio).toBe(mapa[i - 1].fin + 1);
    });
    expect(mapa.find((b) => b.pid === 3)?.inicio).toBe(200);
  });

  it('rechaza liberar un proceso sin memoria asignada', () => {
    expect(() => memoria.liberar(99)).toThrow(/no tiene memoria asignada/);
  });
});
