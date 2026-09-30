import { IBloqueConsultable } from '../../interfaces/IMemoria';
import { PoliticaAsignacion } from './PoliticaAsignacion';

/** First-Fit: el primer hueco que alcanza (ya vienen ordenados por dirección). */
export class PrimerAjuste extends PoliticaAsignacion {
  public constructor() {
    super('FIRST_FIT');
  }

  protected override ordenar(candidatos: IBloqueConsultable[]): IBloqueConsultable[] {
    return candidatos;
  }
}
