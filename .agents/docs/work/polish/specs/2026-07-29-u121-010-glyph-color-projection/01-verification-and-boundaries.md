---
title: U121-010 — Verification and boundaries
type: spec
status: approved
parent: "[[docs/work/polish/specs/2026-07-29-u121-010-glyph-color-projection/index|U121-010 glyph color projection]]"
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

# Verification and boundaries

## Existing settings and adjacent behavior

- Do not add, rename, migrate, or remove settings.
- Do not change persistence shape.
- Do not redesign `explorerRainbowFolders`.
- When explicit glyph color applies, its current visible precedence is
  preserved; when glyph choice is `default`, legacy folder-rainbow behavior
  remains available.
- Sharing a pure ten-slot helper with legacy code is allowed only if tests prove
  no unrelated behavior change.
- Floating Index already applies its glyph-color style in joined and separate
  action layouts at stable HEAD. U121-010 adds or retains a regression guard
  but makes no Floating Index product change without a current runtime repro.

## Error and fallback behavior

- Invalid persisted scope continues to normalize to the existing safe default.
- Invalid or empty custom color follows the existing custom-color fallback.
- Empty projections perform no work.
- Rainbow calculations must remain defined for zero items and positions beyond
  ten.
- Missing Iconic data is normal and falls through to glyph/default color.
- A third-party icon resolver failure must not change selection, navigation, or
  the ability to render the row.

## Verification

### Pure tests

- scope matrix for folder/file across `folders|files|both`;
- `default`, `faint`, `accent`, `custom`, and invalid persisted values;
- exact rainbow sequence: first=10, second=1, tenth=9, eleventh=10;
- nested branch inheritance;
- interleaved root files/folders;
- flat projection, filtering, sorting, and rebase inputs;
- explicit icon color wins `cell_icon`, glyph wins applicable `cell_name`.

### Renderer regressions

- Tree expand/collapse changes the open/closed glyph without losing glyph color;
- explicit Iconic color remains authoritative for the icon;
- Tree name color survives row recycling and signature comparison;
- Table and Cards project files only for `files|both`;
- Table active/internal-link classes remain present while visible name color is
  replaced;
- Cards signature includes glyph color;
- virtual scrolling uses the global projected index;
- Floating Index retains its already-working glyph style.

### Gates

- focused red/green tests before implementation;
- affected unit/component suites;
- `pnpm run check`;
- `pnpm run lint`;
- `pnpm run format:check`;
- `pnpm run stylelint`;
- `pnpm run build:plugin`;
- full unit suite;
- scorecard regression guard;
- `git diff --check`.

The aggregate `pnpm run verify` may be run, but previous supervisor timeouts
mean its constituent exit codes must be recorded separately rather than
claiming an unobserved aggregate pass.

### Human-in-the-loop runtime matrix

- Tree, Table, and Cards;
- `folders`, `files`, and `both`;
- default, custom, and rainbow;
- open/close folders;
- sort, filter, rebase, and flat/nested changes;
- Iconic icon with and without explicit color;
- reference snippet enabled and disabled;
- light and dark themes.

## Performance constraints

- Tree full decoration remains O(n).
- Folder expand/collapse color refresh remains O(1).
- Table and Cards calculate color O(1) per rendered virtual item.
- No DOM queries or viewport-relative color scans.
- No change to row/card measurements, overscan, or virtualization ownership.

## Explicit non-goals

- Generic `cell_highlight`/ViewLayers architecture from U121-013.
- Per-node or per-cell user overrides.
- New settings or a legacy rainbow migration.
- Folder rows in Table or Cards.
- A path-stable rainbow hashing mode.
- Changes to active-link semantics or an “active color” contract.
- Floating Index redesign.
- Unrelated renderer refactors.

## Adversarial pass

The design was checked against third-party Iconic colors, missing resolver
data, empty and larger-than-ten projections, virtual windows, sorting,
filtering, rebase, nested-off mode, the future U121-013 architecture, and the
legacy rainbow setting.

The deliberate visible trade-off is that positional rainbow colors move when
the displayed order changes. A path-stable scheme would preserve colors across
sorting, but would lose parity with the reference snippet and is therefore out
of scope. No other quality loss versus the current behavior is intended.

## Acceptance criteria

U121-010 is ready to close when:

1. Tree folder icons retain glyph color across open/close refresh.
2. Tree rainbow distribution matches the ten-slot reference behavior.
3. File glyph color reaches `cell_icon` and visible `cell_name` in Tree,
   Table, and Cards only for `scope=files|both`.
4. Iconic/glyph precedence matches this spec.
5. Virtualization, active-link behavior, and existing settings remain intact.
6. Automated gates pass and the developer completes the runtime matrix.
