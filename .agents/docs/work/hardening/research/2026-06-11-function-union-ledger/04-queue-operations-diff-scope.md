---
title: Ledger cluster 04 — Operation queue, mutación, diff, scope, fronteras del batcher
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-11-function-union-ledger/index|Function-Union Ledger]]"
created: 2026-06-11T00:00:00
updated: 2026-06-11T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
produced_by: explore-subagent (opus), integrado por coordinador
tags:
  - agent/research
  - ledger
  - operations/queue
---

# Cluster 04 — Operation Queue, Mutación, Diff, Scope, Fronteras del Batcher

Streams: **Stable 1.1.1** (prod, oráculo de confianza) · **Sandbox** (baseline de implementación) · **Proto v12** (solo vocabulario/grouping). Celdas: `✓ (forma)` · `~ (parcial)` · `—`. `[ver]` = verificado en código esta pasada.

**HALLAZGO CENTRAL (sostiene todo el cluster):** El SDF-015 dijo "stable portó la policy, NO la arquitectura". El código confirma el reverso-complementario: ambos streams comparten el *scaffolding* de op-types/`simulateChanges`/special-op-keys, pero **divergen en la capa de seguridad**: Stable 1.1.1 tiene la **conflict policy nombrada** (`operationIdentity`/`operationsConflict`/`assessChange` → `duplicate`/`merge`/`conflict`) sobre un motor de **closures + `processFrontMatter` + mutación directa para special ops** (sin VFS chains). Sandbox tiene la **arquitectura VFS/transaction completa** (`VfsChain`, `openChain`, `stageImmutableOp`, `replayTransactionOps`, `dropForNode`, `requestDelete`) pero **sin la policy nombrada** — su seguridad es el *node-bound delete-purge*. Ambas clases se llaman `OperationQueueService` e implementan `IOperationQueue`. El dual mutable/inmutable (N1 gate) vive DENTRO de sandbox; reconciliarlo es prerequisito a stable. **La 2.0 debe unir: policy de stable + arquitectura de sandbox.**

## Tabla — Staging / Op Types

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `add(change)` (un op) | ✓ via policy gate `[ver]` | ✓ `ingest()`→VFS `[ver]` | ~ insertar row | OVERLAP | RESHAPE | Operations / queue | native | N2 | stable: sync+gate; sandbox: async-ingest sin gate |
| `addAsync(change)` | — | ✓ `await ingest` `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | queue | native | N2 | hidratación async de body |
| `addBatch(changes)` | ✓ sync, policy seq + Notice `[ver]` | ✓ `async`, ingest c/u `[ver]` | ~ apply group | OVERLAP/CONTRADICE | RESHAPE | queue | native | N1 | sync-vs-async (firma pública diverge) |
| `ingest`/`ingestInner` | — (usa `logicFunc`) | ✓ hidrata VFS, runs logic `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | VFS | native | N2 | PerfMeter-wrapped |
| `translateUpdate` (mapea special keys) | ✓ inline en execute `[ver]` | ✓ map al stage `[ver]` | — | OVERLAP | RESHAPE | queue/VFS | native | N2 | momento de traducción distinto |
| `expandNativeRename` | (inf) | ✓ emite rename-prop ops | — | SOLO-SANDBOX | ADOPT-sandbox | queue | native | N3 | — |
| op `DELETE_PROP` | ✓ `[ver]` | ✓ | — | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | — |
| op `RENAME_FILE` | ✓ `renameFile` `[ver]` | ✓ | ~ rename desde replace | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | — |
| op `MOVE_FILE` | ✓ `[ver]` | ✓ | — | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | — |
| op `DELETE_FILE` | ✓ `trashFile` `[ver]` | ✓ stage (sin trash inmediato) | — | OVERLAP | ADOPT-sandbox | queue | native | N1 | sandbox stage; stable trash en commit |
| op `FIND_REPLACE_CONTENT` | ✓ regex/case `[ver]` | ✓ | ~ chip replace | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | — |
| op `APPEND_LINKS` | (inf, en typeOps) | ✓ | — | OVERLAP | ADOPT-sandbox | queue | native | N3 | — |
| op `APPLY_TEMPLATE` | ✓ `[ver]` | ✓ | — | COMPARTIDA | ADOPT-sandbox | queue | native | N3 | — |
| op `NATIVE_RENAME_PROP` | ✓ `[ver]` | ✓ | — | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | preserva casing |
| op `NATIVE_SET_PROP_TYPE` | ✓ `[ver]` | ~ change-type action | — | OVERLAP | ADOPT-sandbox | queue | native | N3 | — |
| op `REORDER_ALL` | ✓ `[ver]` | ✓ | — | COMPARTIDA | ADOPT-sandbox | queue | native | N3 | — |
| Tag ops (set/add/delete/rename staging) | ✓ via policy `[ver]` | ✓ `tagOpKind` classify | ~ tag chips | OVERLAP | ADOPT-sandbox | queue | native | N2 | sandbox `serviceTagQueue` builders |
| Default update → set property | ✓ `[ver]` | ✓ | — | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | — |
| `PendingChange` DSL | ✓ closure `logicFunc` `[ver]` | ✓ tipado, derivado de staged ops | ~ row value string | OVERLAP/CONTRADICE | RESHAPE | queue | native | N1 | stable closure no-serializable; sandbox derivado de transacciones |

