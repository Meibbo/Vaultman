---
title: SDF-011 Bases-parity table view layout
type: issue
issue_id: SDF-011
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T07:53:25
labels:
  - needs-triage
  - needs-research
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/table
  - obsidian/bases
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-011 Bases-Parity Table View Layout

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Repair Vaultman's table view so it behaves and reads as a real table with separated columns, stable
headers, cells, and widths comparable to Obsidian Core Bases under equivalent row limits.

## Research Gate

- [ ] Capture a before screenshot comparing Vaultman table view and Core Bases table view under the
      same row-count conditions.
- [ ] Use `obsidian-cli` against `plugin-dev` to inspect Core Bases DOM/classes for headers, rows,
      cells, column separators, resize handles, widths, overflow, sticky header behavior, and
      virtualization.
- [ ] Use `obsidian-web-lab` if DOM inspection is insufficient to understand Bases table layout,
      virtualization, or column-resize behavior.
- [ ] Document which Bases classes can be reused directly and which behaviors must be mirrored.

## Acceptance Criteria

- [ ] Table view renders visually separated columns with real headers.
- [ ] Headers, rows, cells, separators, resize handles, and state classes reuse Core Bases CSS where viable.
- [ ] File name, extension/type, folder, count, and date columns align as columns, not as text concatenated into list rows.
- [ ] Columns support resizing or at minimum stable responsive widths that do not break scroll.
- [ ] Table virtualization and native scroll remain functional on the `plugin-dev` vault.
- [ ] Screenshot evidence demonstrates reasonable visual parity with Core Bases under equivalent conditions.

## Blocked By

None - can start immediately.

## Verification

- Run documented screenshot and DOM research first.
- Run focused table projection/layout tests where available.
- Build, sync, reload `plugin-dev`, and verify table scroll plus column layout with `obsidian-cli` screenshots or DOM measurements.
