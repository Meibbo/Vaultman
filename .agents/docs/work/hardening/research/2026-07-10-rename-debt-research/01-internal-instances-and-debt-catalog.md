---
title: Rename-debt research — shard 01 (instancias internas + catálogo vigente)
type: research
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-10T00:00:00
updated: 2026-07-10T00:00:00
created_by: claude-sonnet-rename-research
updated_by: claude-sonnet-rename-research
tags:
  - agent/research
  - initiative/hardening
  - rename-debt
---

# Shard 01 — Instancias internas (detalle) + catálogo vigente completo

Detalle narrativo de la tabla (a) del [[docs/work/hardening/research/2026-07-10-rename-debt-research/index|index]], con cita exacta (hash/fecha/línea de `session-log.md`) por instancia, más el catálogo completo de deuda vigente (b).

## 1. `logicsFiles` → `logicFiles` — CERRADO

Nace como shim en `69f33d9` (2026-06-13T18:01, "extract pure logicFiles, thin files provider, namespaced ids"). El mismo día, Lane A lo flaggea en el dispatch-update de session-log: *"`logicsFiles.ts` debería renombrarse a `logicFiles.ts` pero knip/ADR-009/docs referencian el nombre viejo → dejó shim, renombre fuera de su dominio (coordinador decide)."* Vive 23 días. Colapsado en `1409e31` (2026-07-06T03:17, "collapse legacy shim modules"; sesión "codex-gpt-5 · shim collapse ... listo"): *"se eliminó el shim `src/logic/logicsFiles.ts` porque `src/logic/logicFiles.ts` ya es la casa canónica; el test `logicsFiles.test.ts` se renombró a `logicFiles.test.ts`."* — costo real: el lane original no pudo cerrarlo dentro de su propio scope (fuera de dominio) y quedó parked hasta que un coordinador lo recogió explícitamente 3 semanas después.

## 2. `ExplorerViewMode` enum flat → `(engine, mode)` resuelto — ABIERTO

Trazas desde 2026-04-16 (intento revertido, `38067c3`); establecido en firme 2026-05-16/18 (`7f6dcb8` explorer view contract, `75d0af8` explorer projection contract, `26e5ce7` `serviceViewHost`). Señalado como arquitectura incorrecta el 2026-06-13 (sesión "spike C"):
*"ViewHost seam (para V.D): ViewHost switchea sobre el enum flat `ExplorerViewMode` (sin miller). Recomendación de C: que ViewHost switchee sobre `(engine,mode)` de un `ViewConfig` resuelto, no crecer el enum flat (alinea con D-C-8)."* Bridge parcial en `eb6d9f7` (2026-07-05, "resolve ViewHost branches via view address"; sesión "V.D thread B slice B1"):
*"enum flat queda como interfaz externa (24 callers intactos), migración progresiva = B3+."* A hoy (2026-07-10), `pendientes.md` §2 sigue listando **task_019 — B3**: *"retirar el enum flat `ExplorerViewMode` de los callers"*, bloqueada en la cola de Codex ("sin tokens hasta 2026-07-10"). Ventana abierta ≥27 días desde la detección arquitectónica, ~55 desde que el enum se estableció.

## 3. `typeActionRouting` vs `InputRouter` → `typeInputRouting` / `WorkspaceActionRouter`

Caso de **dos nombres cruzados**, no solo uno viejo. `typeActionRouting.ts` nace 2026-05-20 (`82969f5`/`623f82f`, trabajo "A.R" = normalización de row seams). El 2026-07-06, P.D slice 2 crea `serviceWorkspaceInputRouter.ts`/`WorkspaceInputRouter` (sesión "P.D slice 2 InputRouter bridge listo") como bridge mediator-level. El grill NIB de HOY (`02-nib-slices.md`, D-NIB-1) redibuja el modelo en **dos tiers por lo que VEN**:
`InputRouter` per-panel (único que ve inputs crudos) vs `WorkspaceActionRouter` mediator-level (nunca ve inputs, solo invocaciones discretas). Bajo ese modelo, lo que slice-2 llamó `WorkspaceInputRouter` es en realidad el tier **ActionRouter** (nunca vio input crudo — sus 4 métodos son `focus-active-panel`/`select-visible-nodes`/ `clear-selection`/`reveal-node`, todo invocación discreta), mientras que `typeActionRouting` (el contrato de 2026-05-20, mouse/keyboard nav de filas) es el tier **InputRouting** real. Slice 0 corrige ambos: `typeActionRouting.ts`→`typeInputRouting.ts` y `serviceWorkspaceInputRouter`→`serviceWorkspaceActionRouter`. 51 días sin alinear el contrato original a ningún vocabulario de routing; 4 días desde que el nombre gemelo apareció hasta que el grill lo destrabó.

