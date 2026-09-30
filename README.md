# Simulador de procesos y memoria (POO)

AE2 de Paradigmas y Lenguajes de Programación II (UCP 2026), en conjunto con Sistemas Operativos.
Es una **biblioteca de clases** en TypeScript, sin interfaz gráfica, sin menú, sin `main` y sin script de demostración.
Su funcionamiento se comprueba **sólo con tests automatizados**.

- Planificación de CPU **Round-Robin** con quantum configurable.
- Memoria contigua con **First-Fit, Best-Fit y Worst-Fit** (se elige al configurar).
- Liberación con **coalescencia**, estados de procesos, **E/S** determinista y **métricas**.

## Requisitos

- Node.js 20 o superior (probado con Node 22)
- npm 10 o superior

## Instalación y comandos

```bash
npm ci                    # instala las dependencias exactas del package-lock.json
npm test                  # corre todos los tests (Vitest)
npm run test:cobertura    # tests + cobertura de líneas (falla si no supera el 90 %)
npm run typecheck         # chequeo de tipos de TypeScript
```

El reporte de cobertura se genera en `cobertura/index.html` (HTML), `cobertura/coverage-summary.json`
y en la consola. Mide **todos** los archivos `src/**/*.ts`, incluso los que ningún test importa.
Sólo se excluyen `src/interfaces/**` y `src/index.ts`, porque tienen únicamente tipos y reexportaciones
y no generan código ejecutable.

GitHub Actions (`.github/workflows/tests.yml`) ejecuta el chequeo de tipos, los tests y la cobertura en cada push.

## Uso desde un test

```ts
const simulador = new Simulador(new ConfiguracionSimulacion(1024, 2, new MejorAjuste()));
simulador.registrarProceso(1, 100, 3);
simulador.registrarProceso(2, 100, 2);
simulador.programarEntradaSalida(1, 1, 2); // tras 1 tick de CPU, bloqueado 2 ticks
simulador.avanzarTicks(5);
expect(simulador.consultarHistorialEjecucion()).toEqual([...]);
console.log(simulador.estado()); // estado COMPLETO del sistema (copia de sólo lectura)
```

## Estructura

```
src/
  comun/          ErrorDeDominio, EstadoProceso, validaciones
  interfaces/     contratos (una interfaz por funcionalidad) y tipos Datos* (copias de sólo lectura)
  procesos/       Proceso, EventoEntradaSalida, RegistroProcesos, ColaBloqueados
  memoria/        GestorMemoria, BloqueMemoria, politicas/ (abstracta + 3 políticas)
  planificacion/  PlanificadorRoundRobin
  metricas/       Metricas
  simulador/      ConfiguracionSimulacion, Simulador (coordina las fases del tick)
tests/            un archivo por requerimiento funcional
docs/diagramas/   diagrama de clases y 3 diagramas de secuencia (.puml editables + .png/.svg legibles)
docs/             EXPLICACION.md (guía de diseño para la defensa), BITACORA.md
```

## Orden de un tick (RF06)

1. Admisión: se intenta asignar memoria, en orden de registro, a los procesos Nuevos o en Espera.
2. Actualización de bloqueados: los que terminan su E/S vuelven al final de la cola de Listos.
3. Despacho y ejecución Round-Robin: una unidad de CPU. La prioridad es finalizar, después bloquear por E/S y por último agotar el quantum.
4. Reloj y métricas: se hace `tick + 1` y se recalculan las métricas.

## Matriz RF → clase o método → tests

| RF | Clase / método | Tests |
|----|----------------|-------|
| RF01 | `ConfiguracionSimulacion`, `Simulador` (constructor) | `tests/rf01-configuracion.test.ts` |
| RF02 | `Proceso`, `RegistroProcesos.registrar/buscar`, `Simulador.registrarProceso` | `tests/rf02-procesos.test.ts` |
| RF03 | `Proceso.cambiarEstado/admitir/esperarMemoria`, `Simulador.admitirProcesos` | `tests/rf03-estados.test.ts` |
| RF04 | `GestorMemoria.asignar`, `PoliticaAsignacion` + `PrimerAjuste/MejorAjuste/PeorAjuste`, `BloqueMemoria` | `tests/rf04-asignacion.test.ts` |
| RF05 | `GestorMemoria.liberar`, `BloqueMemoria.absorber` | `tests/rf05-coalescencia.test.ts` |
| RF06 | `Simulador.avanzarTick` (4 fases) | `tests/rf06-rf07-planificacion.test.ts` |
| RF07 | `PlanificadorRoundRobin.ejecutarTick/resolverFinDeUnidad` | `tests/rf06-rf07-planificacion.test.ts` |
| RF08 | `EventoEntradaSalida`, `Proceso.bloquear/avanzarBloqueo`, `ColaBloqueados` | `tests/rf08-entrada-salida.test.ts` |
| RF09 | `Metricas.recalcular/registrar*` | `tests/rf09-metricas.test.ts` |
| RF10 | `Simulador.consultar*` y `estado()` de cada clase | `tests/rf10-estado-sistema.test.ts` |

## Diagramas

- Clases: `docs/diagramas/clases.puml` → `clases.png` / `clases.svg`
- Secuencia 1 (RF03/RF04, admisión y memoria): `secuencia-1-admision-memoria.*`
- Secuencia 2 (RF06/RF07, un tick de Round-Robin): `secuencia-2-tick-round-robin.*`
- Secuencia 3 (RF08, bloqueo por E/S): `secuencia-3-bloqueo-entrada-salida.*`

Para regenerar las imágenes: `java -jar plantuml.jar -tpng docs/diagramas/*.puml`.
