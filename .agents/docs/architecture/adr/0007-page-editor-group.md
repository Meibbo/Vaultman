---
title: 0007 — Page = editor-group
type: adr
status: active
parent: "[[docs/architecture/adr/README|adr]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/surfaces
---

# 0007 — Page = editor-group

**Decision status:** Accepted (grill-confirmed 2026-05-26). **Date:** 2026-05-26.

## Context

Today a "page" is effectively a tab with subtabs + bars. The dev wants multitask/split
and detachable tabs across leaves/sidebars; an earlier detach experiment failed because
it re-mounted only fragments (tab name + topbars), not the full composition.

## Decision (proposed)

`page` = an **editor-group** mounted on Obsidian's native `WorkspaceTabs`/`Split`
(real leaves) + a thin **`layout-config`** mapping `leaf/split → scene + bars`. Not a
single leaf (too atomic) and not the whole layout (too broad). A `tab` becomes a simple
surface hosting a `Scene`; the old "subtabs" become an in-scene tab-switcher primitive.

**Complement — sub-surface split:** within a single surface, a **Scene tile-tree**
(recursive h/v splits whose leaf tiles host a `Panel` or a `ForeignEmbed`) provides
splitting that does not consume a leaf — including maximize-one-while-the-others-stay-split,
which Obsidian's leaf model cannot do. Native split (this ADR) and the Scene tile-tree are
the two complementary tiling levels; see
[[docs/architecture/explorer-model/03-surfaces-and-interaction|03 surfaces + interaction]].

## Consequences

- Free split / multitask / layout-save; detach = move a leaf hosting a Scene.
- Rides native internals → isolate behind a PlatformAdapter (see ADR 0004).
- Refactor of current pages + tabs + a new `layout-config`.

## Alternatives considered

- Reimplement tiling ourselves: full control but a large, fragile build.
- `page = leaf` (too atomic) or `page = layout` (too broad): wrong granularity.