## 4. NIB Slice 0 batch — `providers/explorer*`, `ExplorerProvider`, `getTree()`

`providers/explorer*` nace 2026-05-08 (`59336c9`, "moved explorers as providers and added operations logic"). Verificado hoy: 7 archivos vigentes en `src/providers/` (`explorerPlugins`, `explorerSnippets`, `explorerOutline`, `explorerFiles`, `explorerContent`, `explorerTags`, `explorerProps`). La interfaz `ExplorerProvider` vive en `src/types/typeExplorer.ts` (10 archivos la referencian); `getTree()` aparece en ≥8 archivos (grep directo). El dossier semilla la nombra *"la mayor deuda técnica"* (god-objects post-jerarquía WSA). `02-nib-slices.md` Slice 0 decide, sin ejecutar aún:
`typeExplorer.ts` interface `ExplorerProvider`→**`ProviderContract`** en `typeProvider.ts` (archivo que **no existe todavía**, verificado) · `providers/explorer*`→`providers/ provider*` (7 archivos + clases) · `getTree()`→`getNodes()`. 63 días desde el nacimiento del patrón hasta la decisión de hoy; ejecución aún pendiente.

## 5. `components/containers/explorer*` (6 shims) — SIN DUEÑO, hallazgo de este research

Verificado leyendo 3 de los 6 (`explorerProps.ts`, `explorerFiles.ts`, `explorerTags.ts`):
los tres son shims de exactamente 2 líneas, ej. `explorerProps.ts`:
```ts
export { explorerProps } from '../../providers/explorerProps';
export type { ExplorerPropsOptions } from '../../providers/explorerProps';
```
Los 6 (`explorerFiles`/`explorerProps`/`explorerTags`/`explorerContent`/`explorerSnippets`/ `explorerPlugins`) siguen el mismo patrón — confirmado por `Glob`. El follow-up que los flaggea es el MISMO del cierre de Q4, 2026-06-15 (`claude-fable-5 · slice 6 aterrizado + Q4 COMPLETO`): *"follow-ups de coordinador (out of per-slice scope): colapsar shims (`logicsFiles`, `components/containers/explorerProps`, `utilViewLayers`+ `utilBadgeBubbling`) + re-point importers."* El shim-collapse del 2026-07-06 (`1409e31`) cerró **2 de los 3** ítems de ese mismo follow-up (`logicsFiles`, `utilViewLayers`+ `utilBadgeBubbling`) pero **no tocó** `components/containers/explorerProps` ni sus 5 hermanos — se cayeron del scope silenciosamente. El plan de hoy (`02-nib-slices.md`) tampoco los menciona. **Riesgo concreto:** si Slice 0 ejecuta `providers/explorer*`→ `providers/provider*` sin actualizar estos 6 shims, los 6 `import ... from '../../providers/explorerX'` quedan apuntando a un módulo que ya no existe. 25 días desde que se decidió colapsarlo (junto a sus 2 hermanos, que sí se cerraron).

## 6. `panelData` → `panelWidget` — DECIDIDO, no ejecutado en código

