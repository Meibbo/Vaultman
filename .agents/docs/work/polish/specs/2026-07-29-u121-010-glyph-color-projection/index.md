---
title: Spec — U121-010 Files glyph color projection
type: spec
status: approved
parent: "[[docs/work/polish/index|polish]]"
created: 2026-07-29T00:00:00
updated: 2026-07-29T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/spec
  - initiative/polish
  - release/1.2.1
  - explorer/files
  - glyph-color
---

# U121-010 — Files glyph color projection

## Purpose

Repair and complete glyph-color projection in the stable 1.2 line:

1. preserve a folder's configured glyph color when its `cell_icon` changes
   between closed and open;
2. make the current `Linear · indent` projection match the reference rainbow
   distribution;
3. project file glyph color into `Geometry · table/cards` when and only when
   `explorerGlyphScope` is `files` or `both`.

Canonical tracker: GitHub issue
[`U121-010`](https://github.com/Meibbo/Vaultman/issues/46). The issue body
predates the approved Table/Cards requirement and must be corrected during
triage before implementation.

## Stream and Goal

- **Stream:** the stable 1.2.0 Files explorer. Glyph color currently reaches
  `Linear · indent`, with incomplete refresh and distribution behavior.
- **Goal:** the 1.2.1 patch preserves the Stream behavior and adds the approved
  file projection to `Geometry · table/cards`.
- This work uses the canonical terms `glyph`, `cell_icon`, `cell_name`,
  `Stream`, and `Goal`.

## Approved scope contract

| `explorerGlyphScope` | Tree folders | Tree files | Table files | Cards files |
|---|---:|---:|---:|---:|
| `folders` | yes | no | no | no |
| `files` | no | yes | yes | yes |
| `both` | yes | yes | yes | yes |

Table and Cards contain file projections, not folder rows. Therefore
`scope=folders` intentionally produces no glyph-color change in those modes.

When the scope applies:

- glyph color is projected to `cell_icon`;
- glyph color replaces the **visible color** of `cell_name`;
- existing active/internal-link classes, attributes, selection state, and
  navigation behavior remain unchanged;
- no semantic variable, setting, or contract named “active color” is mutated,
  replaced, or introduced.

When the scope does not apply, each renderer preserves its existing behavior.

## Chosen architecture

Implement one pure, Explorer-specific glyph projection in
`src/logic/logicGlyphColor.ts`, consumed by Tree, Table, Cards, and the
incremental folder-icon refresh.

The projection receives only render facts:

- glyph choice and custom color;
- scope;
- node kind;
- zero-based position in the displayed projection;
- inherited top-level branch color, when one exists;
- optional explicit icon color from Iconic or another existing resolver.

It returns decoration facts rather than manipulating DOM:

- applicable glyph color or no color;
- effective `cell_icon` color;
- effective `cell_name` color.

Renderers remain responsible only for applying those facts. This keeps one
scope, precedence, and rainbow contract across all supported Files modes
without pulling the future generic decoration architecture from U121-013 into
the stable patch.

## Color precedence

### `cell_icon`

1. An explicit per-node color resolved by Iconic wins.
2. Otherwise, applicable glyph color is the fallback.
3. Otherwise, preserve the renderer's current default.

Opening or closing a folder may replace its icon glyph, but must recompute the
same precedence. `_refreshFolderIcon()` must not erase the global glyph
fallback when Iconic supplies an icon without an explicit color.

### `cell_name`

1. Applicable glyph color wins the visible inline name color.
2. Otherwise, preserve the renderer's current color behavior.

This precedence is intentionally different from `cell_icon`: an explicit
Iconic color may win the icon while the configured glyph color still controls
the visible name color. Link/active semantics are unchanged.

## Rainbow distribution

The Explorer-specific rainbow projection follows the reference snippet
`fancyfile-explorer-rainbow.css`:

- use ten slots, `--color-rainbow-1` through `--color-rainbow-10`;
- the first displayed root sibling uses slot 10;
- the second through tenth siblings use slots 1 through 9;
- the eleventh starts again at slot 10;
- for a zero-based displayed position `i`, the slot is
  `((i + 9) % 10) + 1`;
- each CSS variable retains a built-in light/dark-compatible fallback so the
  projection works with or without the reference snippet enabled.

### Tree

- Position is derived from the rendered root sibling projection after current
  sort, filter, and rebase behavior.
- Sibling position includes both folders and files, matching structural CSS
  `nth-child` behavior.
- Descendant folders inherit their top-level branch color.
- With `scope=files|both`, files inside a top-level branch inherit that branch
  color.
- Root-level files receive the color of their own displayed sibling position.
- In a flat/non-nested projection, every file is root-level and cycles by
  displayed position.

### Table and Cards

- Both are flat file projections.
- Rainbow uses the global displayed row/card index after sorting and filtering.
- It must not use the DOM child index or the index inside the current virtual
  window.
- Scrolling must therefore preserve a file's color while virtual rows/cards are
  recycled.

Reordering or filtering may change positional rainbow colors. That visible
change is intentional parity with the reference snippet, rather than a
path-stable color mapping.

Non-rainbow choices (`faint`, `accent`, and `custom`) remain constant across
positions. `default` adds no glyph color.

## Renderer integration

### Tree — `src/components/layout/viewTree.ts`

- Continue consuming `TreeNode.iconColor` and `TreeNode.labelColor`.
- Include `labelColor` in the recycled-row signature so runtime color changes
  repaint the name.
- Do not alter row activation, wikilink classes, keyboard behavior, or layout.

### Files panel — `src/components/containers/explorerFiles.ts`

- Replace the global DFS rainbow bucket with the approved projection semantics.
- Supply inherited branch color during full Tree decoration.
- Reuse the same projection during `_refreshFolderIcon()` so expand/collapse is
  an O(1) icon refresh and does not require a full rerender.

### Table — `src/components/layout/viewGrid.ts`

- Pass the projection's global displayed index into each rendered virtual row.
- Apply effective icon color to `cell_icon`.
- Apply applicable glyph color to `cell_name` without removing existing
  internal-link or active classes.
- Include glyph-relevant facts in row invalidation/signature behavior.

### Cards — `src/components/layout/viewFilesGrid.ts`

- Pass the projection's global displayed index into each rendered virtual card.
- Apply effective icon color and applicable visible name color with the same
  precedence as Table.
- Include glyph color in the card signature so recycled cards repaint.

## Verification and completion

Existing-setting boundaries, error/fallback behavior, automated tests, gates,
runtime matrix, performance constraints, explicit non-goals, adversarial
review, and acceptance criteria are normative in
[[docs/work/polish/specs/2026-07-29-u121-010-glyph-color-projection/01-verification-and-boundaries|verification and boundaries]].
