---
title: Explorer Icon Pack Cache
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/icons
  - explorer/cache
  - explorer/node-elements
created_by: codex
updated_by: codex
---

# Explorer Icon Pack Cache

Spec for a visual asset subsystem that supports icon packs and GTK-style icon groups such as Adwaita without mixing icon asset lookup into badge semantics or Tree render hot paths.

This is separate from:

- [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/index|Explorer Node Media Index And Thumbnail Cache]]
- [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection]]

## Shards

1. [[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/01-architecture|Architecture]]
2. [[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/02-contracts-settings-and-lookup|Contracts, settings, and lookup]]
3. [[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/03-verification-and-rollout|Verification and rollout]]

## Goal

Rows, badges, file types, properties, tags, and future Nautilus-inspired views need richer icon groups. Icons should resolve through a cacheable descriptor model, not through ad hoc strings scattered through view components.

## Existing Base

- `src/services/serviceIcons.ts` currently loads Iconic plugin property/tag icon data.
- Views currently pass icon names to Obsidian `setIcon` through actions such as `use:icon`.
- Badge rendering accepts icon strings but does not own asset lookup.

## Non-Goals

- Do not put Adwaita/GTK logic into `badgeRegistry.ts`.
- Do not fetch remote icon packs in this spec.
- Do not replace every existing `setIcon` call in the first slice.
- Do not block V.D Tree Render Projection on icon pack support.

