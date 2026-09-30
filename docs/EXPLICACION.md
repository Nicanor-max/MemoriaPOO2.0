# Guía de diseño para la defensa

Acá está explicado **por qué** está hecho así cada parte, para que lo puedas contar con tus palabras.
En el informe no pegues código de las clases: poné el diagrama y la explicación.

## 1. Doble encapsulamiento (en TODAS las clases)

1. El atributo es **privado** y empieza con **`_`**: `private _cpuRestante`.
2. **Nadie lo toca directamente, ni la propia clase.** Se lee con `getCpuRestante()` y se escribe con `setCpuRestante()`.
   El setter es **privado** y **valida** la regla del dominio.

```ts
this.setQuantumConsumido(this.getQuantumConsumido() + 1);   // nunca this._quantumConsumido++
```

- Getter de un número o texto: **público**.
- Getter de un objeto o de una lista (`getBloques()`, `getColaListos()`, `getEstado()`): **privado**. Para mirar desde afuera están `consultarX()` y `estado()`, que devuelven **copias congeladas**.
- El `!` en `private _pid!: string` le avisa a TypeScript que el valor se asigna en el constructor a través del setter.

## 2. Cómo se evitan los `if`

| En el Python había... | Acá se hace con... |
|---|---|
| `if p.estado == "LISTO"` y `p.estado = "..."` | **Patrón Estado.** `EstadoProceso` es una clase abstracta en la que toda transición es inválida por defecto. Cada estado (`Nuevo`, `Listo`, `Ejecutando`...) hace **`override`** sólo de las transiciones que permite y devuelve el estado siguiente. |
| `if algoritmo == "FIRST_FIT" ... elif ...` | **Polimorfismo.** Se le pasa una `PrimerAjuste`, `MejorAjuste` o `PeorAjuste` y el administrador llama a `politica.elegir()` sin preguntar cuál es. |
| `if p.tiempo_cpu_restante == 0 ... elif quantum ...` | **Lista de reglas polimórficas** (`IReglaCpu`), ordenadas por prioridad: `ReglaFinalizacion`, `ReglaEntradaSalida`, `ReglaQuantumAgotado`, `ReglaContinuar`. Se aplica la **primera** que responde `aplica() == true` (con `find`). |
| `if self.cpu_proceso is None` | **La CPU es una lista de 0 o 1 procesos.** Los lugares libres son `1 - cpu.length`, y `slice(0, lugaresLibres)` saca de la cola 1 proceso si la CPU está libre y 0 si está ocupada. |
| `if proceso tiene E/S` (`None`) | **Objeto nulo.** `SinEntradaSalida` cumple el mismo contrato que `EntradaSalida`, pero nunca se dispara. |
| `if bloque is None` | La política devuelve **una lista de 0 o 1 bloques** y se usa `forEach`. |
| `if memoria_libre_total > 0` | `Math.max(libre, 1)`: si no hay memoria libre, la cuenta da 0 % sin dividir por 0. |
| Validaciones (`if valor <= 0: raise`) | `exigir(condicion, mensaje)`: una **tabla de despacho** `{ true: nada, false: lanzar error }` que se indexa con la condición. |
| El `if` al agotar el quantum sin otros listos | `quantumConsumido % quantum`: si lo agotó vuelve a 0, y si no, queda igual. |

## 3. Herencia (sólo cuando hay "es un") y `override`

- `Nuevo`, `Listo`, `Ejecutando`, `Bloqueado`, `Terminado` y `EsperandoMemoria` **son un** `EstadoProceso`.
- `PrimerAjuste`, `MejorAjuste` y `PeorAjuste` **son una** `PoliticaAsignacion`.
- `ErrorDeDominio` **es un** `Error`.

En los tres casos la subclase puede **sustituir** a la base (principio de Liskov). **No se hereda "para reutilizar código"**.
El `Simulador` no hereda de nada: **tiene** memoria, planificador y métricas (composición).

## 4. Clases abstractas

- **`EstadoProceso`**: da el comportamiento común (toda transición es inválida por defecto y lanza error). Cada estado redefine sólo lo suyo.
- **`PoliticaAsignacion`**: el algoritmo común (filtrar huecos libres suficientes y ordenarlos por dirección) está escrito una sola vez. El paso que cambia es el método abstracto `ordenar()`. Es el patrón **Método Plantilla**.

## 5. Polimorfismo

Es el mismo mensaje con distinto comportamiento según el objeto:
- `politica.elegir(...)` responde según sea First, Best o Worst-Fit.
- `estado.admitir()` responde según el estado.
- `regla.aplica(...)` y `regla.aplicar(...)` responden según la regla.
- `entradaSalida.correspondeDispararEn(...)` responde según haya o no E/S.

**En los tests:** `it.each([new PrimerAjuste(), new MejorAjuste(), new PeorAjuste()])` corre **el mismo test** con las tres políticas.

## 6. Interfaces por funcionalidad

Cada interfaz tiene una sola función, y ningún cliente depende de métodos que no usa (principio I de SOLID):

