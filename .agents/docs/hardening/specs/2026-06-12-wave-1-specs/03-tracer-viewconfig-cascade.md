---
title: Wave 1 spec — Tracer ViewConfig + spike cascade (lane C)
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/index|Wave 1 specs]]"
created: 2026-06-12T00:00:00
updated: 2026-06-12T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/spec
  - umbrella-v2/wave-1
  - lane/tracer
---

# Spec — Tracer ViewConfig + spike cascade

**Lane C · paralelizable · timeboxed · worktree `umbrella-v2/wave-1-tracer` desde
sandbox HEAD. De-riska la tesis de traducción proto→Svelte 5; desbloquea specs de V.D.**

## 1. Objetivo

Dos entregables de naturaleza distinta:
(a) **`typeViewConfig` durable** — el schema tipado que V.D y el PSS consumirán;
(b) **spike DESCARTABLE** (cascade/MillerColumns) cuyo entregable es el INFORME de
aprendizajes del pipeline jsx→Svelte5/runas/virtualización, NO el código.

## Aclaración dev (2026-06-13) — ViewConfig = forma normal, no la primary key del UI

**Decisión de diseño (dev):** la tupla `engine + mode + orientation (+ viewScope …)`
NO es la clave primaria de una vista ni está hardcodeada al selector de 3 ejes del
proto. Es **una** de varias formas de *direccionar* una vista. El artefacto resuelto —
`ViewConfig` — es la **forma normal**; el selector de 3 ejes es solo uno de los
*productores de direccionamiento*. El mismo resultado debe alcanzarse eligiendo
"engine/mode/orientation" en una lista plana, o `"miller"` a secas, o un command de la
paleta, o un hotkey. Razón de fondo: los overlays de view/sort/etc. **también son
explorers** modificables por MyWorkspace/Symbiont Explorer, así que el usuario tendrá
muchas rutas para la misma cosa — son *actions con pre-binding* para quien quiere
**actuar** sin armar nada con elasticUI (MyWorkspace).

**Modelo correcto = resolver + registry de bindings, NO un índice de resultados:**

- **`ViewConfig` = forma normal / artefacto resuelto.** Se *computa*, no se
  pre-enumera. Pre-enumerar `engine × mode × orientation × …` como filas de un índice
  explota combinatoriamente, pierde la composición de ejes y no puede validarse contra
  la capability matrix (§2.5). Por eso el destino NO es "índice de resultados" sino un
  resolver. **Corrección explícita a la formulación inicial del dev** ("índice de
  resultados"): la intención (muchas rutas → una vista) es correcta; el mecanismo es
  registry+resolver, no lookup table.
- **`ViewBinding` = punto de entrada nombrado/aliasado:**
  `{ id, label, payload: Partial<ViewConfig>, surfaces[] }`. El selector de 3 ejes, la
  lista plana, `"miller"`, el command y el hotkey son todos ViewBindings (o productores
  de uno) que resuelven al mismo `ViewConfig`.
- **`resolveViewConfig(partial, cascadeContext) → ViewConfig`:** los `payload` de
  binding son **sparse** y mergean por la cascada de scopes de D-PSS-1 (mismo merge
  sparse que el payload `.scene`, D-PSS-4). Las keys presentes = lo que el binding
  **asevera**; las ausentes **cascadean**. Así, `"miller"` puede ser **absoluto** (fija
  todos los ejes) o **relativo** (p.ej. "ponlo horizontal" fija un eje y hereda el
  resto) — y queda definido exactamente qué asevera cada binding, evitando que
  `"miller" a secas` se comporte distinto según el contexto.
- **`normalizeViewConfig(cfg) → key`:** forma canónica para **reflejar estado activo**
  — cuando una vista está montada, qué binding(s) se "encienden" en la toolbar — y para
  dedup/round-trip estable a `.scene`. Sin forma normal + normalización, "muchas formas
  de hacer lo mismo" rompe la reflexión del UI (la toolbar no sabe qué está activo).

**Esto ES ADR 0005 aplicado a views.** Seleccionar una vista = Action → Operation
(`setViewConfig`); `ViewBinding` es el eslabón binding→ActionNode→Operation específico
de vistas. Resuelve el **conflicto #8 del ledger cluster 02** (el proto usa
window-globals `__vmSelMode`/`__vmCellOrder` + hit-test DOM como modelo primario,
marcado RESHAPE obligatorio): el reshape destino es **registry + resolver**, no globals.

