---
title: "BT5 next-10 shard 04: verificación, gates y pase adversarial"
type: plan
status: active
lifecycle: active
parent: "[[docs/work/polish/plans/2026-07-19-bt5-next-10/index|BT5 next-10 plan]]"
created: 2026-07-19T15:03:21
updated: 2026-07-19T15:03:21
created_by: claude-fable-5
updated_by: claude-fable-5
tags: [agent/plan, initiative/polish, release/bt5, verification]
---

# Shard 04 — verificación y pase adversarial

## Gates

Durante desarrollo: SOLO focales (`pnpm vitest run test/unit/<archivo>` con un runner a la vez) + autofixer Svelte MCP por `.svelte` tocado. Nada de verify completo por issue; sin dos runners Vitest en paralelo; si un runner se cuelga, inspeccionar árbol PID y matar solo descendientes propios.

Cierre único:
1. `pnpm run verify` (una sola pasada limpia).
2. `pnpm run build` (sync SOLO a plugin-dev).
3. `git diff --check`.
4. SHA-256 de `main.js`/`manifest.json`/`styles.css` worktree vs `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
5. Smokes runtime (todos `vault=plugin-dev`): harness 030 re-run (celda reparada + presupuesto relativo) · 006 nested on/off → acción aparece/desaparece (toolbar y Tools) · 007 popup vs nativo mismo estado tras cambios cruzados · 008 drill-sync del índice → toolbar Tags refleja scope · 009 exclude desde ctx + Show again (files+content) · 010 tooltip respeta orden/Label configurados · 011 activación on/off orden de cells vivo · 012 path label en plano + sort Path oculto nested on · 013 abrir 2 files → orden Last opened + persistencia tras reload · `dev:errors` final limpio.
6. Docs: actualizar los 10 issue files + índice BT5 con evidencia real; source record (este plan gana sección Outcome) · doc-health focal · index/query smoke.
7. Commits: producto por seam (030 · 006/007/008 · 028 · 009 · 010 · 011/012/013) sin `.agents`; luego commit docs local-only en sandbox. Sin push/tag/merge/PR.
8. Room: task done + scope release + leave; session-log línea nueva.

## Pase adversarial (pre-implementación, 2026-07-19)

1. **030: fix sin causa.** Riesgo: aplicar gating por visibilidad sin que la matriz lo atribuya. Mitigación: matriz primero; cada fix mapea a una celda/productor medido; si no hay repro objetivo → issue queda pendiente/HITL con evidencia y el batch sigue (release bloqueado se documenta).
2. **030: harness perturba la medición.** Sondas idénticas en TODAS las celdas (incluida disabled); comparar deltas, no absolutos; trigger-wrap se instala/retira por celda.
3. **Gating rompe frescura de contadores.** Acceptance explícito: dirty-flag rinde en `refreshViewport()`; tests 1-2 del shard 01 verifican datos frescos al reactivar.
   Riesgo residual: superficies que NUNCA reciben refreshViewport (frame oculto sin reactivación) — cubierto porque el render diferido también se dispara en el próximo evento con isShown()=true.
4. **007: popup con estado zombie.** El popup vive abierto mientras el nativo edita → resync por $effect sobre initialSortState; test de resync. Riesgo inverso: $effect pisa edición en curso del popup — el popup no tiene edición multi-paso local (cada click emite), aceptable.
5. **008: loops de notificación.** Doble guard sameSortState (setter + handler) ya probado en files; test explícito de no-reaplicación. View config load pasa por applySortState → setter guard corta el eco.
6. **009: cambio de semántica global.** Excluir en pipeline afecta counts de props/tags/stats (antes solo Files render). Es LO PEDIDO (coherente con exclude-folder), pero se registra como cambio visible en el issue file y smoke dedicado. Riesgo: substring-match accidental → test de igualdad exacta de path.
   Clear filters NO restaura excluidos (persistente ≠ rule de sesión) — documentado.
7. **009: rename de carpeta.** Obsidian emite rename solo para la carpeta → migración por prefijo obligatoria (test dedicado). Paths huérfanos imposibles tras delete-purge prefix-aware.
8. **010: registry como god-object.** Contrato: datos + funciones puras, cero imports de obsidian/plugin; los renderers siguen dueños de su DOM. Guard: test de imports del módulo (source).
9. **010/011: snapshots DOM.** Con setting off y defaults, orden fixed ≡ secuencia actual → snapshots byte-idénticos; cualquier diff de snapshot con setting off es regresión del refactor, no "esperada". Gate: suite component existente.
10. **011: sort sin cell.** `SORT_ONLY_POSITIONS` explícito (sub, addons name) — sin posiciones implícitas; test los enumera.
11. **013: localStorage.** ~11k paths ≈ cientos de KB, bajo el límite (~5MB);
    debounce 2s + flush unload evita stalls y pérdida; si `loadLocalStorage` no existe en stubs de test, se stubbea en obsidian-stub (no en producto). Vault-local por diseño (no viaja por Sync) — si el dev quisiera sync entre dispositivos sería otro issue.
12. **013: aperturas programáticas.** `file-open` dispara también en aperturas por código que activan el file (aceptado por acceptance); hover-preview no lo emite.
13. **Alcance horizontal.** 011 toca todos los renderers — se limita a ORDEN de ejecución de render-fns/columnas; cero cambios de markup por cell. Cualquier tentación de rediseñar cells aquí = fuera de scope (BT5-015+).
14. **Windows/runners.** Un solo Vitest; timeouts → PID-tree propio; verify completo exactamente una vez al final (lección retro 462s+369s).

## Presupuesto de aceptación 030 (se fija tras la matriz, antes del fix)

`p95_typing_delay(enabled_fixed) <= p95(disabled) * 1.25 + 4ms` y `long_tasks_vaultman(60s) == 0` — provisional; se ajusta con los números reales de la matriz y queda registrado en el issue file antes de tocar código de fix.
