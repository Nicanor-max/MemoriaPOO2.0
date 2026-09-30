/**
 * Contrato común: el objeto sabe devolver una COPIA COMPLETA y de sólo lectura
 * de su estado interno. Sirve para inspeccionarlo (console.log(obj.estado()))
 * y para verificarlo en los tests sin exponer los atributos privados.
 */
export interface IImprimible<T> {
  estado(): T;
}
