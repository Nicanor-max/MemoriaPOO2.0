import { EstadoProceso } from '../comun/EstadoProceso';

/*
 * "Fotos" (copias congeladas) del estado de cada objeto.
 * Son lo único que sale hacia afuera: quien las recibe no puede modificar
 * el estado real del simulador.
 */

export interface DatosEventoEntradaSalida {
  readonly ticksDeCpu: number;
  readonly duracion: number;
}

export interface DatosProceso {
  readonly pid: number;
  readonly memoriaRequerida: number;
  readonly cpuTotal: number;
  readonly cpuRestante: number;
  readonly cpuConsumida: number;
  readonly estado: EstadoProceso;
  readonly quantumConsumido: number;
  readonly bloqueoRestante: number;
  readonly entradaSalida: DatosEventoEntradaSalida | null;
  readonly entradaSalidaDisparada: boolean;
}

export interface DatosBloque {
  readonly inicio: number;
  readonly tamanio: number;
  readonly fin: number;
  readonly pid: number | null;
  readonly libre: boolean;
}

export interface DatosMemoria {
  readonly memoriaTotal: number;
  readonly politica: string;
  readonly memoriaOcupada: number;
  readonly memoriaLibreTotal: number;
  readonly mayorBloqueLibre: number;
  readonly bloques: readonly DatosBloque[];
}

export interface DatosConfiguracion {
  readonly memoriaTotal: number;
  readonly quantum: number;
  readonly politica: string;
}

export interface DatosPlanificador {
  readonly quantum: number;
  readonly procesoEnCpu: DatosProceso | null;
  readonly colaListos: readonly DatosProceso[];
  readonly historialEjecucion: readonly (number | null)[];
}

export interface DatosMetricas {
  readonly ocupacionMemoria: number;
  readonly utilizacionCpu: number;
  readonly cambiosDeContexto: number;
  readonly memoriaLibreTotal: number;
  readonly mayorBloqueLibre: number;
  readonly fragmentacionExterna: number;
  readonly ticksConCpuOcupada: number;
}

export interface DatosSimulador {
  readonly tick: number;
  readonly configuracion: DatosConfiguracion;
  readonly procesos: readonly DatosProceso[];
  readonly procesoEnCpu: DatosProceso | null;
  readonly colaListos: readonly DatosProceso[];
  readonly procesosEsperando: readonly DatosProceso[];
  readonly procesosBloqueados: readonly DatosProceso[];
  readonly procesosTerminados: readonly DatosProceso[];
  readonly memoria: DatosMemoria;
  readonly metricas: DatosMetricas;
  readonly historialEjecucion: readonly (number | null)[];
}
