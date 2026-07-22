---
title: BT5 final stable audit plan — Property format cell
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Property format and action cells]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, properties, cells]
---

# Opt-in typed `format` cell

## Task 16 — BT5-055 register and project `format`

**Create:**

- `src/logic/logicPropertyValuePresentation.ts`
- `test/unit/propertyValueRendering.test.ts`

**Modify:**

- `src/logic/logicCellRegistry.ts`
- `src/components/containers/explorerProps.ts`
- `src/utils/renderPropertyValue.ts`
- `src/components/layout/viewTree.ts`, `viewNodeTable.ts` only if their render ports need semantic context
- `src/i18n/en.ts`, `src/i18n/es.ts`
- `test/unit/cellRegistry.test.ts`

### 16.1 Red — registry and persistence

Add `format` with role `control`, a localized label/icon and Props support for Tree/Table/Cards. It is `defaultOn:false`, so loading a beta.6 saved `visibleCells` array does not silently activate it. Tests cover availability, activation ordering, normalization and toggling without rebuilding `PropertyIndexService`.

### 16.2 Red — one presentation decision for every engine

Define:

```ts
export type PropertyValuePresentation =
	| { mode: 'raw'; text: string }
	| { mode: 'formatted'; raw: string; type: PropertyType };

export function propertyValuePresentation(
	raw: string,
	type: PropertyType,
	visibleCells: ReadonlySet<string>,
): PropertyValuePresentation;
```

Tests prove raw mode creates no link/checkbox/date controls and prints the exact serialized text; formatted mode delegates to typed rendering. Wikilink formatting/navigation remains working. Tree, Node Table and Cards must all receive the same `format` state at their value-label seam; add an engine adapter test rather than three divergent implementations.

### 16.3 Green

- Gate `_renderPropertyValueLabel` on `visibleCells.has('format')`.
- In raw mode, create a text span only and never attach interaction listeners.
- In formatted mode, call a renderer whose callbacks are injected; do not let the utility reach into queue state itself.
- Rerender the active views on cell toggle, preserving index/tree data and expansion.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/cellRegistry.test.ts test/unit/propertyValueRendering.test.ts
pnpm run check
git diff --check
```

- [ ] Runtime: toggle Format on/off in each supported Props engine; raw Wikilink remains raw/off and interactive/on.
- [ ] Commit: `feat(properties): add value format cell`.
