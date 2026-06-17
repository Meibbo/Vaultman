---
name: vm-regression-resolver
description: Resuelve regresiones introducidas por agentes IA en iteraciones de Vaultman, navegando el historial de Git para localizar la última versión funcional de una característica, compararla contra la versión rota actual, y restaurar el comportamiento correcto. Usa este skill siempre que falle un test que antes pasaba, que un agente reporte "esto funcionaba antes", que aparezca una regresión tras una iteración multi-agéntica, o que se detecte un comportamiento roto atribuible a un commit reciente. También úsalo cuando una reimplementación literal no sea viable por cambios estructurales del codebase y el agente tenga que adaptar la solución conservando la intención original. Aplica tanto si el agente ya sabe qué test rompió como si necesita rastrear la regresión desde cero.
---

# Vaultman Regression Resolver

Este skill guía a un agente de Vaultman para resolver regresiones —comportamiento que antes funcionaba y ahora no— causadas por iteraciones previas de otros agentes IA en el mismo proyecto.

## Por qué este skill existe

En una orquestación multi-agéntica, es común que un agente rompa sin querer una característica que otro agente ya había implementado correctamente. El historial de Git contiene la "memoria institucional" del proyecto: la última versión funcional existe en algún commit. El trabajo del agente es **encontrarla, entenderla, y restaurarla de forma que encaje con el estado actual del código** —no necesariamente copiarla textualmente.

La regla central: **preservar la intención del código funcional, adaptándolo si el contexto cambió**.

## Principios operativos

1. **Los tests son el oráculo de verdad.** En Vaultman los tests marcan el punto de partida: un test rojo indica la regresión. El mismo test debe pasar al terminar. Si no hay test para la característica rota, crea uno antes de tocar código de producción.

2. **Commits granulares son una ventaja.** Vaultman produce commits atomizados por agente. Esto hace viable `git bisect` y permite aislar el commit culpable con precisión. Úsalo.

3. **Copiar textual es plan A, no el único plan.** Si el codebase cambió estructuralmente (refactors, nuevas abstracciones, APIs renombradas), extraer el *concepto* y reimplementarlo adaptado es mejor que forzar un copy-paste que rompe otras cosas.

4. **Usar el historial antes de crear más worktrees.** Si la regresión aparece después de un plan/backlog ya cerrado, el primer movimiento es ubicar el último commit bueno dentro del mismo stream y decidir entre `revert` de rango, restauración selectiva o cherry-pick inverso. Crear otro worktree es excepcional: sólo si el worktree actual no puede compilar, tiene cambios ajenos que bloquean la prueba, o el dev pide aislamiento.

5. **Pedir aprobación antes de aplicar cambios adaptados.** Restauración literal → aplicar directo. Adaptación conceptual → presentar plan al humano y esperar confirmación antes de modificar archivos.

6. **Nunca modificar el historial.** No `git reset --hard`, no `git push --force`, no reescritura de commits. El historial es evidencia; preservarlo.

## Workflow

El flujo tiene cinco fases. Sigue el orden; saltarse fases lleva a soluciones equivocadas.

### Fase 1 — Caracterizar la regresión

Antes de tocar el historial, responde con precisión:

- ¿Qué test(s) están fallando? Captura el output completo del test, no solo "falla".
- ¿Cuál es el comportamiento esperado vs. el observado?
- ¿Qué archivos/módulos están involucrados según el stack trace o el test?
- ¿Desde cuándo está roto? (HEAD, últimas N iteraciones, desconocido)

Si no hay test que falle, **escribe primero el test que reproduce el bug** y confirma que es rojo en HEAD. Sin test no hay forma objetiva de saber si la regresión está resuelta.

### Fase 2 — Localizar el "último commit bueno"

Hay tres estrategias. Elige según el nivel de información disponible:

**Estrategia A — git bisect (recomendada cuando tienes un test reproducible):**

```bash
git bisect start
git bisect bad HEAD
git bisect good <commit-sospechoso-antiguo>   # uno donde crees que funcionaba
git bisect run <comando-del-test>
```

`git bisect run` automatiza la búsqueda binaria ejecutando el test en cada commit candidato. Termina con el commit exacto que introdujo la regresión. Esto es lo más rápido en commits granulares.

**Estrategia B — git log + git blame (cuando sabes qué archivo/función está roto):**

