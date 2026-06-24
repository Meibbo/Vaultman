---
title: Bases import choose mode UI flow
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-05-bases-import-choose-mode/index|bases-import-choose-mode]]"
created: 2026-05-05T02:31:25
updated: 2026-05-05T02:33:30
tags:
  - agent/spec
  - initiative/hardening
  - bases/import
---

# UI Flow

## Active Filters Toolbar

The active filters popup toolbar becomes four squircles:

1. Templates, accent style. This is the future `serviceMarks` entry point.
2. Import/export. Pressing it opens a small flyout from the large icon.
3. Add logic group. This creates a parent filter group.
4. Clear filters. This clears active filter tree and search filters.

The import/export flyout has two icon+label buttons:

- Import: enters Bases import choose mode.
- Export: visible but disabled or report-only until export is designed.

The flyout must overlay from the button and must not push or resize the frame.

## Bases Import Choose Mode

Entering import mode changes the filters page state:

- `NavbarTabs` remains visible.
- `files` remains active.
- Other tabs remain visible but faint and disabled.
- `NavbarExplorer` remains visible for search/sort/view controls.
- The bottom filters FAB changes to `lucide-x` and exits choose mode.
- The main body shows only the files explorer configured for import sources.

This keeps the user oriented in the existing filter page instead of opening a
modal flow.

## Source Discovery

The chooser includes compatible import targets:

- `.base` files.
- Specific views inside `.base` files as child nodes.
- Markdown files containing fenced Bases blocks:

````markdown
```bases
views:
  - type: table
    name: Example
```
````

Markdown body discovery should reuse the existing content/FnR-style retrieval
path where practical, because scanning thousands of notes can take a moment.
While indexing or searching body content, the files body should show a compact
loading landing.

Incompatible files or blocks are filtered out of the chooser rather than shown
with warning rows. The report still records why a candidate was rejected or why
individual expressions could not be applied.

## Selection Behavior

- Selecting a compatible view applies its filters immediately and exits choose
  mode.
- Selecting a `.base` source with multiple views expands or reveals child view
  nodes.
- Selecting a source with a single compatible target may apply directly.
- There is no separate Apply Filters button.

For a selected view, the imported root is:

- global `filters` AND view `filters`, when both exist.
- only global `filters`, when no view filter exists.
- only view `filters`, when no global filter exists.

## Empty And Loading Landing

The slice adds a reusable empty/loading landing for explorer bodies.

States:

- loading/indexing.
- no files or nodes available.
- search produced no matches.
- active filters produced no matches.
- import chooser found no compatible Bases targets.

This should live near shared view/render infrastructure where practical, so
individual explorers do not duplicate empty-state markup.
