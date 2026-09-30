import { IBloqueConsultable } from '../../interfaces/IMemoria';
import { PoliticaAsignacion } from './PoliticaAsignacion';

/** Best-Fit: el hueco que alcanza y deja menos desperdicio (el más chico). */
export class MejorAjuste extends PoliticaAsignacion {
  public constructor() {
    super('BEST_FIT');
  }

  protected override ordenar(candidatos: IBloqueConsultable[]): IBloqueConsultable[] {
    return [...candidatos].sort((a, b) => a.getTamanio() - b.getTamanio());
  }
}