## Tabla — Conflict Policy / Guards (SDF-015 — OVERLAP crítico)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `operationIdentity(change)` | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | base de toda la policy |
| `changeSubject` / `normalizeTagSubject` | ✓ `[ver]` | ~ strip `#` en builder | — | OVERLAP | ADOPT-stable | queue | native | N2 | — |
| `propertyActionsConflict` | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | — |
| `tagActionsConflict` | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | — |
| `fileActionsConflict` | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | — |
| `operationsConflict(existing,incoming)` | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | — |
| `assessChange` → `duplicate`/`merge`/`conflict` | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | corazón del gate |
| Skip duplicado exacto | ✓ `[ver]` | ~ hydration-lock (no dup VFS) | — | OVERLAP | ADOPT-stable | queue | native | N2 | capas distintas: policy vs race-lock |
| Merge de targets parciales | ✓ `[ver]` | ~ coalesce dup tags en rename | — | OVERLAP | ADOPT-stable | queue | native | N2 | — |
| Bloqueo de contradicción en archivos solapados | ✓ `[ver]` | ~ delete-conflict purge (node-bound) | — | OVERLAP/CONTRADICE | RESHAPE | queue | native | N1 | dos modelos de "contradicción" a unir |
| `dropForNode(nodeId, kinds)` | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | queue/VFS | native | N2 | drop rename/set/filter antes de delete |
| `requestDelete` → `'queued'\|'cancelled'\|'no-op'`, fail-closed | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | queue/VFS | native | N1 | modal-opener inyectado; falla cerrado |
| `bindOpToNode` / node-op conflict registry | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | queue/VFS | native | N2 | — |
| Feedback i18n (`queue.guard.*`) | ✓ `[ver]` | — | ~ toast genérico | SOLO-STABLE | ADOPT-stable | queue | polish | N2 | — |
| Presets/templates pasan por la misma policy | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue / queueScene | native | N2 | aplica a action presets (library `.scene`) |