```bash
git log --oneline --all -- path/to/archivo.py          # historial del archivo
git log -S "nombre_de_funcion" --oneline               # commits que tocaron ese símbolo
git blame path/to/archivo.py -L <linea_inicio>,<linea_fin>  # quién tocó qué líneas
```

Útil cuando la regresión es localizable a una función o bloque específico.

**Estrategia C — exploración de mensajes de commit (cuando no hay test reproducible ni archivo claro):**

```bash
git log --oneline --grep="<palabra clave de la feature>"
git log --oneline --since="<fecha>"
```

Menos preciso, pero sirve como primera aproximación.

**Estrategia D — confirmación visual con el dev (cuando el oráculo es UI/UX):**

Úsala cuando la regresión es visual, interactiva, o el test automatizado aún no cubre el comportamiento real. Reproduce builds de commits candidatos y pregunta de forma binaria, con hashes concretos:

```text
Estoy probando el rango <GOOD?>..<BAD>.
¿Este commit está bien visualmente? <hash> <mensaje>
¿Y este otro? <hash> <mensaje>
Ruta exacta a revisar: <pantalla/flujo>.
```

Si el dev confirma que un commit está bien y otro está mal, acota el rango con bisect/manual cherry-pick. No sigas parchando hasta tener `COMMIT_BUENO` y `COMMIT_MALO` o una razón explícita para no poder determinarlos.

Al terminar Fase 2, debes tener **dos referencias concretas**:

- `COMMIT_BUENO`: hash del último commit donde la característica funcionaba
- `COMMIT_MALO`: hash del primer commit donde se rompió (normalmente HEAD o cercano)

En trabajo de planes/backlogs, `COMMIT_BUENO` suele ser el commit que cerró el issue anterior, no necesariamente el tag estable más cercano. Si el dev dice "el issue ya estaba resuelto antes de esta ola", busca ese commit primero.

Consulta `references/git-commands.md` para la lista completa de comandos útiles con ejemplos.

### Fase 3 — Comparar las dos versiones

Extrae la versión funcional y compárala con la actual:

```bash
git show <COMMIT_BUENO>:path/to/archivo.py > /tmp/version_buena.py
git show HEAD:path/to/archivo.py > /tmp/version_actual.py
git diff <COMMIT_BUENO> HEAD -- path/to/archivo.py
```

Lee **ambas versiones completas**, no solo el diff. El diff esconde contexto (imports, helpers, estructura de clase) que puede ser crítico para entender por qué la versión buena funciona.

Pregúntate explícitamente:

1. **¿Qué hace la versión buena que la actual no hace?** Describe la diferencia en una frase.
2. **¿La lógica puede copiarse textualmente?** Verifica que las dependencias, imports, firmas de función y estructura circundante siguen existiendo en HEAD.
3. **¿Hubo cambios estructurales entre los dos commits?** Busca: archivos renombrados/movidos, funciones extraídas a otros módulos, cambios en APIs internas, refactors de clases, nuevas capas de abstracción.

```bash
git log --oneline --stat <COMMIT_BUENO>..HEAD   # todos los commits entre ambos
git diff --stat <COMMIT_BUENO> HEAD             # resumen de qué archivos cambiaron
```

Si solo cambió el archivo roto → probablemente **reimplementación directa** (Fase 4A).
Si cambiaron muchos archivos relacionados → probablemente **adaptación conceptual** (Fase 4B).
Si hay una ola de commits posterior a un backlog cerrado y varias superficies se rompieron a la vez → probablemente **rollback por rango** (Fase 4C).

### Fase 4 — Resolver

Aquí se bifurca el workflow según lo que Fase 3 reveló.

#### 4A. Reimplementación directa

Aplicable cuando el contexto circundante no cambió lo suficiente como para invalidar un copy-paste.

1. Aplica la lógica de la versión buena al archivo actual. Puedes usar `git checkout <COMMIT_BUENO> -- path/to/archivo.py` si todo el archivo necesita volver, o edición manual si solo es una función.
2. Corre el test que estaba rojo. Debe pasar.
3. Corre la suite completa de tests. Nada más debe romperse.
4. Si todo pasa → commit con mensaje claro: `fix: restaurar <feature> (regresión introducida en <commit_malo>)`.

Este caso no requiere aprobación previa porque la restauración es literal y los tests son el juez.

#### 4B. Adaptación conceptual (requiere aprobación humana)