| Clase | Interfaces |
|-------|-----------|
| `Proceso` | `IProcesoConsultable`, `IProcesoCicloDeVida`, `IProcesoEntradaSalida` (+ `IImprimible`) |
| `AdministradorMemoria` | `IAsignadorMemoria`, `ILiberadorMemoria`, `IConsultaMemoria` (+ `IImprimible`) |
| `BloqueMemoria` | `IBloqueConsultable`, `IBloqueModificable` (+ `IImprimible`) |
| `PlanificadorRoundRobin` | `IPlanificador`, `IConsultaPlanificador`, `IControlCpu` (+ `IImprimible`) |
| `Metricas` | `IRegistroMetricas`, `IConsultaMetricas` (+ `IImprimible`) |
| `Simulador` | `ISimulador`, `IConsultaSimulador` (+ `IImprimible`) |
| Estados / políticas / reglas / E/S | `IEstadoProceso` / `IPoliticaAsignacion` / `IReglaCpu` / `IEntradaSalida` |

Dos ejemplos para la defensa:
- Las reglas reciben la CPU como `IControlCpu`, así que sólo pueden liberar la CPU, encolar y bloquear; no ven el historial.
- Las políticas reciben los bloques como `IBloqueConsultable`, así que no pueden asignarlos.

## 7. SOLID: dónde y cuándo se pensó cada uno

- **S, Responsabilidad Única.** Lo pensé al partir el `SimuladorSO` de Python, que hacía todo:
  - `Proceso`: su estado y sus contadores.
  - `AdministradorMemoria`: los bloques.
  - Política: qué hueco elegir.
  - `PlanificadorRoundRobin`: la CPU y las colas.
  - Cada regla: un solo caso del fin de una unidad de CPU.
  - `Metricas`: los cálculos.
  - `Simulador`: sólo coordina las 4 fases.
- **O, Abierto/Cerrado.** Una política nueva (por ejemplo, Next-Fit) o una regla nueva es una clase nueva, y no se modifica el administrador ni el planificador.
- **L, Liskov.** Cualquier estado, política o regla sustituye a su base o interfaz.
- **I, Segregación de Interfaces.** Ver la sección 6.
- **D, Inversión de Dependencias.** El `Simulador` guarda sus partes tipadas con interfaces, y la política se inyecta en el constructor.

## 8. Composición y colecciones

- `Simulador` ◆ `AdministradorMemoria`, `PlanificadorRoundRobin`, `Metricas`: los **crea** en su constructor y viven con él.
- `AdministradorMemoria` ◆ `BloqueMemoria` (1..*); `PlanificadorRoundRobin` ◆ `IReglaCpu` (4).
- Las listas son privadas. Se reemplazan con su setter (`setColaListos([...cola, p])`) y hacia afuera sólo salen copias.
  `setBloques()` verifica los invariantes: sin huecos, sin solapamientos, la suma igual al total y sin dos libres juntos.
  `setCpu()` verifica que nunca haya más de un proceso en la CPU.
- **En el diagrama de clases,** las referencias a otros objetos van como **relaciones** con rol y multiplicidad, **no** como atributos.

## 9. Coalescencia sin if

Al liberar, se toman los bloques **ocupados** (que no se mueven) y se rearman los huecos libres **entre** ellos.
Cada hueco queda en un solo bloque, así que dos bloques libres contiguos quedan fusionados. Es coalescencia, no compactación.

## 10. `estado()`

Todas las clases lo tienen: `console.log(memoria.estado())` muestra todo.
Imprimir no es evidencia de que funciona, así que `tests/rf10-estado-sistema.test.ts` compara el estado completo con `toEqual`.

## 11. Decisiones del dominio

- Registrar un proceso lo deja NUEVO; se admite en la fase 1 del próximo tick.
- Si un proceso no entra en memoria, los siguientes igual se intentan admitir.
- La memoria liberada en un tick se ofrece en la admisión del tick siguiente.
- Cambios de contexto: sólo cuentan la expulsión por quantum con otros listos y el bloqueo por E/S.
- Validación de la E/S: ticks y duración deben ser enteros positivos. El proceso no puede estar terminado y admite un solo evento. El evento debe dispararse después de la CPU ya consumida y antes de terminar.
- El test `escenario del main.py de la cátedra` reproduce el ejemplo del Python y da el mismo orden de ejecución.

## 12. Qué va en el informe (PDF)

1. Identificación, objetivo y escenario.
2. Tabla **clase → responsabilidad → interfaces** (sin código).
3. Diagrama de clases (uno solo) y los 3 diagramas de secuencia.
4. Decisiones de POO: doble encapsulamiento, cómo se evitó el `if`, herencia, abstractas, polimorfismo y SOLID (cuándo lo pensaste).
5. Política de memoria, estados y orden por tick.
6. Matriz RF → clase → test (está en el README).
7. Resultados y cobertura: capturas de `npm run test:cobertura` y de GitHub Actions. Indicá la herramienta, el comando y el alcance.
8. Fragmentación: el caso 100 + 300 da 25 %, y compará las 3 políticas.
9. Conclusiones y fuentes.
