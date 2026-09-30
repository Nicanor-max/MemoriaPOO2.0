import { IBloqueConsultable, IPoliticaAsignacion } from '../../interfaces/IMemoria';

/**
 * Clase ABSTRACTA de las políticas de asignación.
 * Comportamiento común (método plantilla): quedarse con los huecos libres que alcanzan,
 * ordenados por dirección, y devolver el primero según el orden de cada política.
 * Lo único que cambia es ordenar(): cada subclase hace override.
 * Devuelve una lista de 0 o 1 bloques, así nadie tiene que preguntar "if (bloque == null)".
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

  public elegir(bloques: ReadonlyArray<IBloqueConsultable>, tamanio: number): IBloqueConsultable[] {
    const candidatos = bloques
      .filter((bloque) => bloque.estaLibre() && bloque.getTamanio() >= tamanio)
      .sort((a, b) => a.getInicio() - b.getInicio());
    return this.ordenar(candidatos).slice(0, 1);
  }

  /** Recibe candidatos ordenados por dirección. El sort es estable: en empate gana la menor dirección. */
  protected abstract ordenar(candidatos: IBloqueConsultable[]): IBloqueConsultable[];
}
