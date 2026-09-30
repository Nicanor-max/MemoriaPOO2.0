import { IBloqueConsultable } from '../../interfaces/IMemoria';
import { PoliticaAsignacion } from './PoliticaAsignacion';

/** Best-Fit: el hueco suficiente más chico. Empate: menor dirección (se usa "<" estricto). */
export class MejorAjuste extends PoliticaAsignacion {
  public constructor() {
    super('Mejor ajuste (Best-Fit)');
  }

  protected override seleccionar(candidatos: ReadonlyArray<IBloqueConsultable>): IBloqueConsultable {
    return candidatos.reduce((mejor, actual) =>
      actual.getTamanio() < mejor.getTamanio() ? actual : mejor,
    );
  }
}
