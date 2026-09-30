# MemoriaPOO 2.0: simulador de procesos y memoria

AE2 de Paradigmas y Lenguajes de Programación II (UCP 2026), en conjunto con Sistemas Operativos.
Es la versión en **TypeScript orientada a objetos** del `main.py` de la cátedra, con todos los requerimientos RF01 a RF10.

- Es una **biblioteca de clases**: no tiene interfaz gráfica, menú, `main` ni script de demostración. Se prueba sólo con tests.
- **Sin `if`**: las decisiones se toman con herencia, `override` y polimorfismo (ver `docs/EXPLICACION.md`).
- **Doble encapsulamiento** en todas las clases: atributos privados con `_` y acceso sólo por getters y setters.
- Round-Robin con quantum configurable, **First-Fit / Best-Fit / Worst-Fit**, coalescencia, E/S determinista y métricas.

## Requisitos

Node.js 20 o superior (probado con 22) y npm 10.

## Comandos

```bash
npm ci                    # instalar dependencias
npm test                  # correr los tests (Vitest)
npm run test:cobertura    # tests + cobertura de líneas (falla si no supera el 90 %)
npm run typecheck         # chequeo de tipos
```

La cobertura se mide con **Vitest + V8** sobre todos los archivos `src/**/*.ts`. Se excluyen sólo `src/interfaces/**` y `src/index.ts`, que no tienen código ejecutable.
El reporte queda en `cobertura/index.html`.
GitHub Actions (`.github/workflows/tests.yml`) corre el chequeo de tipos, los tests y la cobertura en cada push.

## Uso desde un test

```ts
const simulador = new Simulador(1024, 2, new PrimerAjuste()); // igual que SimuladorSO("FIRST_FIT", 2)
simulador.registrarProceso('P1', 200, 4);
simulador.programarEntradaSalida('P1', 1, 2);  // tras 1 tick de CPU se bloquea 2 ticks
simulador.avanzarTicks(12);
console.log(simulador.estado());               // estado completo (copia de sólo lectura)
```

## Equivalencia con el `main.py`

| Python (cátedra) | TypeScript |
|------------------|------------|
| `Proceso` (con `estado = "LISTO"`) | `Proceso` + estados `Nuevo`, `EsperandoMemoria`, `Listo`, `Ejecutando`, `Bloqueado`, `Terminado` |
| `BloqueMemoria` | `BloqueMemoria` |
| `AdministradorMemoria.asignar_first_fit/best_fit/worst_fit` | `AdministradorMemoria.asignar` + `PrimerAjuste`, `MejorAjuste`, `PeorAjuste` |
| `coalescencia()` | `AdministradorMemoria.coalescencia()` (privado, automático al liberar) |
| `obtener_metricas()` | `Metricas` |
| `SimuladorSO.avanzar_tick()` | `Simulador.avanzarTick()` + `PlanificadorRoundRobin` + reglas |
| `bloquear_proceso_actual()` | `programarEntradaSalida(pid, ticksDeCpu, duracion)` (determinista) |
| `print(...)` / `imprimir_mapa()` | `estado()` / `consultarMapaMemoria()` verificados con tests |

## Orden de un tick (RF06)

1. Admisión: en orden de registro, se asigna memoria a los procesos NUEVOS o en ESPERANDO_MEMORIA.
2. Bloqueados: se descuenta la E/S y los que terminan vuelven al final de la cola de LISTOS.
3. Despacho y ejecución Round-Robin de una unidad. Prioridad: terminar, después E/S, después quantum, y si no, continuar.
4. Reloj y métricas.

## Matriz RF → clase → tests

| RF | Clases / métodos | Tests |
|----|------------------|-------|
| RF01 | `Simulador` (constructor) | `tests/rf01-configuracion.test.ts` |
| RF02 | `Proceso`, `Simulador.registrarProceso` | `tests/rf02-procesos.test.ts` |
| RF03 | `EstadoProceso` y sus 6 subclases, `Simulador.admitirProcesos` | `tests/rf03-estados.test.ts` |
| RF04 | `AdministradorMemoria.asignar`, `PoliticaAsignacion` + 3 políticas, `BloqueMemoria` | `tests/rf04-asignacion.test.ts` |
| RF05 | `AdministradorMemoria.liberar/coalescencia` | `tests/rf05-coalescencia.test.ts` |
| RF06 | `Simulador.avanzarTick` | `tests/rf06-rf07-planificacion.test.ts` |
| RF07 | `PlanificadorRoundRobin`, `ReglaFinalizacion`, `ReglaQuantumAgotado`, `ReglaContinuar` | `tests/rf06-rf07-planificacion.test.ts` |
| RF08 | `EntradaSalida`, `SinEntradaSalida`, `ReglaEntradaSalida`, `Proceso.bloquear/desbloquear` | `tests/rf08-entrada-salida.test.ts` |
| RF09 | `Metricas` | `tests/rf09-metricas.test.ts` |
| RF10 | `consultar*()` y `estado()` | `tests/rf10-estado-sistema.test.ts` |

## Estructura

```
src/
  comun/            ErrorDeDominio, Validador (exigir sin if)
  interfaces/       contratos por funcionalidad y tipos Datos*
  procesos/         Proceso, EntradaSalida, SinEntradaSalida, estados/ (abstracta + 6)
  memoria/          AdministradorMemoria, BloqueMemoria, politicas/ (abstracta + 3)
  planificacion/    PlanificadorRoundRobin, reglas/ (4 reglas)
  metricas/         Metricas
  Simulador.ts      coordina las 4 fases del tick
tests/              un archivo por requerimiento
docs/diagramas/     diagrama de clases + 3 de secuencia (.puml editables, .png/.svg legibles)
docs/               EXPLICACION.md (guía para la defensa), BITACORA.md
```

Para regenerar los diagramas: `java -DPLANTUML_LIMIT_SIZE=16384 -jar plantuml.jar -tpng docs/diagramas/*.puml`.
