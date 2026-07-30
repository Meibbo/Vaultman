---
title: "BT5 next-10 shard 01: BT5-030 diagnóstico y fix"
type: plan
status: active
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-19T15:03:21
updated: 2026-07-19T15:03:21
created_by: claude-fable-5
updated_by: claude-fable-5
tags: [agent/plan, initiative/polish, release/bt5, performance]
---

# Shard 01 — BT5-030 micro-cuelgues al escribir

## Inventario de productores (source inspection, worktree HEAD 14de6fbb)

Timers:
- `serviceIcons.ts:95` — `setInterval(_syncExternalData, 2500)`: `adapter.stat` async del data.json de Iconic + guard mtime/in-flight. Además listener vault `raw` (L108).
- `explorerSnippets.ts:67` + `explorerPlugins.ts:67` — `setInterval(_syncExternalState, 2500)`: guard `destroyed || !containerEl.isShown()`; firma sync si visible.
- `performanceHud.svelte:131` (solo con HUD on) · `performanceMonitor.ts:205` (sampler).

Eventos por ciclo de escritura (parse/save):
- `explorerProps.ts:334` — `metadataCache.changed` → `logic.invalidate()` + `_render()` **FULL, sin debounce ni guard de visibilidad**. Panes quedan montados (SDF-014).
- `servicePropertyIndex.ts:38` — `metadataCache.resolved` → `rebuild()` **FULL O(files)** en cada resolved (resolved re-dispara tras cada batch de cambios, no solo al boot).
  El path incremental correcto ya existe (`changed` → pendingFiles → flush debounced).
- `explorerTags.ts:147` — `metadataCache.resolved` → `logic.invalidate()` + `_render()` full, sin guard de visibilidad.
- `VaultmanFrame.svelte:1172,1202` — `resolved` → `onVaultResolved` → `refreshFiles()`.
- `serviceStatisticsCache.ts:90-119` — changed/modify → invalidate + refresh por path (debounce 120ms, solo files ya cacheados) + persist IndexedDB + invalidateAggregates.
- `serviceFilter.ts:70-73` — create/delete/modify/rename → clearSortCache (barato).
- `VaultmanFrame.svelte:1183-1193` — `vault.modify` → onVaultModified (early-return si no hay content search activa; si activa, debounce 400ms + updateStats).

Hipótesis rankeadas (NO causas hasta medir): H1 explorerProps changed→full render · H2 propertyIndex resolved→full rebuild · H3 explorerTags resolved→render · H4 frame resolved→refreshFiles · H5 cadena statsCache (debounced, targeted) · H6 polls 2500ms (guarded/stat baratos).

## Harness (eval en plugin-dev, sin tocar producto para medir)

Script Node + obsidian-cli (`obsidian vault=plugin-dev eval code=...`), fases:
1. Instala colectores: `PerformanceObserver` longtask · sampler de event-loop delay (setInterval 50ms, drift>16ms cuenta) · wrap de `metadataCache.trigger` y `vault.trigger` midiendo `performance.now()` alrededor del dispatch por evento (atribución handler-cost por evento) · registro de marcas `performance.mark`.
2. Simula escritura 60s: `activeEditor.editor.replaceSelection(ch)` cada 80ms sobre nota scratch dedicada del vault plugin-dev (crea `bt5-030-scratch.md`); captura input-to-next-paint aproximado midiendo rAF tras cada inserción.
3. Reporta JSON: p50/p95/p99/max de paint-delay, long tasks (count/total/max, buckets por periodicidad 2500ms), event-loop delays, coste por evento (changed/resolved/ modify/raw), top marcas.
4. Cleanup: restaura triggers, borra scratch, desconecta observers.

Matriz A/B (mismo overhead de sondas en todas las celdas):
| Celda | Estado |
|---|---|
| M1 | plugin disabled (baseline) |
| M2 | enabled, sin leaf Vaultman |
| M3 | leaf abierta en sidebar oculto (no visible) |
| M4 | leaf visible no activa, tab Files |
| M5-M9 | leaf visible: Props · Tags · Snippets · Plugins · Content/Statistics |
| M10 | inmediatamente tras `plugin:reload` (leaf preservada) vs asentado (M4) |
| M11 | sin escribir (idle 60s, sin modify) vs escribiendo (aísla input-dependencia) |

Atribución adicional si hace falta separar H1-H4: parcheo temporal por eval de `plugin.propertyIndex.rebuild` / re-medida (toggle de productor), nunca como fix.

## Criterio de fix (post-atribución)

- Cancelar/suspender trabajo de explorers NO visibles: dirty-flag + render diferido a `refreshViewport()` (seam BT4-022/BT5-002 ya llamado al activar leaf/tab) usando `containerEl.isShown()`. Aplica a explorerProps.changed, explorerTags.resolved.
- `servicePropertyIndex`: `resolved` hace rebuild solo si el índice aún no se pobló (primer resolve); después, deltas via `changed` flush (ya existe). Bulk ops llegan igualmente por `changed` por archivo.
- `VaultmanFrame.onVaultResolved`: coalescer (debounce corto) + saltar si el frame no está visible con dirty-flag al reactivar.
- Trocear si la medición muestra long task >50ms en trabajo necesario visible.
- PROHIBIDO: solo alargar intervalos. Contadores visibles deben seguir frescos tras idle/save/cambio de leaf/reactivación (el dirty-flag rinde al activar).
- Sin starvation: statsCache sigue progresando en idle (no se toca su scheduling salvo que la matriz lo atribuya).

## Tests de regresión (RED→GREEN)

`test/unit/explorerIdleWork.test.ts` (+ guards source en tests existentes si aplica):
1. explorerProps con container oculto (isShown=false stub): N eventos `changed` → 0 renders; al `refreshViewport()` → exactamente 1 render con datos frescos.
2. explorerTags ídem con `resolved`.
3. propertyIndex: tras primer `resolved`, más eventos `resolved` no llaman rebuild (spy); `changed` sigue flusheando.
4. reload/unload: sin listeners/timers duplicados (contar registros con stubs; leaf preservada → un solo set).
5. Cierre de leaf: unload cancela timers pendientes (dirty-flag no dispara render).

## Gate de aceptación runtime (fin de batch, plugin-dev)

Re-run harness en la celda reparada: 60s escritura sin long tasks >=50ms atribuibles a Vaultman ni periodicidad de sus timers; p95/p99 paint-delay dentro de presupuesto relativo vs M1 (fijar presupuesto ANTES del fix con los números de la matriz).
Confirmación HITL del dev requerida para cerrar el issue (queda pendiente-HITL si todo lo automatizado pasa).
