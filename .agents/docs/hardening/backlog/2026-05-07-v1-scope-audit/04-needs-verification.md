---
title: "Needs verification items from beta 15-18 backlog"
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

# Needs Verification

Verification decides whether an item is already resolved, still hardening work,
or still v1.0 Polish work. It should not downgrade a user-facing v1.0 item to
"later" unless the 2026-04-28 triage already marks it `post-rc.1`, `cancelled`,
or the user makes a new scope decision.

## Explorer Behavior

- Search input filters nodes as expected and preserves matching ancestors in all
  relevant explorers.
- Search type/category toggle still matches the intended categories.
- Props and Tags visible virtual rows update after external metadata changes,
  not only after switching views.
- Iconic icon changes propagate live into explorer rows without plugin reload.
- Files explorer shows nested folders under the correct parent and handles
  filters without hiding necessary folder context.
- Files explorer support for non-note files needs a product-scope decision and
  then a live check.
- Last tree node is not covered by the navigator after current tree/grid layout
  changes.
- Parent nodes remain reachable when browsing a long child list, or the UX has a
  replacement affordance for quick collapse.

## Menus, Sorting, And Controls

- Sort arrows match A-Z and Z-A semantics.
- Alphabetical sort is the first default option where expected.
- Sort target category controls work for props/values, files/folders, and
  nested/simple tags.
- Menus close on outside click with the same semantics as standard islands.
- View menu `modeExplorer` row placement and column visibility controls either
  work or remain later-scope.
- `showSelectedOnly` and select/deselect-all behavior match Files-specific
  semantics.

## Queue And Diff

- Low-frequency prop operations report the same affected count in row, group,
  and island totals.
- Adding a second operation after processing one batch does not display stale
  combined counts.
- `viewDiff.svelte` no longer freezes on large queues in live Obsidian data.
- Toggling file diff / view diff does not close the queue island unexpectedly.
- Pressing a queue row focuses or filters diff context if that behavior remains
  in v1 scope.

## Frame And Layout

- Inactive page rendering cost in `frameVaultman.svelte` is measured rather than
  guessed.
- Navbar/popup overlays do not push explorer content or cause scroll-position
  jumps.
- Small and large frame sizes do not break search/nav controls.
- `navbarPages` icon-only fallback and page/tab placement still need a live
  responsive check.