## Tabla — Ejecución / Commit / Chunking

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `execute()` / `processAll()` | ✓ CHUNK=20 yield `[ver]` | ✓ `processAll()→OperationResult` `[ver]` | ~ apply simulado | OVERLAP | RESHAPE | queue | native | N2 | — |
| `commitFile` (trash/write/rename) | ✓ inline `[ver]` | ✓ función dedicada | — | OVERLAP | ADOPT-sandbox | queue | native | N2 | — |
| `applyOpsToRawContent` | ~ (inf) | ✓ | — | OVERLAP | ADOPT-sandbox | VFS | native | N3 | — |
| Ejecución vía `processFrontMatter` (buffer fresco) | ✓ `[ver]` | ✓ (serializeFile) | — | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | invariante de confianza compartido |
| Special-op execution (renameFile/trashFile) | ✓ `[ver]` | ✓ via commitFile | — | OVERLAP | ADOPT-sandbox | queue | native | N2 | — |
| `clear` / `clearAll` | ✓ (inf) | ✓ + `clearChain`/`clearAllChains` | ~ | OVERLAP | ADOPT-sandbox | queue | native | N2 | — |
| `removeOp` / `removeFile` | ✓ (inf) | ✓ `[ver]` | ~ | COMPARTIDA | ADOPT-sandbox | queue | native | N2 | — |
| Conteos / `count` queries | ✓ (status bar) | ✓ | ~ badge | COMPARTIDA | ADOPT-sandbox | queue | native | N3 | — |
| `OperationResult` (merged/duplicates/conflicts/executed) | ✓ stats `[ver]` | ✓ evento `[ver]` | — | OVERLAP | RESHAPE | queue | native | N2 | shape distinto; unir |
| Chunk-acceptance más allá del preview | ✗ riesgo (content whole-file) `[ver]` | ~ chunked content index | — | OVERLAP | DEFER | queue | flag | N3 | — |

## Tabla — Dual mutable-vs-VFS (N1 gate; el dual vive en sandbox)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Transacciones mutables (canonical hoy) | ~ `queue: PendingChange[]` (lista, no transacción) | ✓ canonical `[ver]` | — | OVERLAP/CONTRADICE | RESHAPE | VFS | native | N1 | — |
| Cadenas VFS inmutables (`VfsChain`) | — | ✓ paralelo p/diff/snapshot `[ver]` | — | SOLO-SANDBOX | DEFER | VFS | flag | N1 | "path transicional" (shard 03) |
| `getOrCreateVFS(requireBody)` | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | VFS | native | N2 | — |
| `splitYamlBody` (tolerante a parse-fail) | ~ implícito | ✓ `[ver]` | — | OVERLAP | ADOPT-sandbox | VFS | native | N2 | — |
| `serializeFile` | ~ via processFrontMatter | ✓ `[ver]` | — | OVERLAP | ADOPT-sandbox | VFS | native | N2 | — |
| `VirtualFileState` | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | VFS | native | N2 | — |
| `ImmutableVirtualFileState` / `freezeVfs` | — | ✓ `[ver]` | — | SOLO-SANDBOX | DEFER | VFS | flag | N1 | hacia historial inmutable |
| `ImmutableStagedOp` | — | ✓ `[ver]` | — | SOLO-SANDBOX | DEFER | VFS | flag | N2 | — |
| `openChain`/`getChain`/`stageImmutableOp`/`clearChain` | — | ✓ `[ver]` | — | SOLO-SANDBOX | DEFER | VFS | flag | N1 | — |
| `replayTransactionOps` | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | VFS | native | N2 | usado por diff/remove |
| Loading-lock anti-race | — | ✓ `serviceQueueRace` | — | SOLO-SANDBOX | ADOPT-sandbox | VFS | native | N1 | — |
| `simulateChanges()` | ✓ `[ver]` | ✓ `[ver]` | ~ no real | OVERLAP | RESHAPE | queue/serviceDiff | native | N2 | misma firma, fuente distinta |
| Fuente-de-verdad canónica (decisión) | mutable list | mutable transactions (+VFS paralelo) | n-a | CONTRADICE | DEFER | VFS | flag | N1 | decidir source-of-truth del diff |

## Tabla — Diff

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Preview frontmatter + path (modal) | ✓ `modalQueueDetails` via simulate | ✓ `viewDiff` consume FileDiff | ~ rows revisables | OVERLAP | RESHAPE | serviceDiff / queueScene | polish | N2 | preview stable = trust baseline |
| `FileDiff` shape + delta kinds | ~ before/after maps | ✓ `[ver-shard]` | — | OVERLAP | ADOPT-sandbox | serviceDiff | native | N2 | — |
| `diffFm` (strip `position`) | ~ implícito | ✓ | — | OVERLAP | ADOPT-sandbox | serviceDiff | native | N2 | — |
| `buildFileDiff` / `buildDiff` / `buildOperationDiff` | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDiff | native | N2 | replay→before, apply→after |
| Body diff LCS → unified hunks | — | ✓ `[ver-shard]` | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDiff | native | N2 | — |
| Límite tamaño body diff (200k, omit + synthetic hunk) | — | ✓ `[ver-shard]` | — | SOLO-SANDBOX | ADOPT-sandbox | serviceDiff | native | N2 | "body diff size policy" en términos user |
| `serviceDiffSnapshot` (diff entre índices de chain) | — | ✓ | — | SOLO-SANDBOX | DEFER | serviceDiff | flag | N1 | depende del path inmutable |
| Diff input canónico (mutable vs snapshot) | mutable sim | dual | n-a | CONTRADICE | DEFER | serviceDiff | flag | N1 | next-action explícito de shard 05 §019 |

