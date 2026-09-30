import { describe, expect, it } from 'vitest';
import {
  BloqueMemoria,
  ConfiguracionSimulacion,
  ErrorDeDominio,
  GestorMemoria,
  IPoliticaAsignacion,
  MejorAjuste,
  PeorAjuste,
  PrimerAjuste,
  Simulador,
} from '../src/index';

/** Huecos libres: 0(100), 150(300), 500(120). Ocupados: 100(50), 450(50). */
function bloquesDePrueba(): BloqueMemoria[] {
  return [
    new BloqueMemoria(0, 100),
    new BloqueMemoria(100, 50, 1),
    new BloqueMemoria(150, 300),
    new BloqueMemoria(450, 50, 2),
    new BloqueMemoria(500, 120),
  ];
}

describe('RF04 - BloqueMemoria', () => {
  it('conoce inicio, tamaño, fin y si está libre', () => {
    const bloque = new BloqueMemoria(100, 50);
    expect(bloque.estado()).toEqual({ inicio: 100, tamanio: 50, fin: 149, pid: null, libre: true });
    bloque.asignarA(3);
    expect(bloque.estaLibre()).toBe(false);
    expect(bloque.getPidAsignado()).toBe(3);
  });

  it('valida sus reglas', () => {
    expect(() => new BloqueMemoria(-1, 10)).toThrow(ErrorDeDominio);
    expect(() => new BloqueMemoria(0, 0)).toThrow(ErrorDeDominio);
    expect(() => new BloqueMemoria(0, 10, 0)).toThrow(ErrorDeDominio);
    const ocupado = new BloqueMemoria(0, 10, 1);
    expect(() => ocupado.asignarA(2)).toThrow(/ocupado/);
    const libre = new BloqueMemoria(0, 10);
    expect(() => libre.liberar()).toThrow(/libre/);
    expect(() => libre.recortarA(10)).toThrow(ErrorDeDominio);
    expect(() => libre.absorber(new BloqueMemoria(20, 5))).toThrow(/adyacentes/);
    expect(() => libre.absorber(new BloqueMemoria(10, 5, 1))).toThrow(/libres/);
  });
});

describe('RF04 - Políticas de asignación (polimorfismo)', () => {
  it.each<[string, IPoliticaAsignacion, number, number]>([
    ['First-Fit', new PrimerAjuste(), 110, 150],
    ['Best-Fit', new MejorAjuste(), 110, 500],
    ['Worst-Fit', new PeorAjuste(), 110, 150],
    ['First-Fit', new PrimerAjuste(), 50, 0],
    ['Best-Fit', new MejorAjuste(), 50, 0],
    ['Worst-Fit', new PeorAjuste(), 50, 150],
  ])('%s para %i KB elige el hueco que empieza en %i', (_nombre, politica, tamanio, inicio) => {
    expect(politica.elegirBloque(bloquesDePrueba(), tamanio)?.getInicio()).toBe(inicio);
  });

  it.each([new PrimerAjuste(), new MejorAjuste(), new PeorAjuste()])(
    '%s: ante empate elige la menor dirección y no depende del orden recibido',
    (politica) => {
      const bloques = [new BloqueMemoria(110, 100), new BloqueMemoria(100, 10, 1), new BloqueMemoria(0, 100)];
      expect(politica.elegirBloque(bloques, 100)?.getInicio()).toBe(0);
    },
  );

  it.each([new PrimerAjuste(), new MejorAjuste(), new PeorAjuste()])(
    '%s devuelve null si ningún hueco alcanza y rechaza tamaños inválidos',
    (politica) => {
      expect(politica.elegirBloque(bloquesDePrueba(), 301)).toBeNull();
      expect(() => politica.elegirBloque(bloquesDePrueba(), 0)).toThrow(ErrorDeDominio);
    },
  );
});

describe('RF04 - GestorMemoria: asignación contigua', () => {
  it('partición parcial: divide el bloque y deja el sobrante libre', () => {
    const memoria = new GestorMemoria(1024, new PrimerAjuste());
    expect(memoria.asignar(1, 100)).toBe(true);
    expect(memoria.consultarMapa()).toEqual([
      { inicio: 0, tamanio: 100, fin: 99, pid: 1, libre: false },
      { inicio: 100, tamanio: 924, fin: 1023, pid: null, libre: true },
    ]);
  });

  it('ajuste exacto: no genera bloques de tamaño cero', () => {
    const memoria = new GestorMemoria(1024, new PrimerAjuste());
    expect(memoria.asignar(1, 1024)).toBe(true);
    expect(memoria.consultarMapa()).toEqual([
      { inicio: 0, tamanio: 1024, fin: 1023, pid: 1, libre: false },
    ]);
  });

  it('fracaso sin modificación aunque la suma de libres alcance', () => {
    const memoria = new GestorMemoria(1000, new PrimerAjuste());
    memoria.asignar(1, 100);
    memoria.asignar(2, 200);
    memoria.asignar(3, 300);
    memoria.asignar(4, 400);
    memoria.liberar(1);
    memoria.liberar(3);
    const antes = memoria.consultarMapa();

    expect(memoria.getMemoriaLibreTotal()).toBe(400);
    expect(memoria.asignar(5, 350)).toBe(false);
    expect(memoria.consultarMapa()).toEqual(antes);
    expect(memoria.tieneMemoriaAsignada(5)).toBe(false);
  });

  it('selección según política configurada en el gestor', () => {
    const crear = (politica: IPoliticaAsignacion): GestorMemoria => {
      const memoria = new GestorMemoria(1000, politica);
      memoria.asignar(1, 300); // 0..299
      memoria.asignar(2, 100); // 300..399
      memoria.asignar(3, 100); // 400..499  -> libre 500..999 (500)
      memoria.liberar(1); //                  -> libre 0..299 (300)
      memoria.asignar(9, 250);
      return memoria;
    };
    const inicioDe = (memoria: GestorMemoria): number | undefined =>
      memoria.consultarMapa().find((b) => b.pid === 9)?.inicio;

    expect(inicioDe(crear(new PrimerAjuste()))).toBe(0);
    expect(inicioDe(crear(new MejorAjuste()))).toBe(0);
    expect(inicioDe(crear(new PeorAjuste()))).toBe(500);
  });

  it('rechaza asignar dos veces al mismo proceso o tamaños inválidos', () => {
    const memoria = new GestorMemoria(100, new PrimerAjuste());
    memoria.asignar(1, 10);
    expect(() => memoria.asignar(1, 10)).toThrow(/ya tiene memoria/);
    expect(() => memoria.asignar(2, -5)).toThrow(ErrorDeDominio);
  });

  it('el simulador usa la política elegida en la configuración', () => {
    const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2, new PeorAjuste()));
    expect(simulador.estado().memoria.politica).toBe('Peor ajuste (Worst-Fit)');
  });
});
