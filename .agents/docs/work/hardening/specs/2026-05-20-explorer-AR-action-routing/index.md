---
title: A.R — Action Routing Contract (detail spec)
type: spec-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/action-routing
  - explorer/refactor
  - release/v1.2.0
created_by: claude-opus-4-7
---

# A.R — Action Routing Contract

Primer detail spec hijo del [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]].
Unifica **cómo un input intent (pointer, keyboard, context-menu, expand) se rutea a una acción** en los 5 views (`tree`/`list`/`table`/`grid`/`cards`) y los mount-contexts del explorer.

A.R **no** introduce modalidades nuevas ni topologías de view nuevas. Diseña el **seam de ruteo** (un resolver de intents extensible) y construye solo el slice `row + mouse + keyboard` en este release.
Modalidades futuras (hover, touch swipe, FAB) y topologías futuras (scoped/nested views) se registran contra el mismo contrato más tarde.

## Working ID y versión

- **Working ID**: `A.R` (Action Routing). NO es ID canónico del roadmap — el roadmap usa `1-12 + N + O` y los nuevos sub-systems usan letter-pairs. La asignación de número canónico para los 11 nuevos (incluyendo A.R) se reconcilia en `roadmap-overview.md` como acción aparte, **no bloquea** este spec.
  Ver [[05-risks-and-deferred]] (§Reconciliación pendiente).
- **First release**: **v1.2.0**. Razón: decisión D3 (catch-up renumber) loquea que el primer release publicado = `1.1.0 catch-up` (todo desde 1.0.0). El pipeline del umbrella shifta +0.1.0, así que "Explorer Hardening" arranca en **v1.2.0**. El umbrella ya fue renumerado en `b1d1014 docs(release): record catch-up and renumber umbrella`.

## Problema raíz (del brainstorm 2026-05-19)

El usuario reportó: caret roto, keyboard nav inconsistente, selección divergente entre views, expand-all que solo funciona en algunos views, y cmenu que parece disperso. La auditoría de código (2026-05-20) precisó las causas:

- **Dos contratos de row-interaction en el seam** (ver [[01-architecture]] §Estado-actual):
  Contract A `(id, MouseEvent)` (tree/table/grid/cards) vs Contract B `(row, SelectModifiers)` (ViewNodeList). El B se "bridgea" hoy con un hack de `MouseEvent` sintético (`mouseEventFromListModifiers`, panelExplorer.svelte:618-630).
- **Keyboard atrapado en god-object**: la lógica de teclado existe y es relativamente completa, pero vive dentro de `panelExplorer.handleRowKeydown` (panelExplorer.svelte:632-704) — no es servicio reusable, no la comparten los handlers inline divergentes de los views (ViewNodeList.handleKeydown 239-269, Table solo Ctrl+A), y le falta Home/End universal + type-ahead.
- **Caret**: en hojas, `div.vm-tree-toggle.is-placeholder` (viewTree.svelte:998-1001) ocupa el slot pero es inerte; el toggle de rama (985-996) hace `stopPropagation` y su `onkeydown` es no-op; el hit-target es 20px < 24px WCAG 2.5.8 (`_tree.scss`).
- **Expand/collapse-all gateado por viewMode** (`hasExpansionSurface = tree||grid`, panelExplorer.svelte:137) en vez de por datos.
- **cmenu** ya está centralizado (registry en `ContextMenuService`, serviceCMenu.ts) + registrado per-provider; la "dispersión" real es el **trigger** divergente, no la construcción.

## Decisiones loqueadas (brainstorm + grilling 2026-05-19/20)

1. **Approach A1**: builders en capa de servicio; cada view spreadea prop-bags sobre su markup existente. No NodeRow primitive, no view decomposition (ver non-goals).
2. **Contrato único** `(id, MouseEvent)` donde `id === ExplorerRowInput.callbackId`; se dropea Contract B (`onSelect`/`onActivate`/`onFocus`/`onListContextMenu`).
3. **Intent seam extensible**: `resolveActionIntent({surface, gesture, modifiers, pointerType})`.
   v1.2.0 implementa `{row,caret} × {click,aux,keyboard} × {mouse,keyboard}`. Reserva (no construye) hover/swipe/longpress/drag, surface `button`/`fab`, pointer `touch`/`pen`.
