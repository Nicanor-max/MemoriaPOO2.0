import { EstadoProceso } from '../comun/EstadoProceso';
import { DatosProceso } from './Datos';
import { IProcesoGestionable } from './IProceso';

/** Funcionalidad: dar de alta y localizar procesos (uso interno del Simulador) (RF02). */
export interface IRegistroProcesos {
  registrar(proceso: IProcesoGestionable): void;
  buscar(pid: number): IProcesoGestionable;
  pendientesDeAdmision(): IProcesoGestionable[];
}

/** Funcionalidad: consultar procesos sin poder modificarlos (RF02 / RF10). */
export interface IConsultaProcesos {
  existe(pid: number): boolean;
  getCantidad(): number;
  consultarTodos(): readonly DatosProceso[];
  consultarPorEstado(estado: EstadoProceso): readonly DatosProceso[];
}