## Tabla — Undo / remove-before-execute / replay

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Remove-before-execute | ✓ removeOp/removeFile | ✓ + `dropForNode` | ~ remove row | OVERLAP | ADOPT-sandbox | queue | native | N2 | — |
| Replay post-remove | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | VFS | native | N2 | — |
| Listar transacciones | — | ✓ | ~ list rows | SOLO-SANDBOX | ADOPT-sandbox | queue | native | N3 | — |
| Undo real post-ejecución | — | — | — | COMPARTIDA(ausente) | DEFER | queue | n-a | N3 | nadie lo tiene; el queue ES el undo-previo |
| Undo-stack de CONFIG (≠ vault, D-PSS-5) | — | — | — | SOLO-PROTO(concepto) | MAP | PSS write-batcher | flag | N0 | frontera, ver tabla batcher |

## Tabla — Scope

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Scope `auto` (selected-first, else filtered) | ✓ `[ver-shard]` | ✓ | ~ implícito | OVERLAP | ADOPT-sandbox | scope resolver | native | N2 | misma semántica |
| Scope `selected` / `filtered` | ✓ | ✓ | ~ | COMPARTIDA | ADOPT-sandbox | scope resolver | native | N2 | — |
| Legacy `all`/null normalización | ~ (inf) | ✓ `normalizeOperationScope` | — | OVERLAP | ADOPT-sandbox | scope resolver | native | N2 | — |
| `resolveOperationScopeFiles` | ✓ inline pageOps `[ver-shard]` | ✓ servicio dedicado | — | OVERLAP | ADOPT-sandbox | scope resolver | native | N2 | — |
| `resolveVerifiedOperationScopeFiles` (+source, stale-selected) | — | ✓ `[ver-shard]` | — | SOLO-SANDBOX | ADOPT-sandbox | scope resolver | native | N1 | display de scope antes de destructivo |
| `operationScopeToFnRScope` | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | scope resolver | native | N2 | — |
| Scope compartido (toolbar/FnR/providers/API/queue) | ~ pageOps local | ✓ global | ~ | OVERLAP | ADOPT-sandbox | scope resolver | native | N2 | — |
| Display target count + source por batch | ~ hint en popup | ~ parcial | ~ chips | OVERLAP | RESHAPE | scope resolver | polish | N1 | exigir count+source (shard 05 §020) |
| Proto `viewScope` ≠ operation scope | — | — | ✓ | SOLO-PROTO | DROP (este cluster) | — | n-a | N0 | pertenece a views (cluster 02) |

## Tabla — Ops log / Auditoría

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Ops log | — | ✓ + bind a queue | — | SOLO-SANDBOX | ADOPT-sandbox | queue / opsLog | flag | N3 | — |
| Retención ops log (setting) | — | ✓ | — | SOLO-SANDBOX | ADOPT-sandbox | opsLog | flag | N3 | — |
| Notice de ejecución / resumen | ✓ `[ver]` | ✓ evento `'executed'` | ~ toast | OVERLAP | RESHAPE | queue | polish | N2 | — |
| PerfMeter wrap (`queue.ingest`) | — | ✓ `[ver]` | — | SOLO-SANDBOX | ADOPT-sandbox | queue | flag | N3 | canary diagnostics |

