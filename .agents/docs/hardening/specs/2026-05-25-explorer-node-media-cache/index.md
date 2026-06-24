---
title: Explorer Node Media Index And Thumbnail Cache
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/media
  - explorer/cache
  - explorer/node-elements
  - explorer/performance
created_by: codex
updated_by: codex
---

# Explorer Node Media Index And Thumbnail Cache

Spec for a complete media-index and thumbnail-cache subsystem for Explorer node
media. This is intentionally separate from the V.D Tree Render Projection spec
already handed to the planning agent.

The media slot is a NodeElement. Some nodes are image files themselves. Other
nodes derive their image from a configurable node-note property such as
`cover: imagen.png`, from the first image embedded in the document, or from a
remote URL/page. All of those sources must resolve to low-resolution cached
thumbnails so Explorer views can render media without blocking scroll.

## Shards

1. [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/01-source-model|Source model and precedence]]
2. [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/02-index-and-cache-architecture|Index and cache architecture]]
3. [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/03-thumbnail-generation|Thumbnail generation]]
4. [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/04-settings-security-and-privacy|Settings, security, and privacy]]
5. [[docs/work/hardening/specs/2026-05-25-explorer-node-media-cache/05-verification-and-rollout|Verification and rollout]]

## Existing Base

Vaultman already has the beginning of this subsystem:

- `src/services/serviceExplorerMediaCache.ts` defines `ExplorerMediaRecord`,
  `ExplorerMediaBlob`, a store interface, an in-memory store, target
  subscriptions, and an LRU blob cache.
- `src/services/serviceExplorerProjection.ts` already carries
  `mediaDescriptor` per row and `mediaById` per projection.
- `src/services/serviceExplorerRowInput.ts` already allows
  `mediaDescriptor` on row inputs.
- `src/components/views/nodeElementMask.ts` already includes `media`, currently
  off by default.
- `ViewNodeCards.svelte` already has a media slot guarded by
  `nodeElementMask.media && input.mediaDescriptor`.

This spec extends that base into a full indexed, persistent, configurable
thumbnail pipeline.

## Goal

Explorer media must be safe to enable for large vaults:

- no full-size image decoding in scroll/render paths;
- no synchronous remote fetches during render;
- no layout shifts from thumbnail loading;
- no eager thumbnail generation for the entire tree during a scroll;
- physical image-file nodes, cover properties, document images, and remote
  sources resolve through one descriptor/index/cache contract.

## Non-Goals

- Do not implement this inside `viewTree.svelte`.
- Do not couple media records to badge registry or badge rendering.
- Do not make remote image fetching mandatory.
- Do not require all thumbnails to exist before text rows paint.
- Do not replace the V.D Tree Render Projection contract; it should only carry
  media descriptors.

## Companion Specs

- [[docs/work/hardening/specs/2026-05-25-vd-tree-render-projection/index|V.D Tree Render Projection]]
- [[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/index|Explorer Icon Pack Cache]]
- [[docs/work/hardening/specs/2026-05-25-explorer-node-video-provider-media-cache/index|Explorer Node Video Provider Media And Cache Settings]]
