import { describe, expect, it } from 'vitest';
import {
  AdministradorMemoria,
  BloqueMemoria,
  ErrorDeDominio,
  IPoliticaAsignacion,
  MejorAjuste,
  PeorAjuste,
  PoliticaAsignacion,
  PrimerAjuste,
} from '../src/index';

/** Huecos libres: 0(100), 150(300), 500(120). Ocupados: 100(50), 450(50). */
function bloquesDePrueba(): BloqueMemoria[] {
  const bloques = [
    new BloqueMemoria(0, 100),
    new BloqueMemoria(100, 50),
    new BloqueMemoria(150, 300),
    new BloqueMemoria(450, 50),
    new BloqueMemoria(500, 120),
  ];
  bloques[1].asignarA('X');
  bloques[3].asignarA('Y');
  return bloques;
}

describe('RF04 - BloqueMemoria', () => {
  it('conoce inicio, tamaño, fin y si está libre', () => {
    const bloque = new BloqueMemoria(100, 50);
    expect(bloque.estado()).toEqual({ inicio: 100, tamanio: 50, fin: 149, pid: null, libre: true });
    bloque.asignarA('P3');
    expect(bloque.estaLibre()).toBe(false);
  });

  it('valida sus reglas', () => {
    expect(() => new BloqueMemoria(-1, 10)).toThrow(ErrorDeDominio);
    expect(() => new BloqueMemoria(0, 0)).toThrow(ErrorDeDominio);
    const bloque = new BloqueMemoria(0, 10);
    expect(() => bloque.liberar()).toThrow(/ya está libre/);
    expect(() => bloque.recortarA(11)).toThrow(ErrorDeDominio);
    bloque.asignarA('P1');
    expect(() => bloque.asignarA('P2')).toThrow(/ocupado/);
  });
});

describe('RF04 - Políticas (polimorfismo: mismo mensaje, distinto comportamiento)', () => {
  it.each<[IPoliticaAsignacion, number, number]>([
    [new PrimerAjuste(), 110, 150],
    [new MejorAjuste(), 110, 500],
    [new PeorAjuste(), 110, 150],
    [new PrimerAjuste(), 50, 0],
    [new MejorAjuste(), 50, 0],
    [new PeorAjuste(), 50, 150],
  ])('%s para %i KB elige el hueco en %i', (politica, tamanio, inicio) => {
    expect(politica.elegir(bloquesDePrueba(), tamanio).map((b) => b.getInicio())).toEqual([inicio]);
  });

  it.each([new PrimerAjuste(), new MejorAjuste(), new PeorAjuste()])(
    '%s es una PoliticaAsignacion; en empate elige la menor dirección y sin hueco devuelve []',
    (politica) => {
      expect(politica).toBeInstanceOf(PoliticaAsignacion);
      const ocupado = new BloqueMemoria(100, 10);
      ocupado.asignarA('X');
      const empate = [new BloqueMemoria(110, 100), ocupado, new BloqueMemoria(0, 100)];
      expect(politica.elegir(empate, 100).map((b) => b.getInicio())).toEqual([0]);
      expect(politica.elegir(bloquesDePrueba(), 301)).toEqual([]);
    },
  );
});

describe('RF04 - AdministradorMemoria', () => {
  it('partición parcial: parte el bloque y deja el sobrante libre', () => {
    const memoria = new AdministradorMemoria(1024, new PrimerAjuste());
    expect(memoria.asignar('P1', 100)).toBe(true);
    expect(memoria.consultarMapa()).toEqual([
      { inicio: 0, tamanio: 100, fin: 99, pid: 'P1', libre: false },
      { inicio: 100, tamanio: 924, fin: 1023, pid: null, libre: true },
    ]);
  });

  it('ajuste exacto: no genera bloques de tamaño cero', () => {
    const memoria = new AdministradorMemoria(1024, new PrimerAjuste());
    memoria.asignar('P1', 1024);
    expect(memoria.consultarMapa()).toEqual([{ inicio: 0, tamanio: 1024, fin: 1023, pid: 'P1', libre: false }]);
  });

  it('fracasa sin modificar nada aunque la suma de huecos alcance', () => {
    const memoria = new AdministradorMemoria(1000, new PrimerAjuste());
    ['P1', 'P2', 'P3', 'P4'].forEach((pid, i) => memoria.asignar(pid, (i + 1) * 100));
    memoria.liberar('P1');
    memoria.liberar('P3');
    const antes = memoria.consultarMapa();
    expect(memoria.getMemoriaLibreTotal()).toBe(400);
    expect(memoria.asignar('P5', 350)).toBe(false);
    expect(memoria.consultarMapa()).toEqual(antes);
  });

  it('selección según la política configurada', () => {
    const inicioDe = (politica: IPoliticaAsignacion): number | undefined => {
      const memoria = new AdministradorMemoria(1000, politica);
      memoria.asignar('P1', 300); // 0..299
      memoria.asignar('P2', 200); // 300..499 -> libre 500..999 (500)
      memoria.liberar('P1'); //                  libre 0..299 (300)
      memoria.asignar('P9', 250);
      return memoria.consultarMapa().find((b) => b.pid === 'P9')?.inicio;
    };
    expect(inicioDe(new PrimerAjuste())).toBe(0);
    expect(inicioDe(new MejorAjuste())).toBe(0);
    expect(inicioDe(new PeorAjuste())).toBe(500);
  });

  it('rechaza asignar dos veces al mismo proceso o tamaños inválidos', () => {
    const memoria = new AdministradorMemoria(100, new PrimerAjuste());
    memoria.asignar('P1', 10);
    expect(() => memoria.asignar('P1', 10)).toThrow(/ya tiene memoria/);
    expect(() => memoria.asignar('P2', -5)).toThrow(ErrorDeDominio);
    expect(memoria.estado().politica).toBe('FIRST_FIT');
  });
});
