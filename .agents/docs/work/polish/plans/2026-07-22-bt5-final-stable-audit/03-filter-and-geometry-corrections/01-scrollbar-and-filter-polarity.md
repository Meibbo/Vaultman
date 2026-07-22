---
title: BT5 final stable audit plan — scrollbar and filter polarity
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Filter and geometry corrections]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, filters, layout]
---

# One scrollbar footprint and reversible filter polarity

## Task 4 — BT5-052 restore the dev's short filter copy

**Modify:** `src/i18n/en.ts`, matching `src/i18n/es.ts` only where locale parity requires a key, and the exact tests that snapshot/assert those keys.

### Red / forensic oracle

Use Git, not invented wording:

```powershell
git log --oneline -- src/i18n/en.ts
git diff b56b9a78^ b56b9a78 -- src/i18n/en.ts
git show <last-dev-good-commit>:src/i18n/en.ts
```

- [ ] Identify the developer-authored short labels immediately before the agent rewrite.
- [ ] Add exact expectations to the locale/i18n unit test (create `test/unit/filterI18n.test.ts` if no focused test exists).
- [ ] Run it red against current text, restore only the intended keys, then run green.
- [ ] Do not mass-revert unrelated newer translations.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/filterI18n.test.ts
pnpm run check
```

## Task 5 — BT5-053 transactional inclusive/exclusive/remove polarity

**Modify:**

- `src/services/serviceFilter.ts`
- `src/components/containers/explorerProps.ts`
- `src/components/containers/explorerTags.ts`
- `src/logic/logicActiveFilterBubbling.ts` or a new `src/logic/logicFilterPolarity.ts`
- `src/components/layout/viewTree.ts` only if it needs a semantic presentation class
- `styles.css`
- `test/unit/filterService.test.ts`
- `test/unit/filterServiceMetadataRefresh.test.ts`
- create `test/unit/filterPolarityInteraction.test.ts`

### 5.1 Red — removal clears either polarity

Current `removeNodeByProperty` omits `missing_property` / `not_specific_value`; `removeNodeByTag` omits `not_has_tag`. Add tests that seed one exclusive filter, call the public removal method once, and assert no inclusive or exclusive match remains.

Prefer a single service transition:

```ts
export type FilterPolarity = 'none' | 'inclusive' | 'exclusive';

setPropertyNodePolarity(propName: string, value: string | undefined, next: FilterPolarity): void;
setTagNodePolarity(tagId: string, next: FilterPolarity): void;
```

These methods must replace opposite predicates atomically and refresh once.

### 5.2 Red — distinguish single click from true double click

Create a pure coordinator with injectable time/timer so tests do not sleep:

```ts
export interface DeferredFilterClick {
	click(key: string, at: number): FilterClickEffect[];
	flush(key: string, at: number): FilterClickEffect[];
	cancel(key: string): void;
}
```

Required sequences:

- inactive + one click + timeout → inclusive;
- inactive + two clicks within threshold → exclusive only (never transient inclusive write);
- inactive + two slow clicks → inclusive then remove, matching two independent clicks;
- inclusive + one click → remove;
- exclusive + one click → remove;
- different node IDs never combine;
- teardown cancels pending clicks.

Use Obsidian/platform double-click timing if exposed; otherwise centralize one documented threshold and test boundary values. Avoid relying on DOM `dblclick` alone because touch/coarse-pointer parity still needs a deterministic route.

### 5.3 Red — Tree highlights and bubble dots expose polarity

The current CSS targets stale `.vm-tree-row-surface`. Add semantic classes/data attributes to the actual `.vaultman-tree-row` projection and assert:

```text
inclusive: primary/text-color highlight + --filter dot color
exclusive: primary/text-color highlight + --filter-excluded dot color
none: neither class
```

Do not make exclusive look like active-accent. Cards, Tree and Table must derive from the same presentation model, and one click after exclusive must remove the highlight.

### 5.4 Green gates

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/filterService.test.ts test/unit/filterServiceMetadataRefresh.test.ts test/unit/filterPolarityInteraction.test.ts test/unit/viewTreeBehavior.test.ts
pnpm run stylelint
pnpm run check
git diff --check
```

**HITL:** Props key/value and Tag in Tree/Cards/Table where supported; fast double, slow double, one-click remove; nested collapsed bubble dots. Commit with BT5-052 if inseparable: `fix(filters): make polarity interaction reversible`.

## Task 6 — BT5-051 hidden scrollbar with exactly one footprint

**Modify:**

- `src/VaultmanFrame.svelte`
- `styles.css`
- `test/unit/floatingTocSource.test.ts`
- create `test/unit/floatingTocLane.test.ts` for pure layout state

### 6.1 Red — model the two independent settings

Extract a pure projection:

```ts
export interface FloatingTocLaneLayout {
	hideScrollbar: boolean;
	reserveExplicitLane: boolean;
	contentGutterPx: number;
	railScrollbarOffsetPx: number;
}
```

Test the full matrix for right/left × hidden on/off × reserve on/off × plain on/off × vertical/horizontal. Contract:

- Hide off + Reserve off: overlay, no extra content gutter.
- Hide on + Reserve off: scrollbar invisible; rail position unchanged; content gets one rail-sized gutter so rows do not sit beneath it.
- Hide off + Reserve on: explicit reserved lane behavior.
- Hide on + Reserve on: still one effective footprint, never scrollbar lane + rail lane.
- Horizontal Top/Bottom: neither vertical reserve class nor browser scrollbar appears.
- Plain style uses its measured/specified compact width, not the full pill width.

Run the new test red before changing Svelte/CSS.

### 6.2 Green — project one class/variables, not coupled booleans

Replace `tocReservedLane || tocHideExplorerScrollbar` in `tocReservedLanePosition`. Bind semantic classes and CSS variables computed from the pure projection; remove the hardcoded rule that moves the rail `14px` merely because Hide is on. Keep `scrollbar-width:none` and WebKit hiding scoped to the actual explorer scroller.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/floatingTocLane.test.ts test/unit/floatingTocSource.test.ts test/unit/settingsDefaults.test.ts
pnpm run stylelint
pnpm run check
git diff --check
```

**HITL:** every matrix variant at min and wide frame, both sides, plain/pill, scrolled long names. Confirm no row information hides below the rail. Commit: `fix(layout): preserve one hidden-scrollbar gutter`.
