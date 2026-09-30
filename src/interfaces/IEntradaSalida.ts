/** Funcionalidad: un evento de E/S (o la ausencia de uno, sin usar null). */
export interface IEntradaSalida {
  estaProgramada(): boolean;
  correspondeDispararEn(cpuConsumida: number): boolean;
  getDuracion(): number;
}
