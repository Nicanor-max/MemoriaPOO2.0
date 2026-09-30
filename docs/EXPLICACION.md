# Guía de diseño: cómo está hecho y cómo defenderlo

Esta guía explica cada decisión de diseño para que puedas contarla con tus palabras en la defensa, que vale 70 de los 100 puntos.
**No copies código de clases en el informe.** En el informe van el diagrama y la explicación.

---

## 1. Convenciones del código

| Regla | Ejemplo |
|-------|---------|
| Todo en español | `Proceso`, `GestorMemoria`, `avanzarTick()`, `cpuRestante` |
| Atributo interno: privado y con guion bajo | `private _quantumConsumido: number` |
| Getter y setter por cada atributo | `getQuantumConsumido()`, `setQuantumConsumido(valor)` |
| La clase **nunca** toca `_x` directamente, salvo dentro de su getter y su setter | `this.setQuantumConsumido(this.getQuantumConsumido() + 1)` |
| Interfaces con prefijo `I` | `IProcesoEjecutable` |

---

## 2. Doble encapsulamiento (10 puntos de la rúbrica)

Son **dos capas** de protección:

1. **Capa 1, el atributo:** es `private` y lleva `_`. Desde afuera de la clase no se puede ver ni cambiar.
2. **Capa 2, el acceso:** incluso **dentro** de la clase, el atributo se lee con `getX()` y se escribe con `setX()`.
   El setter es el **único** lugar donde cambia el valor, así que ahí va la validación de la regla del dominio.

```ts
private _cpuRestante!: number;

public getCpuRestante(): number { return this._cpuRestante; }       // público: se puede consultar

private setCpuRestante(valor: number): void {                       // privado: nadie de afuera lo cambia
  exigirEnteroNoNegativo(valor, 'La CPU restante');                 // regla del dominio
  this._cpuRestante = valor;
}

public ejecutarUnaUnidad(): void {
  this.setCpuRestante(this.getCpuRestante() - 1);                   // nunca this._cpuRestante--
  this.setQuantumConsumido(this.getQuantumConsumido() + 1);
}
```

**Qué visibilidad lleva cada método:**
- Getter de un **dato primitivo** (número, texto): **público**, porque devuelve una copia del valor.
- Getter de un **objeto o colección** (`getBloques()`, `getColaListos()`): **privado**. Si fuera público, alguien podría hacer `getBloques().push(...)` y romper la memoria.
  Para mirar esos datos desde afuera están los métodos `consultarX()` y `estado()`, que devuelven **copias congeladas** (`Object.freeze`).
- Setter: **siempre privado**. El estado sólo cambia con operaciones del dominio (`despachar()`, `bloquear()`, `asignar()`...) que respetan las reglas.

**¿Por qué el `!` en `private _pid!: number`?** TypeScript no se da cuenta de que el constructor le asigna valor a través del setter. El `!` le dice: "tranquilo, el constructor lo inicializa".

**Pruebas de que funciona:** `tests/rf10-estado-sistema.test.ts` intenta modificar lo que devuelven las consultas y el test espera un `TypeError`.

---

## 3. Interfaces por funcionalidad (ISP, la I de SOLID)

"Cada interfaz tiene una única función y no se fuerza a ningún cliente a depender de métodos que no usa."

Cada clase implementa **2 o 3 interfaces de funcionalidad** más `IImprimible<T>` (el `estado()`):

| Clase | Interfaces | Quién usa cada una |
|-------|------------|--------------------|
| `Proceso` | `IProcesoConsultable`, `IProcesoAdmisible`, `IProcesoEjecutable`, `IProcesoEntradaSalida`, `IImprimible` | tests / fase de admisión / planificador / E/S |
| `GestorMemoria` | `IAsignadorMemoria`, `ILiberadorMemoria`, `IConsultaMemoria`, `IImprimible` | admisión / finalización / métricas |
| `BloqueMemoria` | `IBloqueConsultable`, `IBloqueModificable`, `IImprimible` | políticas (sólo leen) / gestor (modifica) |
| `PlanificadorRoundRobin` | `IPlanificador`, `IConsultaPlanificador`, `IImprimible` | simulador / consultas |
| `ColaBloqueados` | `IGestionBloqueos`, `IConsultaBloqueados`, `IImprimible` | |
| `RegistroProcesos` | `IRegistroProcesos`, `IConsultaProcesos`, `IImprimible` | |
| `Metricas` | `IRegistroMetricas`, `IConsultaMetricas`, `IImprimible` | simulador escribe / consultas leen |
| `Simulador` | `ISimulador`, `IConsultaSimulador`, `IImprimible` | el test opera / el test consulta |
| `ConfiguracionSimulacion` | `IConfiguracion`, `IImprimible` | |
| `EventoEntradaSalida` | `IEventoEntradaSalida`, `IImprimible` | |
| Políticas | `IPoliticaAsignacion` (a través de la clase abstracta) | |

