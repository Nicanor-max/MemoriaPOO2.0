/** El objeto sabe devolver una copia completa (y de sólo lectura) de su estado. */
export interface IImprimible<T> {
  estado(): T;
}
