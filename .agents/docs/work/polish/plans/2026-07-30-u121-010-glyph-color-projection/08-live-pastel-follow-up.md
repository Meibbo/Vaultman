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

**Goal:** Repaint mounted Files views immediately after glyph settings change
and add an independent pastel rainbow option without changing the intense
rainbow or Floating Index.

**Architecture:** Reuse the plugin's existing `onSettingsChange()` broadcast.
Each Files panel retains a three-field glyph-settings signature and schedules
one coalesced render only when that signature changes. Extend the pure glyph
choice resolver with `rainbow-pastel`, backed by the existing eight reference
pastels and the same branch/global-index projection rules.

**Tech Stack:** TypeScript 5.8, Vitest 4, Obsidian `Component` lifecycle,
existing Files renderer projections, pnpm 11.

---

## Task 8: Live settings repaint

**Files:**

- Modify: `src/components/containers/explorerFiles.ts`
- Test: `test/unit/explorerGlyphProjection.test.ts`

- [ ] **Step 1: Write the failing behavior test**

Construct a `FilesExplorerPanel` harness with a plugin-level
`onSettingsChange()` listener registry. Load the panel, change
`explorerGlyphColor`, invoke the registered listener, flush one microtask, and
assert that the panel render entry point ran once. Invoke the listener again
without changing the glyph tuple and assert that no second render occurred.

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerGlyphProjection.test.ts
```

Expected: FAIL because `FilesExplorerPanel.onload()` does not subscribe to
`plugin.onSettingsChange()`.

- [ ] **Step 3: Implement the minimal subscription**

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

- [ ] **Step 4: Verify GREEN**

Run the same focused test and expect all tests to pass.

## Task 9: Pastel rainbow choice

**Files:**

- Modify: `src/logic/logicGlyphColor.ts`
- Modify: `src/i18n/en.ts`
- Modify: `src/i18n/es.ts`
- Test: `test/unit/glyphColor.test.ts`
- Test: `test/unit/explorerGlyphProjection.test.ts`

- [ ] **Step 1: Write failing pure tests**

Assert:

```ts
expect(normalizeGlyphColorChoice('rainbow-pastel')).toEqual({
  choice: 'rainbow-pastel',
});
expect(explorerPastelRainbowGlyphColor(0)).toContain(
  'var(--color-rainbow-8, #f7a4e6)',
);
expect(explorerPastelRainbowGlyphColor(1)).toContain(
  'var(--color-rainbow-1, #f7a4a4)',
);
```

Add a Tree projection case proving a descendant file inherits its root
pastel branch color.

- [ ] **Step 2: Verify RED**

Run:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/glyphColor.test.ts test/unit/explorerGlyphProjection.test.ts
```

Expected: FAIL because the choice and pure pastel Explorer function do not yet
exist.

- [ ] **Step 3: Implement the minimal pure contract**

Add `'rainbow-pastel'` to `GlyphColorChoice` and
`GLYPH_COLOR_CHOICES`. Export `explorerPastelRainbowGlyphColor(position)` using
the existing eight pastel fallbacks with position mapping
`0→8, 1→1, …, 7→7, 8→8`. Extend `resolveExplorerGlyphColor()` to select the
pastel resolver while preserving the existing intense `rainbow` branch.

Update Tree branch-color selection so both positional choices inherit their
resolved root branch color. Add English `Pastel rainbow` and Spanish
`Arcoíris pastel` labels.

- [ ] **Step 4: Verify GREEN**

Run the focused tests and expect all tests to pass.

- [ ] **Step 5: Commit product**

```powershell
git add -- src/logic/logicGlyphColor.ts src/components/containers/explorerFiles.ts src/i18n/en.ts src/i18n/es.ts test/unit/glyphColor.test.ts test/unit/explorerGlyphProjection.test.ts
git commit -m "fix(explorer): repaint glyph colors live"
```

## Task 10: Verify and synchronize smoke build

- [ ] Run the complete U121-010 focused regression set.
- [ ] Run `pnpm run check`, `pnpm run lint`, `pnpm run format:check`,
  `pnpm run stylelint`, `pnpm run build:plugin`, `pnpm run test:unit`,
  `pnpm run test:scorecard`, and `git diff --check`.
- [ ] Run `pnpm run build` from
  `C:/tmp/vaultman-release-beta2-final2`; verify SHA-256 equality for
  `main.js`, `manifest.json`, and `styles.css` against
  `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- [ ] Leave GitHub #46 open as `ready-for-human` and post a disclaimer-prefixed
  follow-up with the new commit and verification evidence.
