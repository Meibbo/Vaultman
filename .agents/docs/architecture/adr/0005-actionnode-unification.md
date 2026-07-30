---
title: 0005 — ActionNode unification
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/actions
---

# 0005 — ActionNode unification

**Decision status:** Accepted. **Date:** 2026-05-26.

## Context

Context menus, bars, fabs, dock items, and hover-actions duplicate logic. Reference plugins (Commander, Editing Toolbar) and VSCode/Terminal show "commands/menus as data". A cascading menu is structurally a tree of action items — the same shape as our explorer.

## Decision

Actions are a **NodeKind (`ActionNode`)** produced by an **`ActionProvider`** that aggregates ours + Obsidian commands + other plugins' menu contributions. Cmenus, bars, fabs, and dock items are ActionNodes in different placements rendered by the same node/view engine. Default cmenu renderer = native Obsidian `Menu`; explorer-as-menu is opt-in and only for OS-style/high-density cases (ARIA-gated by T.G). A **badge** is a placement that hosts either a status-cell or an action-node.

## Consequences

- One engine powers explorer + menus + bars; programmable actions/macros; the long-wanted menu-curator (render Obsidian's menus from the ActionProvider).
- Must not over-generalize: action vs file node have different semantics (NodeKind parameterizes); small menus must not pay virtualizer cost.

## Alternatives considered

- A separate menu system: duplicates rendering/nav.
- Custom menus everywhere: ~28% of ARIA menus are broken; loses native a11y/mobile.
