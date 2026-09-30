import { IBloqueConsultable } from '../../interfaces/IMemoria';
import { PoliticaAsignacion } from './PoliticaAsignacion';

/** Worst-Fit: el hueco suficiente más grande. Empate: menor dirección (se usa ">" estricto). */
export class PeorAjuste extends PoliticaAsignacion {
  public constructor() {
    super('Peor ajuste (Worst-Fit)');
  }

  protected override seleccionar(candidatos: ReadonlyArray<IBloqueConsultable>): IBloqueConsultable {
    return candidatos.reduce((peor, actual) =>
      actual.getTamanio() > peor.getTamanio() ? actual : peor,
    );
  }
}
