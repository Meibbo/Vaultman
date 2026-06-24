---
title: "v1.0 Polish scope from beta 15-18 backlog"
type: backlog-audit-shard
status: active
initiative: hardening
parent: "[[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/index|v1-scope-audit]]"
created: 2026-05-07T06:06:10
updated: 2026-05-07T06:14:59
created_by: codex
updated_by: codex
tags:
  - agent/backlog
  - hardening/v1
---

# v1.0 Polish Scope

These items are not "later than v1". They are outside hardening and inside the
successor `v1.0 Polish` project according to the 2026-04-28 scope triage.

## Bases Feature Parity

- Excel/Bases-like editable file matrix with cell editing, markdown rendering,
  property columns, and table density.
- Range filters for date/time properties.
- All-files-in-folder filter behavior.
- Logical all/any/none filter groups.
- Manual filter syntax and row group auto/manual toggles.

## Theming

- Minimal variant without blur overlays or round decorative controls.
- Frozen default fancy variant.

## UX Features

- Dragging/moving pages or nav content elsewhere in the Obsidian workspace.
- User-configurable navbar/tab placement and workspace-tab behavior.
- Full responsive redesign of page tabs, page nav, and bottom/side bars beyond
  hardening breakage fixes.
- Auto-scroll to current selection, especially outside Files where semantics are
  unclear.
- Column visibility controls for every row decoration: sub-element counter,
  mtime counter, property type icon, badges, service icon, label, and chevron.
- Select-all/deselect-all behavior variants per explorer and per mode.
- Group drawers by property type, file type, or tag depth.
- Default templates/marks/settings bundles for explorer presets.
- Popup/island max-width, menu close button using the same FAB with a changed
  icon, selected color polish for `btnSelection`, and glass/blur refinements.
- Native outline replacement, inline rename, empty states, viewDiff snippet/full
  split, queue mobile text, tabContent responsiveness, Files explorer features,
  and navbarPages icon-only fallback.

## Programmable Interface

- `serviceAPI` foundation exposing hardening contracts as a public surface.
- Bases I/O text parse/emit workflow.
- Agent Guardrail Skill using Vaultman queue/filter/ops as a supervised bulk-op
  harness.

## Post-rc.1 Boundary

These remain valid, but outside v1.0 Polish per the old triage:

- `serviceMarks.ts` as the full Templates module.
- `tabLinter`.
- `tabMarks` panel and default config marks.
- Manual sort via marks.
- Templates default config in settings.
- Real snippets/templates consumers after Templater setup.