**Reflexividad (construction blocks / Figma real):** los overlays view/sort SON
explorers que renderizan el registry de bindings disponibles. Agregar un binding
aparece en todas las surfaces **automáticamente** porque se proyecta desde UNA fuente
(el registry), nunca se duplica a mano. Esto es lo que hace la interfaz
armable/desarmable con componentes reales y no prototipos — y es también la disciplina
que evita que "muchas rutas" se vuelva "muchos bugs" (un solo origen, N proyecciones).

**Restricción heredada por SF/P.D — base irreducible (recoverability):** si los
controles son desarmables, DEBE existir un mínimo de render no-desarmable-hasta-romperse
+ un preset `barebones`/factory-reset **siempre alcanzable** (D-PSS-9). El usuario no
puede borrar el control que necesita para reconstruir (el problema "borré el botón que
restaura botones"; el Lego necesita su baseplate). Esta constraint la heredan los specs
de Surface foundation y P.D (InputRouter/WorkspaceMediator); NO se resuelve en lane C,
pero se declara aquí porque nace del modelo de bindings.

**Frontera de alcance de lane C (timeboxed):** este spec entrega SOLO (a)
`typeViewConfig` como forma normal y (b) los **TIPOS del seam**
`ViewBinding` / `resolveViewConfig` / `normalizeViewConfig` (con tests de tipos/merge).
NO entrega el registry runtime, la proyección multi-surface, ni la integración
ActionNode completa — eso pertenece a P.D (InputRouter + ActionNode index) + SF
(WorkspaceMediator), construido sobre estos tipos. Mantener el tracer como tracer.

## 2. Alcance

1. **`typeViewConfig`**: `engine` / `mode` / `orientation` / `viewScope` + reservados
   `placement` / `layerId` / `relations`. Defaults centralizados en UN lugar (evitar el
   split-brain DEFAULT_VIEW vs app.jsx del proto — umbrella shard 04). Es la **forma
   normal** (ver Aclaración dev arriba): direccionable por múltiples bindings, no
   acoplada al selector de 3 ejes.
1b. **Tipos del seam de bindings**: `ViewBinding` (`{ id, label, payload:
   Partial<ViewConfig>, surfaces[] }`), `resolveViewConfig(partial, cascadeContext)`
   (merge sparse por scope, D-PSS-1) y `normalizeViewConfig(cfg) → key` (reflexión de
   estado activo / round-trip `.scene`). SOLO tipos + tests; registry runtime y
   proyección multi-surface = P.D/SF (ver Frontera de alcance).
2. **Resolución de naming de engines** (ledger C-12 + 09 §3.5) DENTRO de este spec:
   - Canon = glossary: **Linear / Geometry / Table / Canvas**.
   - MAP de v12: lineal→Linear · grid→Geometry · canvas→Canvas.
   - `matrix` (chart/form) NO entra como engine: chart/form quedan como candidatos
     a modes de Table (transpose) — registrado como reserved, decisión final del dev
     en V.D (ledger 09 §8.4). El tipo deja espacio sin bloquear.
   - Valores ricos de `orientation` del v12 = modes/sub-modes, NO orientation
     (orientation queda `horizontal | vertical` per glossary).
3. **Cascade del config** alineada al PSS: ViewConfig es la faceta `view` de D-PSS-1
   (facetas × scopes, "C dentro de B"). El schema debe serializar limpio dentro del
   payload `.scene` (D-PSS-4, `vm-scene: 1`).
4. **Seam `SearchEngine`** (D-C-1): este spec define el TIPO del seam —
   `{id, query(rule, scope): AsyncResults, capabilities}` — porque vive en el plano de
   contratos de view/filter-rule. Implementaciones: NativeSearchAdapter (alpha, vía
   PlatformAdapter del lane B) hoy; minisearch (H1) después. El contrato
   `content_search`-as-filter-rule se preserva tal cual (stable).
5. **Capability matrix de scoped views** (ledger 09 §4): el tipo declara qué overrides
   (`levelViews`/`parentViews`/`renderEmbedded`) soporta cada engine/mode — explícito,
   porque el proto promete más de lo que renderiza (solo TreeRows resuelve overrides).
6. **Spike cascade (MillerColumns)**: tras flag experimental, montado vía ViewHost
   EXISTENTE, datos de provider real, SIN scoped-views. Timebox duro (sugerido: 2-3
   sesiones). Informe corto en la umbrella: qué costó traducir (runas vs hooks,
   virtualización, event handling), qué patrones reusar en V.D, qué del proto es
   intraducible tal cual (window globals/DOM-query — RESHAPE confirmado del cluster 02).

## 3. Fuera de alcance

- Implementar engines/V.D reales, scoped-views funcionales, render-runtime, PSS
  storage (solo compatibilidad de serialización), elegir virtualizer definitivo (C-8:
  research TanStack aparte), implementar minisearch.
- **Registry runtime de ViewBindings, proyección multi-surface (palette/lista
  plana/3-ejes/command/hotkey) e integración ActionNode completa** — pertenece a P.D
  (InputRouter + ActionNode index) + SF (WorkspaceMediator). Lane C solo deja los tipos
  del seam.

## 4. Decisiones y evidencia que consume

- D-C-1 (seam search) · D-PSS-1/2/4 (facetas, 4+3, payload) · C-12/C-13 del ledger (el
  render destino hereda el fix SDF-014 de panes persistentes — registrarlo como
  requirement de V.D en el informe) · ADR 0002/0008 (view pure renderer / render
  ownership) referenciados, no re-derivados.
- **ADR 0005 (ActionNode unification)** — la aclaración dev de ViewConfig-como-forma-
  normal ES ADR 0005 aplicado a vistas; `ViewBinding` = eslabón
  binding→ActionNode→Operation. · **Ledger cluster 02 conflicto #8** (proto window-
  globals/DOM-query → RESHAPE): el modelo registry+resolver es ese reshape.
