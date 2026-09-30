import { IBloqueConsultable } from '../../interfaces/IMemoria';
import { PoliticaAsignacion } from './PoliticaAsignacion';

/** First-Fit: el primer hueco suficiente por dirección. */
export class PrimerAjuste extends PoliticaAsignacion {
  public constructor() {
    super('Primer ajuste (First-Fit)');
  }

  protected override seleccionar(candidatos: ReadonlyArray<IBloqueConsultable>): IBloqueConsultable {
    return candidatos[0];
  }
}
