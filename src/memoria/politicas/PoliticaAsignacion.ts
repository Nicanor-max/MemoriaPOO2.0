import { exigirEnteroPositivo } from '../../comun/validaciones';
import { IBloqueConsultable, IPoliticaAsignacion } from '../../interfaces/IMemoria';

/**
 * Clase ABSTRACTA base de las políticas de asignación contigua (RF04).
 *
 * Por qué abstracta: las tres políticas comparten el MISMO algoritmo
 * (filtrar huecos libres suficientes ordenados por dirección) y sólo cambian
 * en UN paso: cuál de los candidatos elegir. Ese paso es el método abstracto
 * seleccionar() (patrón Método Plantilla).
 *
 * Herencia justificada ("es un"): PrimerAjuste ES UNA PoliticaAsignacion y puede
 * sustituirla en el GestorMemoria sin que este se entere (Liskov).
 */
export abstract class PoliticaAsignacion implements IPoliticaAsignacion {
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

  /** Método plantilla: igual para todas las políticas. */
  public elegirBloque(
    bloques: ReadonlyArray<IBloqueConsultable>,
    tamanio: number,
  ): IBloqueConsultable | null {
    exigirEnteroPositivo(tamanio, 'El tamaño solicitado');
    const candidatos = bloques
      .filter((bloque) => bloque.estaLibre() && bloque.getTamanio() >= tamanio)
      .sort((a, b) => a.getInicio() - b.getInicio());
    if (candidatos.length === 0) {
      return null;
    }
    return this.seleccionar(candidatos);
  }

  /** Paso variable. Recibe candidatos NO vacíos y ordenados por dirección. */
  protected abstract seleccionar(candidatos: ReadonlyArray<IBloqueConsultable>): IBloqueConsultable;
}
