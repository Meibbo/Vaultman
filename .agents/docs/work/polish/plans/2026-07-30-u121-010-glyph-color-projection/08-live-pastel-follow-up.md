---
title: Plan — U121-010 live repaint and pastel rainbow follow-up
type: plan
status: active
parent: "[[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/index|U121-010 plan]]"
dateUpdated: 2026-07-30T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - release/1.2.1
  - explorer/files
  - glyph-color
---

# U121-010 Live Repaint and Pastel Rainbow Follow-up Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaint mounted Files views immediately after glyph settings change,
offer the same strong and pastel ten-tone palettes in Files and Floating Index,
and repair `Glyph color mode = always` without changing Niagara semantics.

**Architecture:** Reuse the plugin's existing `onSettingsChange()` broadcast.
Each Files panel retains a three-field glyph-settings signature and schedules
one coalesced render only when that signature changes. Keep the two panel
settings persisted independently, but extend their shared `GlyphColorChoice`
contract with `rainbow-pastel`. Both positional choices use the exact ten HSL
tones from the reference snippet: dark/strong for `rainbow`, light/pastel for
`rainbow-pastel`. Files retains its branch/global-index projection rules;
Floating Index retains its own group index. Separate the Floating Index
`transform` and `color` declarations with a semicolon so `always` can coexist
with Niagara rather than invalidating both declarations.

**Tech Stack:** TypeScript 5.8, Vitest 4, Obsidian `Component` lifecycle,
existing Files renderer projections, pnpm 11.

---

## Task 8: Live settings repaint

**Files:**

- Modify: `src/components/containers/explorerFiles.ts`
- Test: `test/unit/explorerGlyphProjection.test.ts`

- [x] **Step 1: Write the failing behavior test**

Construct a `FilesExplorerPanel` harness with a plugin-level
`onSettingsChange()` listener registry. Load the panel, change
`explorerGlyphColor`, invoke the registered listener, flush one microtask, and
assert that the panel render entry point ran once. Invoke the listener again
without changing the glyph tuple and assert that no second render occurred.

- [x] **Step 2: Verify RED**

Run:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerGlyphProjection.test.ts
```

Expected: FAIL because `FilesExplorerPanel.onload()` does not subscribe to
`plugin.onSettingsChange()`.

- [x] **Step 3: Implement the minimal subscription**

Add a signature helper over:

```ts
[
  this.plugin.settings.explorerGlyphColor,
  this.plugin.settings.explorerGlyphCustomColor,
  this.plugin.settings.explorerGlyphScope,
].join('\u001f')
```

Capture the initial signature during `onload()`, register the plugin listener
with the panel lifecycle, and call the existing microtask render coalescer only
when the signature changes.

- [x] **Step 4: Verify GREEN**

Run the same focused test and expect all tests to pass.

## Task 9: Shared ten-tone palettes and Floating `always`

**Files:**

- Modify: `src/logic/logicGlyphColor.ts`
- Modify: `src/components/layout/floatingToc.svelte`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Test: `test/unit/glyphColor.test.ts`
- Test: `test/unit/explorerGlyphProjection.test.ts`
- Test: `test/unit/floatingTocSource.test.ts`

- [x] **Step 1: Write failing pure/source tests**

Assert:

```ts
expect(normalizeGlyphColorChoice('rainbow-pastel')).toEqual({
  choice: 'rainbow-pastel',
});
expect(rainbowGlyphColor(0, 10)).toBe('hsl(18, 60%, 40%)');
expect(rainbowGlyphColor(9, 10)).toBe('hsl(342, 60%, 40%)');
expect(pastelRainbowGlyphColor(0, 10)).toBe('hsl(0, 100%, 84%)');
expect(pastelRainbowGlyphColor(9, 10)).toBe('hsl(324, 100%, 83%)');
expect(explorerPastelRainbowGlyphColor(0)).toBe('hsl(324, 100%, 83%)');
```

Add a Tree projection case proving a descendant file inherits its root
pastel branch color. Add Floating source assertions proving it consumes the
pastel resolver and that each Niagara transform declaration terminates before
the glyph-color declaration.

- [x] **Step 2: Verify RED**

Run:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/glyphColor.test.ts test/unit/explorerGlyphProjection.test.ts test/unit/floatingTocSource.test.ts
```

Observed: 7 failures. The shared selector rejected the pastel choice; the
strong palette still used the old fallback; Files had only eight pastel tones;
Floating lacked a pastel branch; and Niagara's transform lacked the declaration
separator.

- [x] **Step 3: Implement the shared palette contract**

Add `'rainbow-pastel'` to `GlyphColorChoice` and
`GLYPH_COLOR_CHOICES`, which both settings selectors already consume. Define
the exact ten strong and ten pastel HSL values from
`plugin-dev/.obsidian/snippets/fancyfile-explorer-rainbow.css`; no colors need
to be invented. Export Floating and Explorer resolvers for both palettes.
Explorer keeps position mapping `0→10, 1→1, …, 9→9, 10→10`.

Update Tree branch-color selection so both positional choices inherit their
resolved root branch color. Add English `Pastel rainbow` and Spanish
`Arcoíris pastel` labels. In Floating Index, route the pastel choice to the
pastel resolver and terminate both horizontal and vertical Niagara transform
strings with `;`. Do not alter the `static`/`always` gate.

- [x] **Step 4: Verify GREEN**

The three-file focused set passed: 47/47 tests. The complete U121-010 surface
set passed: 121/121 tests.

- [x] **Step 5: Commit product**

```powershell
git commit -m "fix(explorer): repair live glyph palette projection"
```

Product commit: `5467a463`.

## Task 10: Verify and synchronize smoke build

- [x] Run the complete U121-010 focused regression set: 121/121.
- [x] Run `pnpm run check`, `pnpm run lint`, `pnpm run format:check`,
  `pnpm run stylelint`, `pnpm run build:plugin`, `pnpm run test:unit`,
  `pnpm run test:scorecard`, and `git diff --check`: all passed; full unit
  suite 1018/1018 across 155 files; scorecard 17/17.
- [x] Run `pnpm run build` from
  `C:/tmp/vaultman-release-beta2-final2`; verify SHA-256 equality for
  `main.js`, `manifest.json`, and `styles.css` against
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`: all three
  matched.
- [x] Leave GitHub #46 open as `ready-for-human` and post a
  disclaimer-prefixed follow-up with the new commit and verification evidence:
  comment `5128166218`.
