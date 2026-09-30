import { ErrorDeDominio } from '../../comun/ErrorDeDominio';
import { IEstadoProceso } from '../../interfaces/IEstadoProceso';

/**
 * Clase ABSTRACTA base de los estados (patrón Estado).
 * Comportamiento común: por defecto TODA transición es inválida y lanza error.
 * Cada estado concreto hace override SÓLO de las transiciones que permite.
 * Así se reemplazan los "if (estado == ...)" del código en Python.
 */
export abstract class EstadoProceso implements IEstadoProceso {
  private _nombre!: string;

  protected constructor(nombre: string) {
    this.setNombre(nombre);
  }

  public getNombre(): string {
    return this._nombre;
  }

  private setNombre(valor: string): void {
    this._nombre = valor;
  }

  public estaPendienteDeMemoria(): boolean {
    return false;
  }

  public permiteProgramarEntradaSalida(): boolean {
    return true;
  }

  public admitir(): IEstadoProceso {
    return this.transicionInvalida('admitir');
  }

  public esperarMemoria(): IEstadoProceso {
    return this.transicionInvalida('poner a esperar memoria');
  }

  public despachar(): IEstadoProceso {
    return this.transicionInvalida('despachar');
  }

  public ejecutar(): IEstadoProceso {
    return this.transicionInvalida('ejecutar');
  }

  public expulsar(): IEstadoProceso {
    return this.transicionInvalida('expulsar');
  }

  public bloquear(): IEstadoProceso {
    return this.transicionInvalida('bloquear');
  }

  public avanzarBloqueo(): IEstadoProceso {
    return this.transicionInvalida('avanzar el bloqueo de');
  }

  public desbloquear(): IEstadoProceso {
    return this.transicionInvalida('desbloquear');
  }

  public terminar(): IEstadoProceso {
    return this.transicionInvalida('terminar');
  }

  protected transicionInvalida(accion: string): never {
    throw new ErrorDeDominio(`No se puede ${accion} un proceso en estado ${this.getNombre()}.`);
  }
}
