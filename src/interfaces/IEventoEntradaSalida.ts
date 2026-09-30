/** Funcionalidad: describir un evento de E/S determinista (RF08). */
export interface IEventoEntradaSalida {
  getTicksDeCpu(): number;
  getDuracion(): number;
  correspondeDispararEn(cpuConsumida: number): boolean;
}