Ejemplo para la defensa: las políticas reciben los bloques como `IBloqueConsultable`. **No pueden** llamar a `asignarA()` porque ese método está en `IBloqueModificable`, que sólo usa el `GestorMemoria`.

`IProcesoPlanificable` e `IProcesoGestionable` **no agregan métodos**. Son combinaciones de las interfaces chicas para los colaboradores que necesitan más de una funcionalidad: el planificador ejecuta y bloquea, y el registro además admite.

---

## 4. Principios SOLID: dónde y cuándo se aplicaron

- **S, Responsabilidad Única** (el que pidió el profe):
  - `Proceso`: sus transiciones y contadores.
  - `GestorMemoria`: los bloques y sus invariantes.
  - Política: elegir el hueco.
  - `PlanificadorRoundRobin`: la CPU y la cola.
  - `ColaBloqueados`: los temporizadores de E/S.
  - `Metricas`: los cálculos.
  - `Simulador`: **sólo coordina** las 4 fases.

  *Cuándo lo pensé:* al ver que el Simulador iba a concentrar toda la lógica (lo que la consigna pide evitar), lo partí en partes compuestas.
- **O, Abierto/Cerrado:** para agregar una política nueva (por ejemplo, *Next-Fit*) se crea una subclase de `PoliticaAsignacion` y no se toca `GestorMemoria`.
- **L, Sustitución de Liskov:** cualquier `PrimerAjuste`, `MejorAjuste` o `PeorAjuste` reemplaza a `IPoliticaAsignacion` y el gestor funciona igual. El test `it.each([...políticas])` lo prueba con **el mismo test** para las tres.
- **I, Segregación de Interfaces:** ver la sección 3.
- **D, Inversión de Dependencias:** `GestorMemoria` depende de `IPoliticaAsignacion`, no de `PrimerAjuste`. Los atributos del `Simulador` están tipados con interfaces (`IAsignadorMemoria & ILiberadorMemoria & ...`).

---

## 5. Herencia: sólo cuando hay "es un"

> **No decir "heredé para reutilizar código".** Se hereda porque la subclase **es un** tipo de la base y **puede sustituirla**.

Hay sólo dos herencias:
1. `PrimerAjuste / MejorAjuste / PeorAjuste` **extienden** `PoliticaAsignacion`: cada una **es una** política de asignación y puede reemplazarla (Liskov).
2. `ErrorDeDominio` **extiende** `Error`: **es un** error y funciona en cualquier `try/catch` o `toThrow`.

**Dónde NO usé herencia y por qué:** el `Simulador` **tiene** memoria, planificador, etc. (composición), no **es** una memoria. `Proceso` no hereda de nada: los estados se modelan con un `enum` y transiciones validadas. Crear una subclase por cada estado sería una jerarquía artificial, y la consigna dice que no se exige.

---

## 6. Clase abstracta: `PoliticaAsignacion`

**Por qué abstracta y no sólo una interfaz:** las tres políticas **comparten el mismo algoritmo** (filtrar los huecos libres suficientes, ordenarlos por dirección y devolver `null` si no hay ninguno). Sólo cambia **un paso**: cuál candidato elegir.
- La parte común está implementada una sola vez en `elegirBloque()`. Es el patrón **Método Plantilla**.
- El paso variable es `protected abstract seleccionar(candidatos)`.
- No se puede instalar una "política genérica" porque la clase abstracta no se puede instanciar.

La interfaz `IPoliticaAsignacion` sigue existiendo: es el **contrato**, y la clase abstracta es **una base común** para implementarlo.

---

## 7. Polimorfismo (7 puntos)

