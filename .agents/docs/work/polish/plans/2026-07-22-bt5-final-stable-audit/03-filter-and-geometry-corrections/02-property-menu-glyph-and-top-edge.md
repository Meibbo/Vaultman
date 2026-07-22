---
title: BT5 final stable audit plan — property menu, glyph and top edge
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Filter and geometry corrections]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, properties, layout]
---

# Property menus, glyph projection and frame top edge

## Task 7 — BT5-054 audit and complete Property menu types/conversions

**Modify:** `src/components/containers/explorerProps.ts`, `src/logic/propertyValueCoercion.ts`, `src/logic/propTypes.ts`, `src/i18n/en.ts`, `src/i18n/es.ts`, `test/unit/propertyValueCoercion.test.ts`; create `test/unit/propertyContextMenu.test.ts` if action registration lacks behavioral coverage.

### Red

- Property nodes expose every native type including `datetime` labeled `Date & Time`.
- The current type is checked/disabled based on `PropertyTypeService`, including mixed/unknown state.
- Value nodes expose `lowercase`, `UPPERCASE`, `Titlecase`, `Wikilink` with those exact final labels.
- Wikilink is absent/disabled if already a full wikilink; conversions preserve arrays/native booleans.
- Actions are registered for the correct node type and queue a `change_type`/`set`, never immediate vault mutation.

Test action descriptors and converter functions; do not rely only on source strings. Run red, then centralize option descriptors rather than adding more repeated action blocks.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/propertyContextMenu.test.ts test/unit/propertyValueCoercion.test.ts
pnpm run check
```

- [ ] Runtime menu check for text, number, checkbox, date, datetime, wikilink and mixed values.
- [ ] Commit: `fix(properties): complete type and conversion actions`.

## Task 8 — BT5-058 glyph color projection gaps

**Modify:** `src/components/layout/floatingToc.svelte`, `src/components/containers/explorerFiles.ts`, `src/components/layout/viewTree.ts` only if a style port is required, `styles.css`, `test/unit/glyphColor.test.ts`, `test/unit/floatingTocSource.test.ts`.

### Red

Add a pure style resolver or testable Svelte contract proving:

- action nodes participating in the Floating Index rail receive the same resolved glyph-color style as indexed nodes;
- Files Tree folder glyph color reaches both the glyph and `cell_name` label;
- file labels and non-folder labels keep their existing scope behavior;
- `static` mode still drops color during engaged Niagara deformation and `always` does not.

Do not add folder rendering to Table/Cards. Avoid CSS selectors based only on incidental DOM order; expose semantic classes/data.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/glyphColor.test.ts test/unit/floatingTocSource.test.ts
pnpm run stylelint
pnpm run check
```

**HITL:** custom/rainbow/theme color; left/right/top/bottom rail; action nodes joined and separate; Files folders with long names. Commit: `fix(glyphs): close projection gaps`.

## Task 9 — BT5-059 restore top-edge clipping geometry

**Inspect before edit:**

- current `src/VaultmanFrame.svelte`, `src/components/pages/pageFilters.svelte`, `src/components/pages/pageStatistics.svelte`, `styles.css`;
- same paths at beta.5 and at `b56b9a78` using `git show`/`git diff`;
- computed DOM boxes in the isolated Obsidian test vault with toolbar shown and hidden.

**Modify only after cause is demonstrated:** the smallest of the above paths plus a focused test such as `test/unit/frameTopGeometrySource.test.ts` and, if possible, a WDIO assertion.

### Diagnosis and red contract

Capture `getBoundingClientRect()` for frame, toolbar slot, explorer scroller and first row. The desired invariant is:

```text
toolbar shown: toolbar owns its intended lane; rows clip at the content viewport edge
toolbar hidden: no empty top strip; first row begins at the frame content edge
scrolling: rows disappear under the clipping edge, never remain visible in a spacer
```

Compare beta.5 and b56 declarations to identify the exact border/padding/margin/position regression. Do not fix by a negative magic offset without an invariant.

### Green

Express one top-lane variable/layout owner in the universal Navbar/frame seam. Remove the redundant bar/padding/margin. Re-run with Navbar shown/hidden, Dock on/off, Statistics and each Data provider; ensure queue/filter islands do not shift.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/frameTopGeometrySource.test.ts test/unit/mobileCssSource.test.ts test/unit/explorerDndSource.test.ts
pnpm run stylelint
pnpm run check
git diff --check
```

**HITL:** desktop/mobile, toolbar shown/hidden/peek, scrolling in long explorer. Apply after BT5-046 if its host changes the same slot. Commit: `fix(layout): restore frame top-edge geometry`.
