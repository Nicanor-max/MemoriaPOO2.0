import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { EstadoProceso } from '../comun/EstadoProceso';
import { DatosProceso } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IConsultaBloqueados, IGestionBloqueos } from '../interfaces/IPlanificacion';
import { IProcesoPlanificable } from '../interfaces/IProceso';

/**
 * Procesos bloqueados por E/S (RF08).
 * Responsabilidad única: descontar los temporizadores y devolver los que se desbloquean.
 */
export class ColaBloqueados
  implements IGestionBloqueos, IConsultaBloqueados, IImprimible<readonly DatosProceso[]>
{
  private _procesos!: IProcesoPlanificable[];

  public constructor() {
    this.setProcesos([]);
  }

  // ---------- Doble encapsulamiento ----------
  private getProcesos(): IProcesoPlanificable[] {
    return this._procesos;
  }

  private setProcesos(valor: IProcesoPlanificable[]): void {
    this._procesos = valor;
  }

  // ---------- IGestionBloqueos ----------
  public agregar(proceso: IProcesoPlanificable): void {
    if (proceso.getEstado() !== EstadoProceso.Bloqueado) {
      throw new ErrorDeDominio(`El proceso ${proceso.getPid()} no está bloqueado.`);
    }
    if (this.getProcesos().includes(proceso)) {
      throw new ErrorDeDominio(`El proceso ${proceso.getPid()} ya está en la cola de bloqueados.`);
    }
    this.setProcesos([...this.getProcesos(), proceso]);
  }

  /** Resta un tick a cada bloqueado; devuelve (en orden) los que vuelven a Listo. */
  public actualizarTemporizadores(): IProcesoPlanificable[] {
    const desbloqueados: IProcesoPlanificable[] = [];
    const siguenBloqueados: IProcesoPlanificable[] = [];
    for (const proceso of this.getProcesos()) {
      if (proceso.avanzarBloqueo()) {
        desbloqueados.push(proceso);
      } else {
        siguenBloqueados.push(proceso);
      }
    }
    this.setProcesos(siguenBloqueados);
    return desbloqueados;
  }

  // ---------- IConsultaBloqueados ----------
  public getCantidad(): number {
    return this.getProcesos().length;
  }

  public consultarBloqueados(): readonly DatosProceso[] {
    return Object.freeze(this.getProcesos().map((p) => p.estado()));
  }

  public estado(): readonly DatosProceso[] {
    return this.consultarBloqueados();
  }
}