## Tabla — Presentación queue (proto grouping/windowing)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `serviceQueuePresentation` (labels/icons/tones) | ~ básico | ✓ `[ver-shard]` | ~ row mechanics | OVERLAP | ADOPT-sandbox | queueScene | polish | N2 | — |
| Pending agrupado por change-id | ~ (inf) | ✓ `[ver]` | ~ grupos | OVERLAP | ADOPT-sandbox | queue | native | N2 | — |
| Grupos auto vs custom | — | ~ parcial | ✓ `[ver]` | SOLO-PROTO(UX) | MAP | queueScene | polish | N3 | — |
| Grupos con colores/iconos | — | ~ tones/icons | ✓ | SOLO-PROTO(UX) | MAP | queueScene | polish | N3 | — |
| Rename de grupos custom | — | — | ✓ | SOLO-PROTO(UX) | MAP | queueScene | polish | N4 | — |
| Ejecutar grupo | ~ global | ~ global | ✓ | SOLO-PROTO(UX) | MAP | queueScene | polish | N3 | — |
| Apply queue (clear + cerrar island) | ✓ | ✓ | ✓ (simulado) | OVERLAP | RESHAPE | queueScene | polish | N2 | — |
| Parent counts / strip child layers | — | ✓ `[ver-shard]` | ~ | SOLO-SANDBOX | ADOPT-sandbox | queueScene | polish | N3 | — |
| Windowing/paginación de rows | — | — | ~ stack windowing | SOLO-PROTO(UX) | DEFER | queueScene | flag | N4 | solo si runtime lo soporta |
| Queue island = superficie de review (sin stage/bypass toggles) | ✓ contrato 1.1.0 `[ver-shard]` | ~ island distinta | ~ | OVERLAP | ADOPT-stable | queueScene | native | N2 | shard 06 §06.13/§08.09: no regresar toggle al island |
| `vm-queue-replace` (search→rename row) | — | ✓ hook adyacente | ✓ `[ver]` | OVERLAP | MAP | queueScene | polish | N3 | — |

## Tabla — Fronteras con PSS write-batcher (D-PSS-5 / Q6)

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| Write-batcher PSS (coalescer disco, flush unload, atomic) | — | — | — | SOLO-PROTO(decisión) | MAP | PSS storage | n-a | N0 | ≠ operation queue (D-PSS-5) |
| Regla: el queue protege el VAULT, no la config | ✓ | ✓ | n-a | COMPARTIDA(principio) | ADOPT-stable | queue | native | N0 | config = undo/snapshot |
| Imports/exports que ESCRIBEN archivos → queue | ~ (no imports aún) | ~ Bases import preview | n-a | OVERLAP | MAP | queue | native | N1 | import `.scene`/pseudo-snippet/pack = queue |
| Config en vivo = instantáneo + undo-stack | — | — | ✓ control island live | SOLO-PROTO(decisión) | MAP | PSS write-batcher | flag | N0 | — |
| Profile apply = snapshot efímero (rollback 1-click) | — | — | — | SOLO-PROTO(decisión) | MAP | PSS write-batcher | flag | N0 | reusa config-export |
| Action presets = library DENTRO de `.scene` | ~ templates en data | ~ templates | ✓ queue groups | OVERLAP | RESHAPE | queueScene / PSS library | native | N2 | gate SDF-015 aplica al materializar |

## Tabla — Bypass / addOrRun

