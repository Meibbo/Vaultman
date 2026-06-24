---
title: Bases import choose mode
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-05T02:31:25
updated: 2026-05-05T02:33:30
tags:
  - agent/spec
  - initiative/hardening
  - bases/import
---

# Bases Import Choose Mode

## Source Context

This spec continues:

- [[docs/work/hardening/specs/2026-05-04-explorer-view-service/index|Explorer view service]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/index|Bases interop research]]
- [[docs/work/hardening/research/2026-05-05-bases-interop-research/04-compatibility-matrix|Bases compatibility matrix]]

The first implementation slice imports compatible Obsidian Bases filters into
Vaultman active filters through a constrained chooser UI. It does not export or
mutate `.base` files yet.

## Decision Summary

- Active filters gains four squircles: templates, import/export, add logic
  group, and clear filters.
- Import/export opens a compact two-button flyout that overlays from the large
  button without pushing the frame.
- Import enters a files-only chooser mode with `NavbarTabs` still visible;
  non-file tabs are faint and disabled.
- Compatible `.base` files, `.base` views, and markdown fenced `bases` blocks
  are discoverable as file explorer targets.
- Selecting a compatible view applies filters immediately and exits chooser
  mode. There is no separate Apply Filters button.
- Vaultman internal `FilterGroup.logic` changes from `all | any | none` to
  `and | or | not`, with legacy normalization for saved data.
- The slice includes a reusable explorer empty/loading landing.
- Every import produces a Bases interop report, even when incompatible
  candidates are filtered out of the chooser.

## Shards

1. [[docs/work/hardening/specs/2026-05-05-bases-import-choose-mode/01-ui-flow|UI flow]]
2. [[docs/work/hardening/specs/2026-05-05-bases-import-choose-mode/02-filter-interop|Filter interop]]

## Non-Goals

- Do not write `.base` files.
- Do not implement export in this slice beyond a disabled or report-only entry.
- Do not evaluate unsupported Bases expressions.
- Do not register a custom Bases view.
- Do not build a full expression parser for every Bases function.
- Do not fold this into `serviceFnR`; Bases interop remains its own boundary.