- Pre-reads del implementador: explorer-model 02-render-and-data · proto v12 shard 04
  §07 (taxonomía 4 ejes) + §16 (ViewIslandV4) + §20 (cascade) · umbrella shard 02
  (campos designed-for) · ledger cluster 02 completo.

## 5. Criterios de aceptación

1. `typeViewConfig` compila, con tests de schema (defaults, merge sparse, round-trip
   de serialización compatible `.scene` layered).
2. Naming MAP documentado en el propio tipo (doc-comments) + glossary actualizado si
   cambia algo (no debería: glossary es canon).
3. Seam `SearchEngine` tipado + adapter nativo actual castea al seam sin cambio de
   comportamiento (test).
4. Capability matrix expresada en tipos (no doc suelto).
4b. Tipos `ViewBinding`/`resolveViewConfig`/`normalizeViewConfig` compilan con tests:
   merge sparse por scope, binding absoluto vs relativo, y round-trip
   `normalize(resolve(binding)) === normalize(otro-binding-equivalente)` (dos bindings
   distintos que resuelven a la misma vista normalizan a la misma key).
5. Spike: flag experimental, demo manual en `plugin-dev` con datos reales, y el
   INFORME entregado en la umbrella. El código del spike puede morir en la rama.
6. Schema: `pnpm run check` + focused tests; spike: solo smoke manual (per contrato
   shard 04).

## 6. Riesgos

- Tentación de pulir el spike → el timebox y "descartable" son ley; el valor es el
  informe.
- Si el spike necesita tocar ViewHost: coordinar con Q4 (regla del index).
- Naming de engines puede generar bikeshedding → el MAP de arriba es default; solo
  el dev lo reabre.
- **Sobre-exposición de bindings**: el mecanismo (registry+resolver+proyección) es
  uniforme y barato, pero *cuántos* bindings se exponen por surface es decisión de
  producto/preset (barebones pocos, polish más), no "exponer todo en todos lados" — eso
  vuelve el UI ruido. La arquitectura habilita N rutas; el preset cura cuáles.
- **Scope-creep de lane C**: la tentación de implementar ya el registry/proyección.
  Lane C deja TIPOS; si se implementa el runtime aquí, deja de ser tracer y colisiona
  con P.D/SF.
