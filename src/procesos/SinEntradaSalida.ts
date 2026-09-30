import { IEntradaSalida } from '../interfaces/IEntradaSalida';
import { IImprimible } from '../interfaces/IImprimible';

/**
 * "Objeto nulo": representa que el proceso NO tiene E/S.
 * Responde al mismo contrato que EntradaSalida (polimorfismo), así el Proceso
 * nunca pregunta "if (entradaSalida == null)".
 */
export class SinEntradaSalida implements IEntradaSalida, IImprimible<null> {
  public estaProgramada(): boolean {
    return false;
  }

  public correspondeDispararEn(): boolean {
    return false;
  }

  public getDuracion(): number {
    return 0;
  }

  public estado(): null {
    return null;
  }
}
