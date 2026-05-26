---
title: Architecture
type: spec-shard
status: draft
parent: "[[index|Explorer Icon Pack Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/icons
  - explorer/cache
---

# Architecture

## Boundary

Icons are visual assets. Badges are semantic status/action markers. A badge can
reference an icon descriptor, but it must not own icon pack lookup, SVG parsing,
or cache invalidation.

## Target Flow

```text
node/provider semantics
  -> IconDescriptor
  -> IconPackRegistry
  -> IconAssetCache
  -> render action/component
```

Views consume an icon descriptor or already-resolved icon handle. They should
not know whether the source is Lucide, Iconic, Adwaita, GTK symbolic, or a
future bundled set.

## Services

Recommended files:

- `src/services/serviceIconPackRegistry.ts`
  - registers available packs;
  - resolves descriptors to asset candidates;
  - owns pack priority and fallback.
- `src/services/serviceIconAssetCache.ts`
  - caches SVG strings, symbol ids, or rasterized icon variants;
  - invalidates on theme/pack/settings changes.
- `src/services/serviceIconDescriptors.ts`
  - defines shared descriptor types and helpers.

Existing `IconicService` can become one provider registered with the pack
registry instead of remaining a standalone lookup path.

## Pack Types

Initial pack types:

- `obsidian-lucide`: current Obsidian/Lucide icon names.
- `iconic`: property/tag icons from Iconic plugin data.
- `adwaita-symbolic`: bundled symbolic GTK-style icons.
- `adwaita-fullcolor`: optional bundled full-color icons.
- `filetype`: extension-based icons.

Remote packs are deferred.

## Cache Principle

Cache resolved assets by descriptor fingerprint:

- pack id;
- group;
- name;
- variant;
- size bucket;
- color mode;
- theme revision;
- pack version.

The cache must not be row-indexed. Many rows should share one resolved icon
asset.

## Render Principle

Rendering can use:

- Obsidian `setIcon` for native icons;
- inline sanitized SVG for bundled trusted packs;
- CSS mask for symbolic icons;
- image element only for raster fallback.

The first slice should preserve existing render actions and introduce the
descriptor/cache behind them incrementally.

