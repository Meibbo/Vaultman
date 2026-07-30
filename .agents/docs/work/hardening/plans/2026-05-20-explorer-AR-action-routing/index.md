---
title: A.R — Action Routing Contract (implementation plan)
type: plan-index
status: complete
parent: "[[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R spec]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T18:25:00-05:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/action-routing
  - release/v1.2.0
created_by: claude-opus-4-7
---

# A.R — Action Routing Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`)
> syntax for tracking.

**Goal:** Unificar caret, keyboard nav (2D+3D), selección, context-menu y expand/collapse-all en los 5 views del explorer detrás de un único contrato de ruteo `(id, MouseEvent)`, vía dos servicios puros nuevos (`serviceKeyboardNav`, `serviceRowAction`) y un intent-seam extensible.

**Architecture:** Approach A1 — builders Melt-UI en capa de servicio; cada view spreadea prop-bags sobre su markup existente. `serviceKeyboardNav` extrae/unifica la lógica de teclado hoy atrapada en `panelExplorer.handleRowKeydown` y completa los gaps (Home/End universal, type-ahead). El contrato del seam se angosta a una sola familia `(id, MouseEvent)` con `id === ExplorerRowInput.callbackId`; se borra el Contract B de list y su hack de `MouseEvent` sintético. No NodeRow primitive, no view decomposition (esos son N.R/V.D, releases posteriores).

**Tech Stack:** Svelte 5 (runes), TypeScript, Vitest (jsdom Tier-1 + browser-mode Tier-2), Obsidian API. Reusa servicios existentes: `serviceSelection.svelte` (multi-select anchor/focus/hover), `serviceMouse` (gesture→intent + `resolveNodeMouseActions`), `serviceCMenu` (registry), feature flags de `serviceExplorerViewContract`.

Spec fuente: [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R spec]] (6 shards). Este plan implementa esa spec 1:1.

---

## Gate-0 (pre-código, bloqueante — NO es una task con commit)

Antes de la Task 1, verificar y NO proceder si falla:

- [x] **0-A cerrado**: C12 (flicker fix) + C13 (verification gates) checkeados en el plan de 0-A (`.agents/docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/`), y `pnpm verify` verde en 0-A. A.R rebasa sobre el markup post-0-A.
- [x] **Dirty worktree seguro**: el cierre 0-A/C12-C13 quedó aislado en archivos de harness, perf probe, tests y docs. A.R aún no tocó `viewTree.svelte`, `ViewNodeList.svelte` ni otros views.
- [x] **Baseline verde**: `pnpm check` (0 errors) + suite actual verde como línea base.

Gate-0 cerrado el 2026-05-20. Evidencia fuente:
[[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log|0-A baseline log]].

## File structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/types/typeActionRouting.ts` | Create | Tipos del contrato: `RowInteractionContract`, `ActionIntent*`, `ActionModifiers`, `selectionModifiersFromEvent`, `resolveActionIntent` |
| `src/services/serviceKeyboardNav.ts` | Create | State machine topology-aware (`linear`/`planar`/`planar-drill`); key-table WAI-ARIA + Home/End + type-ahead |
| `src/services/serviceRowAction.ts` | Create | Builder Melt-UI: `getRowProps`/`getCaretProps`/`getKeyboardHandlers` |
| `src/components/explorer/ViewHost.svelte` | Modify | Drop Contract B props (96-99) + `handleListContextMenu`; list wirea Contract A |
| `src/components/containers/panelExplorer.svelte` | Modify | Construye `RowActionContext`; borra bridges de list (598-630); data-gate expand (137); reconcilia cmenu (588-596) |
| `src/components/views/viewTree.svelte` | Modify | Caret fix (985-1001) + spread builders |
| `src/components/views/ViewNodeList.svelte` | Modify | Emite Contract A; borra `SelectModifiers`/`handleSelect`/`handleKeydown` (39-43,230-269) + spread |
| `src/components/views/ViewNodeTable.svelte` | Modify | Spread builders; borra `handleTableKeydown` Ctrl+A-only |
| `src/components/views/ViewNodeGrid.svelte` | Modify | Spread builders (geometría planar + drill) |
| `src/components/views/ViewNodeCards.svelte` | Modify | Spread builders (geometría planar) |
| `src/styles/explorer/_tree.scss` | Modify | Caret hit-target ≥24×24 |
| `src/providers/explorer*.ts` | Modify (verify) | Verificar/registrar standard cmenu set por provider |
| `test/unit/services/*.test.ts` | Create | Tier-1 jsdom (intent, keyboardNav, rowAction) |
| `test/component/*.test.ts` | Create | Tier-2 browser-mode (caret, parity de selección/keyboard/cmenu/expand, asserts estructurales) |

## Tasks (shards)

- [[01-services]] — Task 1 (typeActionRouting + intent resolver), Task 2 (serviceKeyboardNav), Task 3 (serviceRowAction). Tier-1 jsdom, full code.
- [[02-caret-and-seam]] — Task 4 (caret fix), Task 5 (ViewHost+panel+list normalization, drop Contract B).
- [[03-view-adoption]] — Task 6a-6d (tree/table/grid/cards adoptan builders + delegan keyboard).
- [[04-expand-and-cmenu]] — Task 7 (expand/collapse-all data-gated), Task 8 (cmenu trigger unify + standard set).
- [[05-verification]] — Task 9 (matriz de verificación + live smoke + docs update).

## Orden + paralelización

Secuencial: Gate-0 → 1 → 2 → 3 → 4 → 5. Luego Task 6a-6d **paralelizables** (un view por subagent).
Luego 7 → 8 → 9. Tasks 1-3 son los más densos (servicios + tests). Task 5 desbloquea 6.

## Self-review (post-escritura, ver fondo de [[05-verification]])

- Spec coverage: cada sección de la spec mapeada a task(s). Gaps: ninguno conocido.
- Placeholder scan: sin TBD/TODO; código completo en cada step de código.
- Type consistency: nombres de tipos/métodos consistentes entre tasks (`RowActionContext`, `KeyboardNavController`, `getRowProps`, `data-row-key`, `selectionModifiersFromEvent`).

## Execution handoff

A.R ejecutado completo en `sandbox` el 2026-05-20. Gate-0 y Tasks 1-9 están cerrados; la evidencia final vive en [[05-verification]]. Próximo slice de `v1.2.0`: tree sticky-parent fix, 0-A.S scroll harness follow-up, o T.G invariant-gate basis.
