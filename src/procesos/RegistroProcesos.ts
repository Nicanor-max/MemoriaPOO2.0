import { ErrorDeDominio } from '../comun/ErrorDeDominio';
import { EstadoProceso } from '../comun/EstadoProceso';
import { exigirEnteroPositivo } from '../comun/validaciones';
import { DatosProceso } from '../interfaces/Datos';
import { IImprimible } from '../interfaces/IImprimible';
import { IProcesoGestionable } from '../interfaces/IProceso';
import { IConsultaProcesos, IRegistroProcesos } from '../interfaces/IProcesos';

/**
 * Colección de TODOS los procesos registrados, en orden de registro (RF02).
 * Responsabilidad única: garantizar PID único y memoria requerida <= memoria total.
 * La lista interna nunca sale: hacia afuera se entregan copias.
 */
export class RegistroProcesos
  implements IRegistroProcesos, IConsultaProcesos, IImprimible<readonly DatosProceso[]>
{
  private _memoriaTotal!: number;
  private _procesos!: IProcesoGestionable[];

  public constructor(memoriaTotal: number) {
    this.setMemoriaTotal(memoriaTotal);
    this.setProcesos([]);
  }

  // ---------- Doble encapsulamiento ----------
  public getMemoriaTotal(): number {
    return this._memoriaTotal;
  }

  private setMemoriaTotal(valor: number): void {
    exigirEnteroPositivo(valor, 'La memoria total');
    this._memoriaTotal = valor;
  }

  /** Privado: la colección interna no se expone. */
  private getProcesos(): IProcesoGestionable[] {
    return this._procesos;
  }

  private setProcesos(valor: IProcesoGestionable[]): void {
    this._procesos = valor;
  }

  // ---------- IRegistroProcesos ----------
  public registrar(proceso: IProcesoGestionable): void {
    if (this.existe(proceso.getPid())) {
      throw new ErrorDeDominio(`Ya existe un proceso con PID ${proceso.getPid()}.`);
    }
    if (proceso.getMemoriaRequerida() > this.getMemoriaTotal()) {
      throw new ErrorDeDominio(
        `El proceso ${proceso.getPid()} pide ${proceso.getMemoriaRequerida()} KB y la memoria total es ${this.getMemoriaTotal()} KB.`,
      );
    }
    this.setProcesos([...this.getProcesos(), proceso]);
  }

  public buscar(pid: number): IProcesoGestionable {
    const proceso = this.getProcesos().find((p) => p.getPid() === pid);
    if (proceso === undefined) {
      throw new ErrorDeDominio(`No existe un proceso con PID ${pid}.`);
    }
    return proceso;
  }

  /** Nuevos y en espera de memoria, en orden de registro (RF03). */
  public pendientesDeAdmision(): IProcesoGestionable[] {
    return this.getProcesos().filter(
      (p) =>
        p.getEstado() === EstadoProceso.Nuevo || p.getEstado() === EstadoProceso.EsperandoMemoria,
    );
  }

  // ---------- IConsultaProcesos ----------
  public existe(pid: number): boolean {
    return this.getProcesos().some((p) => p.getPid() === pid);
  }

  public getCantidad(): number {
    return this.getProcesos().length;
  }

  public consultarTodos(): readonly DatosProceso[] {
    return Object.freeze(this.getProcesos().map((p) => p.estado()));
  }

  public consultarPorEstado(estado: EstadoProceso): readonly DatosProceso[] {
    return Object.freeze(
      this.getProcesos()
        .filter((p) => p.getEstado() === estado)
        .map((p) => p.estado()),
    );
  }

  public estado(): readonly DatosProceso[] {
    return this.consultarTodos();
  }
}
