import { ErrorDeDominio } from './ErrorDeDominio';

/**
 * Tabla de despacho: en lugar de un "if", se elige la acción a ejecutar
 * usando el valor de la condición como clave.
 */
const ACCIONES: Record<'true' | 'false', (mensaje: string) => void> = {
  true: () => undefined,
  false: (mensaje: string) => {
    throw new ErrorDeDominio(mensaje);
  },
};

/** Si la condición es falsa lanza ErrorDeDominio. "asserts" le avisa a TypeScript que después vale. */
export function exigir(condicion: boolean, mensaje: string): asserts condicion {
  ACCIONES[String(condicion) as 'true' | 'false'](mensaje);
}

export function exigirEnteroPositivo(valor: number, nombre: string): void {
  exigir(Number.isInteger(valor) && valor > 0, `${nombre} debe ser un entero positivo (recibido: ${valor}).`);
}

export function exigirEnteroNoNegativo(valor: number, nombre: string): void {
  exigir(Number.isInteger(valor) && valor >= 0, `${nombre} debe ser un entero mayor o igual a 0 (recibido: ${valor}).`);
}

export function exigirTexto(valor: string, nombre: string): void {
  exigir(typeof valor === 'string' && valor.trim().length > 0, `${nombre} no puede estar vacío.`);
}