`GestorMemoria.asignar()` hace `this.getPolitica().elegirBloque(...)` **sin ningún `if` por tipo**.
Según qué objeto se haya pasado en la configuración, el hueco elegido es otro:

```ts
new ConfiguracionSimulacion(1024, 2, new PeorAjuste())
```

**En los tests:** `tests/rf04-asignacion.test.ts` usa `it.each` con las tres políticas. El test es el mismo y cada objeto responde con su comportamiento.
Los empates se resuelven por la menor dirección, usando `<` y `>` estrictos sobre candidatos ya ordenados.

---

## 8. Composición y colecciones

- `Simulador` ◆ `RegistroProcesos`, `GestorMemoria`, `PlanificadorRoundRobin`, `ColaBloqueados`, `Metricas`: el simulador **las crea en su constructor** y viven y mueren con él. Es **composición**.
- `Simulador` ◇ `ConfiguracionSimulacion`: la recibe de afuera. Es **agregación**.
- `GestorMemoria` ◆ `BloqueMemoria` (1..*, ordenados por inicio): el gestor los crea y los divide.
- Colecciones: `_procesos`, `_bloques`, `_colaListos`. Son **privadas**, se reemplazan con su setter (`setColaListos([...cola, proceso])`) y hacia afuera **sólo salen copias congeladas**.
  El setter `setBloques()` **verifica los invariantes** de la memoria: sin huecos, sin solapamientos, la suma igual al total y sin dos libres juntos.

**En el diagrama de clases:** las referencias a otros objetos **no se escriben como atributos**. Se dibujan como **relaciones** con rol (`-_memoria`) y multiplicidad. Si se dibujan como variable interna, el diagrama queda incompleto.

---

## 9. `estado()`: "imprimí tu estado completo"

Todas las clases implementan `IImprimible<T>` con `estado()`, que devuelve **toda** la información en un objeto congelado:

```ts
console.log(memoria.estado());
console.log(simulador.estado());
```

Imprimir **no** es evidencia de funcionamiento, así que hay un **test** que compara el objeto completo con `toEqual` (`tests/rf10-estado-sistema.test.ts`).

---

## 10. Decisiones del dominio que te pueden preguntar

- **Cuándo se admite un proceso:** registrarlo lo deja `NUEVO`. La admisión es en la fase 1 del **siguiente** `avanzarTick()`.
- **Espera sin bloqueo en cabeza:** si P2 no entra pero P3 sí, P3 es admitido igual (RF03).
- **La memoria liberada en el tick N** recién se ofrece en la fase 1 del tick N+1.
- **Prioridad al final de una unidad de CPU:** primero terminar, después bloquear por E/S y por último el quantum.
- **Cambios de contexto:** se cuentan en la expulsión por quantum con otros listos y en el bloqueo por E/S. No se cuentan el despacho inicial, la finalización ni la renovación de quantum.
- **Validación de la E/S:** los ticks y la duración deben ser enteros positivos. El proceso no puede estar terminado, admite un solo evento, el disparo debe ser mayor que la CPU ya consumida y menor que la CPU total (si no, nunca se dispararía, porque la finalización tiene prioridad).
- **Estructuras de datos:** arreglos. La cola de listos es FIFO (se agrega al final y se saca el primero). Los bloques están ordenados por dirección, lo que simplifica la coalescencia (sólo se miran el vecino `i-1` y el `i+1`).

---

## 11. Qué poner en el informe (PDF)

1. Identificación, objetivo y escenario.
2. Diseño y responsabilidades: una tabla **clase → responsabilidad → interfaces** (sin pegar código).
3. Diagrama de clases (1 solo) y los 3 diagramas de secuencia.
4. Decisiones de POO: encapsulamiento doble, interfaces, SOLID (**cuándo** lo pensaste), herencia, abstracta, polimorfismo y composición.
5. Política de memoria, estados y orden por tick.
6. Matriz RF → clase/método → test (está en el README).
7. Resultados y cobertura: captura de `npm run test:cobertura` y del CI en verde. Indicá la herramienta (Vitest + V8), el comando y el alcance (`src/**`).
8. Análisis de fragmentación: el caso de huecos de 100 y 300 da 25 %, y compará las políticas porque se implementaron las tres.
9. Conclusiones y fuentes.
