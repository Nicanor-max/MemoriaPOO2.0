import { IBloqueConsultable } from '../../interfaces/IMemoria';
import { PoliticaAsignacion } from './PoliticaAsignacion';

/** Worst-Fit: el hueco más grande. */
export class PeorAjuste extends PoliticaAsignacion {
  public constructor() {
    super('WORST_FIT');
  }

  protected override ordenar(candidatos: IBloqueConsultable[]): IBloqueConsultable[] {
    return [...candidatos].sort((a, b) => b.getTamanio() - a.getTamanio());
  }
}