Aplicable cuando el codebase cambió de forma que la versión buena ya no encaja literalmente.

1. **Extrae la intención.** Describe en 2-4 frases qué problema resuelve la versión buena y cómo, sin copiar código. Ejemplo: "La función validaba el token comprobando expiración y firma en dos pasos separados, capturando errores específicos para cada caso y retornando un mensaje distinto al usuario."

2. **Identifica los cambios estructurales relevantes.** ¿Qué piezas del codebase actual son el "nuevo hogar" de esa lógica? ¿Hay helpers nuevos que cubren parte del trabajo? ¿La API cambió?

3. **Diseña la solución adaptada.** Propón cómo se vería la lógica restaurada dentro del codebase actual. Respeta las convenciones nuevas (nombres, abstracciones, firmas de función).

4. **Presenta el plan al humano antes de aplicar.** Incluye:
   - El diagnóstico de la regresión (qué se rompió, dónde, cuándo)
   - La versión buena encontrada (referenciando el commit)
   - Los cambios estructurales que impiden la restauración literal
   - El plan de adaptación propuesto, con los archivos que se modificarían
   - Tests que se usarán para validar

   Espera confirmación explícita antes de modificar código de producción.

5. Tras aprobación, aplica los cambios, corre los tests (el específico y la suite completa), y haz commit con mensaje que cite ambos commits: el bueno como referencia y el malo como origen de la regresión.

Consulta `references/adaptation-patterns.md` para patrones comunes de adaptación (rename de funciones, extracción de métodos, cambios de firma, migración de API).

#### 4C. Rollback por rango conservando historia

Aplicable cuando una ola posterior a un commit bueno rompe varias rutas estables, o cuando el dev reporta que "se dañaron demasiadas cosas" tras un intento fallido de aplicar un backlog.

1. Confirma que el worktree actual está limpio o separa cambios ajenos sin revertirlos.
2. Propón el rango exacto: `COMMIT_BUENO..HEAD` o `COMMIT_BUENO..<COMMIT_MALO>`.
3. Pide confirmación del dev si el último commit bueno depende de inspección visual: "¿este commit está bien? ¿y este otro?"
4. Prefiere un commit de `git revert` del rango malo para preservar historia. No uses `reset --hard` salvo petición explícita.
5. Si sólo uno o pocos commits causan el daño, revierte esos commits o restaura selectivamente los archivos afectados; no descartes trabajo bueno por comodidad.
6. Después del rollback, reintroduce cambios útiles como cherry-picks pequeños sólo cuando tengan reproducción y verificación focal.

### Fase 5 — Documentar y cerrar

Cada resolución deja rastro para futuros agentes:

- Mensaje de commit descriptivo que incluya el hash del commit culpable y del commit de referencia.
- Si se adaptó conceptualmente, un comentario breve en el código (o en el PR) explicando qué se conservó de la versión original y qué se adaptó.
- Si el test no existía antes, queda creado como protección contra futuras regresiones del mismo tipo.

## Qué NO hacer

- **No modificar el historial de Git** (`reset --hard`, `push --force`, rebase interactivo destructivo). El historial es la fuente de verdad para este skill y para futuros agentes.
- **No crear worktrees de rescate por reflejo.** Si el worktree actual puede evaluar `GOOD/BAD`, úsalo. Worktree nuevo sólo para aislamiento justificado.
- **No rehacer trabajo que Git puede aislar.** Primero intenta `git log`, `git bisect`, confirmación visual, `git revert` de rango o cherry-pick selectivo.
- **No aplicar adaptaciones conceptuales sin aprobación humana.** El agente puede equivocarse al interpretar la intención; el humano es el árbitro.
- **No asumir que "el commit más reciente que tocó el archivo" es el culpable.** Los cambios estructurales en otros archivos pueden romper un archivo que no fue tocado directamente. Usa bisect cuando haya duda.
- **No resolver sin tests.** Si no hay test que falle, créalo primero. Resolver "a ojo" deja la regresión vulnerable a reaparecer.
- **No tocar más archivos de los necesarios.** La restauración debe ser mínima y focalizada. Refactorizar de paso es tentador pero fuera de alcance.

## Archivos de referencia

- `references/git-commands.md` — Catálogo de comandos git útiles con ejemplos concretos para las Fases 2 y 3.
- `references/adaptation-patterns.md` — Patrones comunes de adaptación conceptual cuando el codebase cambió estructuralmente.
