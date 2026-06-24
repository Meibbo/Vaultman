---
title: Quick commands and double-click clear
type: design-spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/index|multifacet wave 2 spec]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/spec
  - explorer/commands
  - ui/keyboard
created_by: claude
updated_by: claude
---

# Quick Commands And Double-Click Clear

## Double-Click Gestures

- Double-click on a navbar **active-filter pill** clears all filters
  via `serviceFilter.clearAll()`. Single click keeps existing toggle
  semantics (filter on/off).
- Double-click on the navbar **queue badge** clears the queue via
  `OperationQueueService.clearAll()`. Single click keeps existing
  queue-popup behavior.
- Both gestures honor `dblclick` event with a 250 ms threshold to
  avoid swallowing single clicks. Detection via the existing
  `useDoubleClick` helper, or an inline timer if no helper exists.

## Obsidian Commands

Register the following via `this.addCommand` in plugin `onload`:

| Id | Action |
|----|--------|
| `vaultman:open-filters` | Open the filters popup for the active explorer. |
| `vaultman:open-queue` | Open the queue popup. |
| `vaultman:process-queue` | Trigger `OperationQueueService.processAll()`. |
| `vaultman:open-view-menu` | Open the view menu of the active tab. |
| `vaultman:open-sort-menu` | Open the sort menu of the active tab. |
| `vaultman:open` | Reveal Vaultman panel and focus the active explorer's first focusable node so arrow keys navigate immediately. |
| `vaultman:open-find-replace-active-explorer` | Reveal Vaultman, set FnR mode to `replace`, and focus the searchbox. |

Each command checks `checkCallback` so it greys out when no panel is
open / no active explorer is available.

`vaultman:open` focus contract:

1. `app.workspace.revealLeaf(panelLeaf)`.
2. `panelExplorer.svelte` exposes `focusFirstNode()`. The command
   awaits that call and ensures `aria-activedescendant` lands on the
   first virtual row.
3. The selector dropdown is **not** focused; node navigation is.

## Acceptance

- Single click on a pill toggles its filter; double click within
  250 ms clears all filters.
- Single click on the queue badge opens the popup; double click
  clears the queue.
- `vaultman:open` puts keyboard focus on the first explorer node.
  Pressing `ArrowDown` immediately moves selection.
- Each registered command appears in Obsidian's command palette and
  is greyed out when its prerequisite is missing.

## Anti-Goals

- No commands that mutate the vault directly without going through
  the queue.
- No clearing of filters or queue from the command palette in this
  iteration (only via gestures).
- No global keyboard shortcut bindings in this iteration; users
  bind keys themselves through Obsidian's hotkey settings.