4. **Keyboard 2D + 3D en v1.2.0**: `serviceKeyboardNav` topology-aware — `linear` (tree/list/table) · `planar` (grid/cards x-y) · `planar+drill` (3D = descend/ascend, reusa el folder-drill existente del grid).
5. **Expand/collapse-all data-gated** (`hasExpandableRows`), propagado a todos los views vía `nodeExpansionCommand`. Preserva el render inline-expand existente del grid.
6. **cmenu**: unificar el trigger (list → `onContextMenu(id,e)`) + verificar/registrar el standard set.
   NO rebuild (ya hay registry).
7. **DnD locked-out**: A.R compone con `onManualDrop` sin romperlo, no lo posee. El bug de manual-sort = repair spec aparte. Ver [[05-risks-and-deferred]] (§DnD repair).
8. **Scoped/nested views = downstream** (nuevo sub-system, depende de A.R+N.R+V.D). A.R solo queda forward-compatible. Ver [[05-risks-and-deferred]] (§Scoped / nested views por nivel).

## Scope

- **Build (v1.2.0)** — detalle en [[02-contract-shapes]] + [[03-migration-sequence]]:
  - `src/services/serviceKeyboardNav.ts` (nuevo; extrae + unifica + completa la lógica de teclado).
  - `src/services/serviceRowAction.ts` (nuevo; builder Melt-UI con `resolveActionIntent`).
  - Normalización del contrato en ViewHost + panelExplorer (drop Contract B + hack sintético).
  - Fix caret (hit-target ≥24×24, keyboard vía row-level Arrow, placeholder `pointer-events:none`).
  - cmenu trigger unificado + standard set verificado.
  - Expand/collapse-all data-gated propagado a todos los views.
- **Reserved-not-built (forward-compat)**: hover/swipe/drag gestures, button/FAB surface, touch/pen pointer, flat-orderedIds + per-level renderer map (scoped views).
- **Out (items separados)**: DnD repair, scoped/nested views, grid Nautilus rewrite (v1.5.0).

## Locked non-goals (A.R)

- NO NodeRow primitive (eso es N.R, primer release tras renumber).
- NO View Decomposition (V.D).
- NO viewTree sticky-parents fix (sibling spec del mismo release).
- NO 0-A.S scroll triple-write fix (sibling paralelo).
- NO virtualization changes.
- NO DnD changes a `serviceDnd` (compose-only).

## Dependencias y gate

- **Consume el View Feature Contract de 0-A**, ya commiteado (C1-C11, `ExplorerViewFeatureContract` serviceExplorerViewContract.ts:54-60; `NodeElementMask` typeViewHost.ts:15-22; `ExplorerRowInput` serviceExplorerRowInput.ts:21-40).
- **0-A NO está cerrado** (C12 flicker fix + C13 verification gates — todos los checkboxes unchecked).
  El **spec** se escribe ahora (el contrato consumido está commiteado). La **implementación** queda gateada: el plan de A.R tiene un Gate-0 que asserta 0-A C12/C13 cerrado antes de tocar código.
  Ver [[05-risks-and-deferred]] (§Gate 0-A).

## Shards

- [[01-architecture]] — A1, servicios, intent seam, modelo topology, mapa de estado-actual.
- [[02-contract-shapes]] — interfaces TS exactas (contrato unificado, resolver, builders, keyboard, modifier translation, id/callbackId, consumo de feature flags).
- [[03-migration-sequence]] — TDD red→green paso a paso, deletions/extractions, plan de commits.
- [[04-verification-matrix]] — diagonal 5×4, suite WAI-ARIA, snapshot caret, parity, asserts estructurales anti-drift, live smoke.
- [[05-risks-and-deferred]] — riesgos, non-goals, seams forward-compat, items diferidos.

## Status

- 🟡 spec + implementation plan drafted on branch `claude/pensive-khorana-ed62bd`, imported to `sandbox` after the catch-up renumber. Awaiting Gate-0 closure before implementation.
- ~Commits estimados: 8-12 (alineado con el umbrella).
- Source: brainstorm 2026-05-19 (Claude Opus 4.7) + auditoría de código 2026-05-20.
- Approver del approach + forks: User (Meibbo), 2026-05-19/20.
