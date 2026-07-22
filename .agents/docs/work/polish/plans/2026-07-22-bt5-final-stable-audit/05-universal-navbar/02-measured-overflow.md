---
title: BT5 final stable audit plan — measured Navbar overflow
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Universal Navbar]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, navbar, responsive]
---

# Measured Condensed / Scroll / Wrap overflow

## Task 14 — BT5-045 replace hardcoded Files condensation

**Known overlap:** `src/logic/logicResponsiveLayout.ts` is dirty before this task: `'scroll'` and `toolbarUsesHorizontalScroll` were commented out by another actor. Preserve the diff until the red test proves the replacement, then intentionally supersede it and record that attribution.

**Create:**

- `src/logic/logicNavbarOverflow.ts`
- `src/components/actions/navbarOverflowMeasure.ts`
- `test/unit/navbarOverflow.test.ts`

**Modify:**

- `src/components/layout/navbarPanelWidget.svelte`
- `src/logic/logicResponsiveLayout.ts` (remove old hardcoded algorithm after migration)
- `src/VaultmanSettings.ts`
- `src/types/typeSettings.ts`
- `styles.css`
- `test/unit/toolbarOverflowStrategy.test.ts`
- `test/unit/navbarFiltersSource.test.ts`

### 14.1 Red — pure measured prefix algorithm

Use actual measured outer widths and gaps:

```ts
export interface NavbarOverflowInput {
	availableWidth: number;
	actionWidths: readonly number[];
	gap: number;
	overflowTriggerWidth: number;
	manualCondense: boolean;
}

export interface NavbarOverflowProjection {
	visibleCount: number;
	hiddenIndexes: number[];
	needsOverflowTrigger: boolean;
}
```

Required behavior:

- if all actions fit, all visible and no trigger;
- when overflow begins, reserve trigger width before choosing the longest fitting left prefix;
- hide from the right: first the two rightmost when that is what capacity requires, then the next left as width shrinks;
- hidden menu retains original action order and disabled/pressed states;
- a label-on action's measured width naturally reduces capacity (min-frame reference: four icons when label consumes the expected width; label off: five), without provider/name constants;
- zero/one action, fractional pixels, rapidly changing widths and an oversized first action are deterministic;
- manual Condense uses the same measured algorithm, not `active-reveal`/`expand-collapse` IDs.

### 14.2 Red — measurement lifecycle

Test `ResizeObserver` integration with a fake observer:

- observes host, overflow trigger and every current action node;
- includes margins through a documented outer-width helper;
- schedules one animation-frame recomputation for a resize burst;
- invalidates on provider/action/label/font readiness changes;
- disconnects on teardown and never writes stale provider measurements.

Use stable `data-navbar-action-id` keys so reorder does not associate old widths with new actions.

### 14.3 Green — three genuinely distinct strategies

Restore `ToolbarOverflowStrategy = 'condensed' | 'scroll' | 'wrap'` and migrate naming to Navbar where possible.

- **Condensed:** one fixed lane; measured visible prefix; hidden suffix in one tools menu; menu trigger is not itself recursively hidden.
- **Scroll:** one fixed-height lane; inner ordered row is max-content; horizontal overflow is user-scrollable with wheel/trackpad/touch; browser scrollbar hidden in Firefox/WebKit; center when it fits and align safely at start when it does not. Never wrap or condense.
- **Wrap:** natural `flex-wrap: wrap`; no overflow menu and no horizontal scroller. Let the workspace/Navbar height participate in layout rather than covering the explorer.

CSS must use semantic strategy classes and `scrollbar-width:none` plus `::-webkit-scrollbar { display:none; }` only on Scroll. Keyboard focus must scroll the focused action into view. Respect reduced motion.

### 14.4 Green gates

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/navbarOverflow.test.ts test/unit/toolbarOverflowStrategy.test.ts test/unit/navbarFiltersSource.test.ts
pnpm run stylelint
pnpm run check
pnpm run format:check
git diff --check
```

**HITL:** every provider; label on/off; min width through wide in 1px drag; manual/auto Condense; mouse wheel/trackpad/touch/keyboard Scroll; multi-row Wrap; no visible scrollbar. Commit: `fix(navbar): implement measured overflow strategies`.
