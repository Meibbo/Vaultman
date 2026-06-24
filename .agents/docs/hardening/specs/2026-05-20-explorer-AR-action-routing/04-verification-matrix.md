---
title: A.R Verification Matrix
type: spec-shard
status: draft
parent: "[[index|A.R Action Routing]]"
created: 2026-05-20T00:00:00
updated: 2026-05-20T00:00:00
---

# Verification Matrix

Gates que prueban que el contrato es **idéntico** en los 5 views × contextos, y que ancla anti-drift
de agentes IA vía atributos estructurales (no CSS classes). Alimenta el sub-system T.G (Test Invariant
Gates) — Tier-1 jsdom + Tier-2 browser-mode aquí; Tier-3 wdio queda para T.G/V.D.

## Aclaración de ejes: "mount-context"

El platform mount es **único** (`mountContext="panel"`, panelExplorer.svelte:1243). Los 4
"mount-contexts" de la matriz NO son variantes de ViewHost — son el **provider tab activo** (la fuente
de datos que el panel renderea): `tabFiles` / `tabTags` / `tabProps` / `tabSnippets`
(providers explorerFiles/Tags/Props/Snippets). El mount real `in-editor` (InEditorMountContract,
typeViewHost.ts:53-59) es un eje aparte, cubierto solo por live smoke en este release.

## Diagonal 5 × 4

| view \ provider | tabFiles | tabTags | tabProps | tabSnippets |
|---|---|---|---|---|
| tree  | ✓ | ✓ | ✓ | ✓ |
| list  | ✓ | ✓ | ✓ | ✓ |
| table | ✓ | ✓ | ✓ | ✓ |
| grid  | ✓ | ✓ | ✓ | ✓ |
| cards | ✓ | ✓ | ✓ | ✓ |

Cada celda corre el set de invariantes abajo. Markmap excluido (deferred, hidden). Donde un provider
no produzca jerarquía (ej. props plano), los asserts de expand/drill se marcan N/A por datos, no por
viewMode.

## Suites de invariantes (cross-view, spec-anchored)

1. **WAI-ARIA Tree View pattern** — teclas mandatorias de [[02-contract-shapes]] §4:
   ArrowRight abre / ArrowLeft cierra (linear+tree) · Up/Down · Home/End · Enter activa ·
   Space selecciona · type-ahead · Ctrl/Cmd+A. Por topology (`linear`/`planar`/`planar-drill`).
2. **Caret hit-target snapshot** — ≥24×24 CSS px (WCAG 2.5.8). Branch + leaf. Leaf no traga el row-click.
3. **Selection contract parity** — el mismo `(id, MouseEvent)` con los mismos modifiers produce la
   misma `NodeSelectionSnapshot` en los 5 views (sin MouseEvent sintético). additive/range idénticos.
4. **Keyboard nav parity** — Arrows/Home/End/PageUp-Down/Enter/Space/type-ahead → mismos movimientos
   de focus/selección en los 5 views (con geometría planar donde aplique).
5. **cmenu trigger parity** — los 5 views disparan `onContextMenu(id,e)`; un solo path de apertura;
   standard set presente por nodeType.
6. **Expand/collapse-all parity** — funciona donde hay filas expandibles; grid `inline` rutea a
   `gridExpandedIds`; ausente en planos sin children.

## Asserts estructurales anti-drift (T.G core)

Lo que frena el drift de agentes: **assert de atributos estructurales, NO de CSS classes**.

- `data-row-key` presente y estable (== `callbackId`) en cada fila de cada view.
- `role` correcto por topology (`treeitem`/`row`/`gridcell`/`option`).
- `aria-expanded` presente solo en filas expandibles; refleja estado.
- `aria-selected` refleja `serviceSelection`.
- `tabindex` 0/-1 según roving focus + feature flag `keyboardFocus`.

Snapshot byte-comparable contra el DOM nativo del web-lab (obsidian-web-lab) donde el View Feature
Contract de 0-A define `nativeDomEmission` (serviceExplorerViewContract.ts:49-52 + per-view vocab).

## Tiers (alineado con T.G)

- **Tier-1 Vitest jsdom**: `resolveActionIntent`, `serviceKeyboardNav`, `serviceRowAction`,
  `selectionModifiersFromEvent` (puros). Steps 1-3 de [[03-migration-sequence]].
- **Tier-2 Vitest browser-mode**: contratos de componente contra el DOM real del web-lab — caret
  snapshot, parity de selección/keyboard/cmenu, asserts estructurales. Steps 4-8.
- **Tier-3 wdio-obsidian-service**: E2E en Obsidian real — **fuera de A.R** (lo trae T.G/V.D); A.R
  cubre el live smoke manual abajo.

## Live `plugin-dev` smoke (gate final, Step 9)

Reglas Obsidian CLI: usar siempre `vault=plugin-dev` explícito.

```
obsidian vault=plugin-dev plugin:reload id=vaultman
# por cada view × provider: ejercitar click (+ ctrl/shift), keyboard (arrows/home/end/enter/space/type-ahead),
#   caret (mouse + ArrowRight/Left), cmenu (right-click → standard set), expand-all/collapse-all
obsidian vault=plugin-dev dev:errors    # esperado: "No errors captured."
```

Criterio de salida: matriz Tier-1 + Tier-2 verde, snapshots de caret/estructura verdes, y
`dev:errors = No errors captured` tras ejercitar la diagonal completa.
