import { ErrorDeDominio } from './ErrorDeDominio';

/** Funciones de validación reutilizadas por los setters de todas las clases. */

export function exigirEnteroPositivo(valor: number, nombre: string): void {
  if (!Number.isInteger(valor) || valor <= 0) {
    throw new ErrorDeDominio(`${nombre} debe ser un entero positivo (recibido: ${valor}).`);
  }
}

export function exigirEnteroNoNegativo(valor: number, nombre: string): void {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new ErrorDeDominio(`${nombre} debe ser un entero mayor o igual a 0 (recibido: ${valor}).`);
  }
}

export function exigirPorcentaje(valor: number, nombre: string): void {
  if (!Number.isFinite(valor) || valor < 0 || valor > 100) {
    throw new ErrorDeDominio(`${nombre} debe estar entre 0 y 100 (recibido: ${valor}).`);
  }
}