Concepto nace 2026-05-27 (`c7cead5`, "docs: vaultman architecture grill"). Parkeado explícitamente el 2026-05-29 ("S-27 parked for a dedicated panelData grill"). Reaparece como placeholder tipado en `fcf895e` (2026-07-06, "feat(workspace): add panel scene tracer" — crea `src/types/typePanelScene.ts`, 183 líneas) pero el P.D kickoff lo declara explícitamente NON-GOAL: *"Defiere WSA/free-canvas/tile editing, `panelData`, `panelContent`..."* — nunca llegó a ser la unión real consumida. El grill NIB de hoy (D-NIB-3) lo resuelve: *"`panelData`→**`panelWidget`**; bars = panelWidget (hijos de Scene); overlays = surface-kinds."* Canon actualizado en `glossary.md` (panel-kind, `panelWidget`, Overlay corregido) — **el código (unión `typePanelScene` + usos) todavía dice `panelData`**, per Slice 0. 44 días como concepto de diseño, 0 días como código roto:
el mejor caso de esta tabla — se corrigió antes de anidarse en implementación consumida.

## 7. `proto-v6` (stale) vs `proto-v12` (canon) — RECURRENTE

`proto-v6` referenciado como canon en la umbrella 2026-05-19. Corregido 2026-06-05 (`codex-gpt-5 · proto-v12 shard 04 rewrite`, tras confirmar que el path de Downloads era una junction hacia el proyecto Open Design real) y 2026-06-10 ("roadmap-dispatch fix proto-v6→v12 stale + pointer", spec fundacional de la Synthesis Umbrella). Incidente relacionado 2026-07-02 (PAI-001 closeout): *"3 design-inputs del dev importados de Downloads → proto v12 design inputs (incl. convención canon raw); ... link roto del umbrella corregido."* No es un evento cerrado: Lane B4 (2026-07-09, barrido de pendientes) encontró **4 correcciones fechadas más** de canon stale (`explorer-model` 01/02/index, `typeViewConfig` comment), commiteadas en `8bc1785`. Patrón: cada research/spec escrito contra el baseline equivocado implica retrabajo de shards de cientos de líneas.

## Catálogo vigente completo (b)

**P0 — riesgo activo (recomendado antes de Slice 0):**
- `components/containers/explorer*` (6 shims) — ver §5. Sin dueño asignado.

**P1 — decidido, mecánico, listo (Slice 0, `02-nib-slices.md`, 1 commit):**
- `providers/explorer*`→`provider*` (7 archivos) · `ExplorerProvider`→`ProviderContract` (`typeProvider.ts` nuevo) · `getTree()`→`getNodes()` (≥8 archivos) · `typeActionRouting.ts`→`typeInputRouting.ts` · `serviceWorkspaceInputRouter`→ `serviceWorkspaceActionRouter` · `'panelData'`→`'panelWidget'` (unión `typePanelScene` + usos).

**P2 — decidido, requiere juicio (Slice 0.5, spec propia):**
- `containers/explorerActiveFilters.svelte` y `containers/explorerQueue.svelte` mezclan provider(data)+render — extraer provider TS puro a `providers/` con parity visual estricta.

**P3 — en curso, bloqueado en cola externa:**
- `ExplorerViewMode` retiro total (task_019/B3) — ver §2. Codex, cola liberada hoy (2026-07-10) según `pendientes.md`.

**P4 — staleness de docs, mismo patrón, menor urgencia:**
- `tooling-libraries.md` L42 ("Table engine spec" contradice canon Table=modo Geometry) — fuera de scope reportado por Lane B4, aún sin corregir.
- 3 copias-conflicto `explorer-model (conflict 2026-05-26...)` — decisión dev pendiente (ligada a mirror-tree de Drive).
- Gap de glosario "Symbiont Explorer" (grep architecture = 0 hits) + posible superposición con ComposedViews — grill corto pendiente (`pendientes.md` §4).
- `viewComposer` ("cards es una config del viewComposer", dev 2026-07-10) vs `viewScene`/ view-config editor del glossary — sin reconciliar.
- `indexActiveFilters.ts` y `unocss-preset-theme`: NO son deuda — Lane B4 (2026-07-09) refutó ambos claims de un ledger previo (sí existen/están cableados). Incluido aquí solo como nota de higiene: un research anterior los había catalogado como deuda por error: el patrón de drift también contamina catálogos de deuda, no solo código.