| Función | Stable 1.1.1 | Sandbox | Proto v12 | Clasificación | Decisión | Destino | Preset | Nivel | Notas |
|---|---|---|---|---|---|---|---|---|---|
| `addOrRun(change)` (gate único de policy) | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | "single policy gate" (§06.13) |
| Bypass aplica MISMA policy antes de ejecutar | ✓ `assessChange(bypass=true)` `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N2 | conflicto con staged → NO corre |
| `operationMode: 'stage' \| 'bypass'` | ✓ `[ver]` | ~ mismo enum sin gate `[ver]` | — | OVERLAP | ADOPT-stable | queue | native | N2 | — |
| `setBypassOperations(enabled)` (setting persistido) | ✓ `[ver]` | ✓ `[ver]` | — | OVERLAP | ADOPT-stable | queue / settings | native | N2 | no toggle en island |
| `setOperationMode(mode)` | ✓ `[ver]` | ✓ `[ver]` | — | COMPARTIDA | ADOPT-stable | queue | native | N2 | — |
| Bypass que NO pisa staged work | ✓ `[ver]` | — | — | SOLO-STABLE | ADOPT-stable | queue | native | N1 | invariante de confianza clave |

## Conflictos detectados

1. **Dual mutable/inmutable (N1 GATE — vive DENTRO de sandbox, CONTRADICE).** Sandbox mantiene transacciones mutables (canonical) + `VfsChain` inmutable (paralelo, transicional) con dos servicios de diff espejo (`serviceDiff`/`serviceDiffSnapshot`). Stable no tiene el dual (lista `PendingChange[]` + closures). Reconciliación obligatoria antes de stable; decidir source-of-truth del diff. `[ver código]`
2. **Stable-policy vs sandbox-architecture (OVERLAP central; refina SDF-015).** Stable 1.1.1 = policy nombrada (`operationIdentity`/`operationsConflict`/`assessChange` + i18n `queue.guard.*` + `addOrRun`) sobre motor sin VFS. Sandbox = arquitectura (VfsChain/openChain/stageImmutableOp/replay/requestDelete/dropForNode/race-lock) sin policy nombrada. **2.0 = policy de stable + arquitectura de sandbox.** `[ver código]`
3. **Dos modelos de "conflicto" (CONTRADICE en mecánica).** Stable: identidad de operación + solape de archivos. Sandbox: node-bound delete-purge + hydration-lock. Complementarios, no equivalentes — decidir si el gate opera sobre identity de `PendingChange` o sobre node descriptors. `[ver código]`
4. **`addBatch` sync vs async (CONTRADICE firma).** Unificación rompe llamadas → relevante a D6 (el único breaking = 2.0.0). `[ver código]`
5. **`simulateChanges` doble fuente.** Stable replaya closures sobre fm base; sandbox sobre transacciones/VFS. Input canónico del diff sin decidir. `[ver código]`
6. **Frontera queue vs PSS write-batcher (resuelta como decisión, MAP).** D-PSS-5/Q6: dos colas; el queue protege el VAULT; config = undo + snapshot efímero; imports/exports con archivos van por queue; action presets = library `.scene`. Asignación de owner, no contradicción.
7. **Proto `viewScope` ≠ operation scope (DROP aquí).** Pertenece al cluster 02.

## Cobertura

- **Subsistemas:** staging/op-types (18) · policy/guards (15) · ejecución (10) · dual mutable-vs-VFS (13) · diff (8) · undo/remove/replay (5) · scope (9) · ops log (4) · presentación (11) · fronteras PSS (6) · bypass (6). **Total ≈ 105 filas** (excede 50-80 por la granularidad exigida en el N1 gate: cada op-key y cada función de policy/VFS por separado).
- **Verificación directa `[ver]`:** stable `1.1.1:src/services/serviceOperationQueue.ts` (policy completa, op-keys, simulate, execute, bypass, addOrRun) y sandbox `src/services/serviceQueue.svelte.ts` (VfsChain, openChain, stageImmutableOp, replayTransactionOps, getOrCreateVFS, requestDelete, dropForNode, processAll, simulateChanges, operationMode). **Hallazgo material: stable NO es solo "push-model" — ya tiene op-keys+simulate+special-op execution; sandbox NO tiene la policy nombrada. Refina (no contradice) el SDF-015.**
- **`[ver-shard]`** (alta confianza, no re-verificado): serviceDiff body-LCS/200k, serviceDiffSnapshot, serviceQueuePresentation internals, pageOps scope, parent-counts.
- **`(inf)`:** stable clear/clearAll/removeFile exactos, applyOpsToRawContent stable, APPEND_LINKS en stable typeOps, pending-group-by-change-id stable.
- **`(sin evidencia)`:** componentQueueList/islandQueue/modalQueueDetails de stable no leídos directo (refs shard 02); serviceDiff/serviceQueuePresentation sandbox no leídos en código.
- **Nota tooling:** Glob/ripgrep con timeouts en el repo; fallback `Get-ChildItem` + `git show | Select-String` sin impacto de cobertura.
