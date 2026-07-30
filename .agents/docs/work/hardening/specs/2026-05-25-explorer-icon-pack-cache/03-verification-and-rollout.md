---
title: Verification And Rollout
type: spec-shard
status: draft
parent: "[[index|Explorer Icon Pack Cache]]"
created: 2026-05-25T00:00:00
updated: 2026-05-25T00:00:00
tags:
  - agent/spec
  - explorer/icons
  - explorer/performance
---

# Verification And Rollout

## Rollout Slices

### Slice 1: Descriptor Model

Add icon descriptor types and compatibility helpers. Existing string icon names continue to work.

### Slice 2: Registry And Lucide Provider

Register current Obsidian/Lucide behavior behind the registry. No visual change.

### Slice 3: Iconic Provider

Adapt `IconicService` into a provider so tag/property overrides use the same lookup path.

### Slice 4: Bundled Adwaita Provider

Add a bundled Adwaita/GTK-style subset. Start with file/folder/image/status groups needed by Explorer. Do not add a massive full desktop theme unless the cache and package-size budget are approved.

### Slice 5: View Adoption

Adopt descriptors in row inputs/projections and view components one surface at a time.

## Tests

Unit tests:

- descriptor normalization;
- fallback lookup;
- pack priority;
- theme invalidation;
- Iconic override precedence;
- file extension to icon group mapping;
- cache hit/miss behavior.

Component tests:

- existing Lucide icons still render;
- Iconic property/tag icons still render;
- Adwaita filetype icons render when enabled;
- changing pack setting updates visible rows without stale icons;
- missing icon falls back gracefully.

Performance tests:

- repeated rows sharing one icon descriptor produce one cached asset;
- large tree render does not parse SVG per row;
- icon pack switch invalidates once per asset, not once per row.

## Acceptance

Accepted when:

- icon lookup is descriptor-based;
- badges can reference descriptors without owning lookup;
- existing icon behavior remains compatible;
- Adwaita/GTK-style grouped icons are available behind settings/presets;
- cache invalidation is theme/pack aware;
- large-tree scroll does not parse or fetch icons in row render.

